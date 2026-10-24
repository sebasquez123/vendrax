import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';

import { LoggerService } from '~/shared/logging/main.logger';
import { ChatService } from '../../application/chat.service';
import { DomainErrorCodes as e, InternalServerError, InvalidChatPayloadError } from '../../domain/errors';
import { filterDomainError } from '~/shared/filters/http-exception.filter';
import { WsExceptionFilter } from '../../../../shared/filters/chat_ws_exception.filter';
import { type McpMessageType, McpMessageSchema } from '../../domain/validator/message_input';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { initialization, setSocketContext } from '~/shared/context/global_context';
import { WsAuthGuard } from '~/shared/middlewares/auth.middleware';
import { ConnectionMiddleware } from '~/shared/middlewares/connection.middleware';
import { ChatEvents, ChatStatus, ConnectionEvent } from '../../domain/interfaces/gateway.interfaces';
import { I18nService } from 'nestjs-i18n';
import { createTranslator } from '~/shared/services/i18n/config';
import { CacheService } from '~/modules/cache/application/cache.service';
import { ICachedContext } from '~/modules/cache/domain/interfaces/cached';

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: '/chat/main',
  cors: true,
})
@Injectable()
export class MainGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new LoggerService(MainGateway.name);
  private readonly turns = new Map<string, AbortController>();

  constructor(
    private readonly chatService: ChatService,
    private readonly connectionMiddleware: ConnectionMiddleware,
    private readonly cacheService: CacheService,
    private readonly i18nService: I18nService
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      this.logger.debug(`Connecting [/chat/main] channel...`);

      const initialContext = initialization(socket.id);
      const context = await this.cacheService.setKey(socket.id, initialContext);

      await this.connectionMiddleware.onConnect(socket, context);
      context.i18n = createTranslator(this.i18nService, socket.handshake.auth['language'] as string | undefined);

      const providers = await this.chatService.getProviderList();
      const modes = this.chatService.getModeList(context.connection ?? [], context.i18n);
      socket.emit(ChatEvents.PROVIDER, { session: socket.id, providers, modes, connection: 'OK' } satisfies ConnectionEvent);
      this.logger.info(`Socket connected on: ${socket.id}`);
    } catch (error: unknown) {
      const { msg, status, detail, code } = filterDomainError(error);
      this.logger.error(msg, status, detail, code);
      socket.emit(ChatEvents.ERROR, {
        message: msg,
        statusCode: status,
        status: ChatStatus.END,
      });
      this.cacheService.revokeKey(socket.id);
      socket.disconnect(true);
      return;
    }
  }

  handleDisconnect(client: Socket): void {
    this.turns.get(client.id)?.abort();
    this.turns.delete(client.id);
    this.cacheService.revokeKey(client.id);
    this.logger.info(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage(ChatEvents.STOP)
  handleStop(@ConnectedSocket() client: Socket): void {
    this.turns.get(client.id)?.abort();
  }

  @SubscribeMessage(ChatEvents.ASK)
  @UseGuards(WsAuthGuard)
  async handleMcpStream(@MessageBody() body: McpMessageType, @ConnectedSocket() client: Socket): Promise<void> {
    let lenght = 0;
    let stream = '';
    const turn = new AbortController();
    try {
      const validated = McpMessageSchema.safeParse(body);
      if (!validated.success)
        throw new InvalidChatPayloadError('Payload Type validation failure', e.INVALID_CHAT_PAYLOAD_ERROR, {
          issues: formatZodErrorMessages(validated),
        });
      const appContext = await this.cacheService.getKey<ICachedContext>(client.id);
      if (!appContext) throw new InternalServerError('Error loading context', e.INTERNAL_CONTEXT_ERROR);

      setSocketContext(appContext);

      this.turns.get(client.id)?.abort();
      this.turns.set(client.id, turn);
      await this.chatService.startMCPInference(body, {
        signal: turn.signal,
        onMessageChunk: (chunk: string) => {
          lenght += chunk.length;
          stream += chunk;
          client.emit(ChatEvents.CHUNK, {
            status: ChatStatus.PROGRESS,
            at: new Date().toISOString(),
            message: chunk,
            lenght,
            stream,
          });
        },
        onCustomEvent: (object: Record<string, unknown>, type: string, action: string, source: string) => {
          client.emit(ChatEvents.CUSTOM, {
            status: ChatStatus.PROGRESS,
            at: new Date().toISOString(),
            object,
            type,
            source,
            action,
          });
        },
        onSummarized: (event) => client.emit(ChatEvents.SUMMARIZED, event),
        onFinalUsage: (_usage, metadata) => {
          client.emit(ChatEvents.END, {
            status: ChatStatus.END,
            at: new Date().toISOString(),
            reason: metadata?.done_reason,
          });
        },
      });
    } catch (error: unknown) {
      const { msg, status, detail, code } = filterDomainError(error);
      this.logger.error(msg, status, detail, code);
      client.emit(ChatEvents.ERROR, {
        message: msg,
        statusCode: status,
        status: ChatStatus.END,
      });
    } finally {
      if (this.turns.get(client.id) === turn) this.turns.delete(client.id);
    }
  }
}
