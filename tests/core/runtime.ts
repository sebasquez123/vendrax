import { NestFactory, Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { WsException } from '@nestjs/websockets';
import { AIMessage, type BaseMessage, createMiddleware, HumanMessage, ToolMessage } from 'langchain';
import type { Socket } from 'socket.io';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from '~/app.module';
import { AdminService } from '~/modules/admin/application/admin.service';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ChatEvents } from '~/modules/chat/domain/interfaces/gateway.interfaces';
import type { McpMessageType, MessageContextType } from '~/modules/chat/domain/validator/message_input';
import { ChatWsExceptionFilter } from '~/shared/filters/chat_ws_exception.filter';
import { MainGateway } from '~/modules/chat/presentation/gateways/main.gateway';
import { DomainContextService } from '~/modules/context/application/context.service';
import type { InterfaceEvent } from '~/modules/context/domain/client_state';
import { SocketContextStore } from '~/shared/context/global_context';
import { WsAuthGuard } from '~/shared/middlewares/auth.middleware';
import { TEST_PROVIDER } from './config';
import { clipMiddle } from './report';
import type { ConversationOptions, Runtime, SocketEvent, TraceEntry, Turn } from './types';

/**
 * Backend real por el gateway
 * Usa el gateway real /chat/main con un socket de prueba; el gateway y su guard deciden qué recibe la prueba.
 */

/**
 * Rechazo del socket
 * El gateway rechazó la conexión o un mensaje.
 */
export class SocketRefusal extends Error {
  constructor(readonly payload: Record<string, unknown>) {
    super(`${String(payload['message'] ?? 'error sin mensaje')} (estado ${String(payload['statusCode'] ?? '?')})`);
  }
}

/**
 * Registro de turnos
 * Registra los mensajes de cada turno (llamadas y resultados de herramientas) sin modificar nada.
 */
const turnRecorder = (record: (messages: BaseMessage[]) => void) =>
  createMiddleware({
    name: 'TestTurnRecorder',
    wrapModelCall: async (request, handler) => {
      const response = await handler(request);
      record([...request.messages, ...(AIMessage.isInstance(response) ? [response] : [])]);
      return response;
    },
    afterAgent: (state) => {
      const { messages } = state as { messages?: BaseMessage[] };
      if (messages?.length) record(messages);
      return undefined;
    },
  });

const testSocket = (handshake: Record<string, string>) => {
  let listener: ((event: SocketEvent) => void) | undefined;
  const socket = {
    id: `agent-test-${Date.now()}`,
    handshake: { auth: handshake },
    emit: (event: string, payload: Record<string, unknown>) => {
      listener?.({ event, payload });
      return true;
    },
    disconnect: () => socket,
  };
  return { socket: socket as unknown as Socket, listen: (next?: (event: SocketEvent) => void) => (listener = next) };
};

export const startRuntime = async (handshake: Record<string, string>): Promise<Runtime> => {
  initializeTransactionalContext();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    let recorder: ((messages: BaseMessage[]) => void) | undefined;
    const contextService = app.get(DomainContextService);
    const buildInstructions = contextService.buildInstructions.bind(contextService);
    contextService.buildInstructions = async (...args) => {
      const built = await buildInstructions(...args);
      return { ...built, middleware: [...built.middleware, turnRecorder((messages) => recorder?.(messages))] };
    };

    const gateway = app.get(MainGateway);
    const store = app.get(SocketContextStore);
    const guard = new WsAuthGuard(app.get(AdminService), app.get(AuthOrchestratorService), app.get(Reflector), store);
    const filter = new ChatWsExceptionFilter();
    const { socket, listen } = testSocket(handshake);

    /**- 1. CONECTAR: como lo hace un cliente */
    const received: SocketEvent[] = [];
    listen((event) => received.push(event));
    await gateway.handleConnection(socket);
    const refused = received.find((event) => event.event === ChatEvents.ERROR);
    if (refused) throw new SocketRefusal(refused.payload);
    const accepted = received.find((event) => event.event === ChatEvents.PROVIDER)?.payload ?? {};

    const authorize = async (body: McpMessageType): Promise<boolean> => {
      const host = new ExecutionContextHost([socket, body], MainGateway, MainGateway.prototype.handleMcpStream);
      host.setType('ws');
      try {
        if (await guard.canActivate(host)) return true;
        filter.catch(new WsException('Forbidden resource'), host);
      } catch (error) {
        filter.catch(error as Error, host);
      }
      return false;
    };

    /**- 2. AUTORIZAR: una vez, antes de escribir nada */
    const probe: SocketEvent[] = [];
    listen((event) => probe.push(event));
    const allowed = await authorize({ newMessage: '', context: [] } as unknown as McpMessageType);
    listen(undefined);
    if (!allowed)
      throw new SocketRefusal(probe.find((event) => event.event === ChatEvents.ERROR)?.payload ?? { message: 'el guard rechazó el mensaje' });

    const context = store.getReference(socket.id);
    if (!context) throw new Error('The gateway kept no context for the test socket.');

    return {
      app,
      context,
      accepted,
      conversation: (options) =>
        new Conversation(options, async (body) => {
          const events: SocketEvent[] = [];
          let messages: BaseMessage[] = [];
          listen((event) => events.push(event));
          recorder = (next) => (messages = next);
          try {
            if (await authorize(body)) await gateway.handleMcpStream(body, socket);
          } finally {
            listen(undefined);
            recorder = undefined;
          }
          return { events, messages };
        }),
      close: () => app.close(),
    };
  } catch (error) {
    await app.close();
    throw error;
  }
};

type Send = (body: McpMessageType) => Promise<{ events: SocketEvent[]; messages: BaseMessage[] }>;

/**
 * Conversación de un circuito
 * Conserva el historial y los eventos de la interfaz de un circuito, como lo hace el frontend.
 */
export class Conversation {
  private readonly history: MessageContextType[] = [];
  private readonly events: InterfaceEvent[] = [];

  constructor(
    private readonly options: ConversationOptions,
    private readonly send: Send
  ) {}

  public async ask(message: string): Promise<Turn> {
    const { mode, stateContext, target } = this.options;
    const context = { ...(mode && { mode }), historyMessages: this.history.length, events: this.events.length, ...(target && { target }) };
    const turn: Turn = { message, context, reply: '', trace: [], events: [], seconds: 0 };
    const started = Date.now();
    const body = {
      context: [...this.history],
      newMessage: message,
      agent: TEST_PROVIDER,
      ...(mode && { mode }),
      ...(stateContext && { stateContext: stateContext([...this.events]) }),
    } as McpMessageType;
    try {
      const { events, messages } = await this.send(body);
      for (const { event, payload } of events) {
        if (event === ChatEvents.CHUNK && typeof payload['stream'] === 'string') turn.reply = payload['stream'];
        if (event === ChatEvents.CUSTOM)
          turn.events.push({ action: String(payload['action']), object: payload['object'] as Record<string, unknown> });
        if (event === ChatEvents.ERROR) turn.error = new SocketRefusal(payload).message;
      }
      turn.trace = traceOf(messages);
    } catch (error) {
      turn.error = error instanceof Error ? error.message : String(error);
    }
    turn.seconds = Math.round((Date.now() - started) / 1000);

    this.history.push({ usertype: 'user', message }, { usertype: 'assistant', message: turn.reply });
    const date = new Date().toISOString();
    for (const event of turn.events) this.events.push({ date, status: 'completed', tool: event.action, data: event.object });
    return turn;
  }
}

const MAX_RESULT_CHARS = 6000;
const MAX_FAILURE_CHARS = 300;

/**
 * Detección de fallo de herramienta
 * Indica por qué una herramienta que respondió no cumplió su trabajo, cuando su respuesta lo declara.
 */
export const failureOf = (content: string): string | undefined => {
  const head = (text: string): string => {
    const line = text.replace(/\s+/g, ' ').trim();
    return line.length > MAX_FAILURE_CHARS ? `${line.slice(0, MAX_FAILURE_CHARS - 1)}…` : line;
  };
  if (/^\s*Error\b/.test(content)) return head(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;
  const { success, isError, error } = parsed as { success?: unknown; isError?: unknown; error?: unknown };
  if (success !== false && isError !== true) return undefined;
  if (typeof error === 'string') return head(error);
  const { message, details } = (error ?? {}) as { message?: unknown; details?: unknown };
  const text = [message, details].filter((part): part is string => typeof part === 'string').join(' — ');
  return head(text || 'la herramienta respondió success: false');
};

/**
 * Traza del turno
 * Extrae las llamadas y resultados de herramientas posteriores al mensaje del propio turno.
 */
export const traceOf = (messages: BaseMessage[]): TraceEntry[] => {
  const start = messages.findLastIndex((message) => HumanMessage.isInstance(message));
  return messages.slice(start + 1).flatMap((message): TraceEntry[] => {
    if (AIMessage.isInstance(message)) return (message.tool_calls ?? []).map((call) => ({ kind: 'call', tool: call.name, args: call.args }));
    if (!ToolMessage.isInstance(message)) return [];
    const content = typeof message.content === 'string' ? message.content : message.text || JSON.stringify(message.content);
    const failure = /^NOT EXECUTED/.test(content) ? undefined : failureOf(content);
    const status = /^NOT EXECUTED/.test(content) ? 'not run' : message.status === 'error' || failure ? 'error' : 'ok';
    return [{ kind: 'result', tool: message.name ?? '', status, content: clipMiddle(content, MAX_RESULT_CHARS), ...(failure && { failure }) }];
  });
};
