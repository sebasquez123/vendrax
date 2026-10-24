import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { AgentOrchestratorService } from '~/modules/agent/application/agent_orchestrator.service';
import { LangchainMCPClient } from '~/modules/mcp_client/infrastructure';
import { StreamInferAdapterParams } from '~/modules/agent/application/interfaces/port.interface';
import { McpMessageType } from '~/modules/chat/domain/validator/message_input';

import { DomainErrorCodes as e, InvalidChatPayloadError, ServersNoAvailableError } from '../domain/errors';
import { getSocketContext } from '~/shared/context/global_context';
import { AuthType, ServerEntity, ServerType } from '~/entities';
import { ToolOrchestratorService } from '~/modules/tools/application/tools_orchestrator.service';
import { ConnectionContext } from '~/shared/context/types/context.types';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { DomainContextService } from '~/modules/context/application/context.service';
import { AgentEngines } from '~/modules/agent/application/interfaces/orchestrator.interface';
import { findKnowledgeDomain } from '~/knowledge';
import type { ModeOption } from '~/knowledge/types';
import { toolsByServerLine } from '~/shared/logging/formatters';
import type { LanguageTranslator } from '~/shared/services/i18n/config';
import config from '~/config';
import type { MessageContextType } from '~/modules/chat/domain/validator/message_input';
import type { ConversationSummarizedEvent } from '~/modules/chat/domain/interfaces/gateway.interfaces';
import { ConversationSummaryBlock } from '~/modules/agent/domain/summary.prompt';

const SUMMARY_USERTYPE = 'summary';

/**
 * Servicio de chat
 * Gestiona los mensajes: historial, procesamiento, metadatos, resumen y contexto.
 */
@Injectable()
export class ChatService {
  private logger = new LoggerService(ChatService.name);
  private readonly summarizing = new Set<string>();
  constructor(
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly toolOrchestratorService: ToolOrchestratorService,
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly domainContextService: DomainContextService
  ) {}

  private async loadMcps(connections: ConnectionContext[]): Promise<{ mcpClient: LangchainMCPClient | null; accessTokens: Record<string, string> }> {
    const mcpClient = new LangchainMCPClient();
    const accessTokens: Record<string, string> = {};
    const mcpConnections = connections.filter((connection) => connection.server.serverAuth.serverType === ServerType.MCP);
    if (mcpConnections.length === 0) {
      this.logger.trace(`No MCP servers found, going through without MCP servers`);
      return { mcpClient: null, accessTokens };
    }
    const appContext = getSocketContext();
    const headers: Record<string, Record<string, string>> = {};

    for (const connection of mcpConnections) {
      const server = connection.server.serverAuth;

      if (server.serverType === ServerType.MCP && server.authType === AuthType.OAUTH) {
        const accessToken = await this.authOrchestratorService.authenticateMcp!(
          {
            baseUrl: connection.server.url,
            mcpEndpoint: connection.server.serverAuth.oauthMcpAuth.mcpEndpoint,
            refreshEndpoint: connection.server.serverAuth.oauthMcpAuth.refreshEndpoint,
            serverId: connection.server.id,
            userId: appContext?.user.userId || '',
            clientId: appContext?.client.appClientId || '',
          },
          connection.server.serverName as ServerAdapters
        );
        headers[connection.server.serverName] = {
          Authorization: `Bearer ${accessToken}`,
        };
        accessTokens[connection.server.serverName] = accessToken;
      } else if (server.serverType === ServerType.MCP && server.authType === AuthType.JWT) {
        headers[connection.server.serverName] = connection.authSchema.headers;
      }
    }

    const servers: ServerEntity[] = mcpConnections.map((connection) => ({
      ...connection.server,
      url:
        connection.server.serverAuth.authType === AuthType.OAUTH
          ? `${connection.server.url}${connection.server.serverAuth.oauthMcpAuth.mcpEndpoint}`
          : `${connection.server.url}${connection.server.serverAuth.jwtMcpAuth.mcpEndpoint}`,
    }));
    await mcpClient?.createClient(servers, headers);

    return { mcpClient, accessTokens };
  }

  private chatProvider(agent?: string): string {
    return agent ?? AgentEngines.GEMINI;
  }

  /**
   * Modos ofrecidos al cliente
   * Los modos pedidos al conectar, con nombre y descripción traducidos; sin traducción, el texto del pack.
   */
  public getModeList(connections: ConnectionContext[], i18n?: LanguageTranslator | null): ModeOption[] {
    const translate = (key: string, original: string): string => {
      const text = i18n?.t(key);
      return text && text !== key ? text : original;
    };
    const options = new Map<string, ModeOption>();
    for (const connection of connections) {
      const domain = findKnowledgeDomain(connection.server.serverName);
      for (const id of connection.modes) {
        const info = domain?.packFor(connection.subdomains, id).mode;
        if (!info || !domain || options.has(id)) continue;
        options.set(id, {
          id,
          label: translate(`${domain.server.domain}.modes.${id}.label`, info.label),
          description: translate(`${domain.server.domain}.modes.${id}.description`, info.description),
        });
      }
    }
    return [...options.values()];
  }

  public async getProviderList(): Promise<string[]> {
    const providers = await this.agentOrchestratorService.getAvailableProviders();
    if (providers.length === 0) throw new ServersNoAvailableError('No providers available', e.PROVIDERS_NO_AVAILABLE_ERROR);

    return providers;
  }

  public async startMCPInference(
    { context, newMessage, agent, mode, stateContext }: McpMessageType,
    {
      onMessageChunk,
      onThinkingChunk,
      onContextInit,
      onToolCall,
      onFinalUsage,
      onCustomEvent,
      onSummarized,
      signal,
    }: Partial<StreamInferAdapterParams> & { onSummarized?: (event: ConversationSummarizedEvent) => void }
  ): Promise<void> {
    const startedAt = Date.now();
    const appContext = getSocketContext();
    const connections = appContext?.connection ?? [];
    const summary = context[0]?.usertype === SUMMARY_USERTYPE ? context[0].message : undefined;
    const messages = summary ? context.slice(1) : context;
    const timings = { prepared: 0, firstChunk: 0 };
    let toolCalls = 0;
    let outcome = 'failed';

    try {
      if (mode && !this.getModeList(connections).some((option) => option.id === mode))
        throw new InvalidChatPayloadError(`Mode '${mode}' was not requested when connecting`, e.INVALID_CHAT_PAYLOAD_ERROR);

      const { mcpClient: mcpInstance, accessTokens } = await this.loadMcps(connections);

      const turn = this.domainContextService.openTurn(connections, stateContext, context.length, mode);

      const toolsByServer = new Map(
        turn.servers.map(({ connection, serverName, toolNames, knowledgeSearch }) => [
          serverName,
          [
            ...this.toolOrchestratorService.getToolChain(
              toolNames,
              [connection],
              mcpInstance,
              onCustomEvent,
              turn.stateContextToolParams,
              accessTokens
            ),
            ...(knowledgeSearch ? [this.toolOrchestratorService.getKnowledgeSearchTool(knowledgeSearch)] : []),
          ],
        ])
      );
      const toolChain = [...toolsByServer.values()].flat();
      const built = await this.domainContextService.buildInstructions(turn, toolsByServer, newMessage);
      const instructions = summary ? [built.instructions, ConversationSummaryBlock(summary)].join('\n\n') : built.instructions;
      const middleware = built.middleware;
      timings.prepared = Date.now() - startedAt;
      this.logger.debug(
        `Turn ready · packs ${turn.servers.map((server) => server.pack.id).join(', ') || '-'} · instructions ${instructions.length} chars · middleware ${middleware.length} · ${toolsByServerLine([...toolsByServer].map(([server, tools]) => ({ server, tools })))}`
      );

      await this.agentOrchestratorService.runAgentWorkFlow(
        {
          context: messages,
          newMessage: newMessage,
          toolSet: toolChain,
          prompt: instructions,
          agent: this.chatProvider(agent),
          middleware,
        },
        {
          onMessageChunk: (chunk) => {
            if (!timings.firstChunk) timings.firstChunk = Date.now() - startedAt;
            onMessageChunk?.(chunk);
          },
          onThinkingChunk,
          onContextInit,
          onToolCall: (toolName, args) => {
            toolCalls++;
            onToolCall?.(toolName, args);
          },
          onFinalUsage,
          signal,
        }
      );
      outcome = signal?.aborted ? 'aborted' : 'completed';
      if (outcome === 'completed' && onSummarized)
        void this.compactConversation(context, onSummarized, appContext?.socket ?? appContext?.traceId ?? '-').catch((error: unknown) =>
          this.logger.warn('Conversation could not be summarized; the full history is kept and it is retried on the next turn', {
            error: error instanceof Error ? error.message : String(error),
          })
        );
    } finally {
      const servers = connections.map((connection) => connection.server.serverName).join(',') || '-';
      this.logger.info(
        `Turn ${outcome} · client ${appContext?.client.appClientId ?? '-'} · user ${appContext?.user.userId ?? '-'} · servers ${servers} · mode ${mode ?? '-'} · agent ${this.chatProvider(agent)} · tools ${toolCalls} · prepare ${timings.prepared}ms · first chunk ${timings.firstChunk}ms · total ${Date.now() - startedAt}ms`
      );
    }
  }

  /**
   * Compactación de la conversación
   * Pasado el umbral, resume en segundo plano lo anterior a los mensajes recientes y lo entrega por 'onSummarized'.
   */
  private async compactConversation(
    context: MessageContextType[],
    onSummarized: (event: ConversationSummarizedEvent) => void,
    conversationKey: string
  ): Promise<void> {
    /**- 1. UMBRAL: mensajes posteriores al último resumen */
    const hasSummary = context[0]?.usertype === SUMMARY_USERTYPE;
    const sinceSummary = hasSummary ? context.length - 1 : context.length;
    if (sinceSummary < config.summary.triggerMessages || this.summarizing.has(conversationKey)) return;
    const to = context.length - config.summary.remainingMessages - 1;
    const folded = context.slice(hasSummary ? 1 : 0, to + 1);
    if (!folded.length) return;

    /**- 2. RESUMEN: el anterior más los mensajes que salen */
    this.summarizing.add(conversationKey);
    const startedAt = Date.now();
    try {
      const previousSummary = hasSummary ? context[0]!.message : undefined;
      const { summary, model } = await this.agentOrchestratorService.summarize(previousSummary, folded);
      if (!summary) return;

      /**- 3. ENTREGA: hoy un evento; luego, el historial en BD */
      onSummarized({
        summary,
        summarizedMessages: { from: 0, to },
        remainingMessages: context.length - to - 1,
        model,
        createdAt: new Date().toISOString(),
      });

      /**- 4. TRAZA */
      const tokensBefore = Math.round(context.slice(0, to + 1).reduce((total, message) => total + message.message.length, 0) / 4);
      this.logger.info(
        `Conversation summarized · messages 0–${to} → ${summary.split(/\s+/).length} words · ~${tokensBefore} → ~${Math.round(summary.length / 4)} tokens · ${model} · ${Date.now() - startedAt}ms`
      );
    } finally {
      this.summarizing.delete(conversationKey);
    }
  }
}
