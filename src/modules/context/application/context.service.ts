import { Injectable, OnModuleInit } from '@nestjs/common';
import type { AgentMiddleware } from 'langchain';
import { findKnowledgeDomain, KNOWLEDGE_DOMAINS } from '~/knowledge';
import { isKnowledgeSearchConfigured, KNOWLEDGE_SEARCH_PERMISSION } from '~/modules/tools/infrastructure/tools/rag/tool';
import type { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';
import type { StateContextType } from '~/modules/chat/domain/validator/message_input';
import type { ConnectionContext } from '~/shared/context/types/context.types';
import type { DomainToolPolicy, OpenedServer, OpenedTurn, PreloadedContext, SectionPart } from '../domain/interfaces/context.interfaces';
import { getSocketContext } from '~/shared/context/global_context';
import { toDisplayName } from '~/shared/helpers/display_name';
import { LoggerService } from '~/shared/logging/main.logger';
import { IdentityPrompt, SessionPrompt } from '../domain/identity.prompt';
import {
  availableTopics,
  checkPack,
  checkPacks,
  renderFallbackInstructions,
  renderKnowledgeIndex,
  renderSection,
  renderVocabulary,
  SECTION_PARTS,
} from '../domain/sections.prompt';
import { buildToolPolicyMiddleware } from '../infrastructure/middlewares/policy/policy.middleware';
import { PreloadService } from './preload.service';
import config from '~/config';

/**
 * Motor de contexto
 * Entrega al agente el contexto de cada turno, sin llamar al modelo, y mantiene las llamadas dentro de las reglas.
 */
@Injectable()
export class DomainContextService implements OnModuleInit {
  private logger = new LoggerService(DomainContextService.name);

  constructor(private readonly preloadService: PreloadService) {}

  public onModuleInit(): void {
    const packs = KNOWLEDGE_DOMAINS.flatMap((domain) => domain.packs);
    for (const pack of packs) {
      const issues = checkPack(pack);
      if (issues.length) this.logger.warn(`Knowledge pack '${pack.id}' is incomplete`, { issues });
    }
    const shared = checkPacks(packs);
    if (shared.length) this.logger.error('Knowledge packs collide; the agent could confuse their servers', undefined, { issues: shared });
  }

  /**
   * Fase de apertura
   * Abre el turno para cada servidor en 'connections' y usa el 'mode' del mensaje si la conexión lo solicitó.
   */
  public openTurn(connections: ConnectionContext[], stateContext: StateContextType, previousMessageCount: number, mode?: string): OpenedTurn {
    const now = new Date();
    const socket = getSocketContext();
    const stateContextToolParams: OpenedTurn['stateContextToolParams'] = {};

    const servers = connections.map((connection): OpenedServer => {
      const serverName = connection.server.serverName;

      /**- 1. PACK: subdominios de la conexión en el modo */
      const domain = findKnowledgeDomain(serverName);
      if (!domain) throw new Error(`Server '${serverName}' is connected without a knowledge domain (src/knowledge)`);
      const selectedMode = mode && connection.modes.includes(mode) ? mode : connection.modes[0];
      const pack = domain.packFor(connection.subdomains, selectedMode);

      /**- 2. TURNO: desde su propio estado del cliente */
      const { turn, issues } = pack.openTurn(stateContext, { previousMessageCount, now, socket });
      if (issues.length)
        this.logger.warn(`Client state 'stateContext.${pack.stateKey}' did not match its contract (07_client_state); invalid parts were ignored`, {
          issues,
        });
      if (turn.stateContextToolParams) stateContextToolParams[serverName] = turn.stateContextToolParams;

      /**- 3. HERRAMIENTAS: permitidas, acotadas al uso del pack */
      const permitted = connection.tools.map((tool) => tool.name).filter((name) => !pack.excludedTools?.includes(name));
      const toolNames = pack.includedTools ? permitted.filter((name) => pack.includedTools!.includes(name)) : permitted;

      /**- 4. BÚSQUEDA DE CONOCIMIENTO: requisitos para adjuntarla */
      const label = pack.server.label;
      const knowledgeBase = pack.knowledgeBase;
      const hasDocuments = Boolean(knowledgeBase && availableTopics(knowledgeBase).length);
      const searchPermitted = connection.tools.some((tool) => tool.name === KNOWLEDGE_SEARCH_PERMISSION);
      const searchConfigured = isKnowledgeSearchConfigured();
      if (hasDocuments && !searchPermitted)
        this.logger.warn(
          `The knowledge base of '${label}' has documents, but the client permissions for '${serverName}' do not list '${KNOWLEDGE_SEARCH_PERMISSION}': its search tool is not attached`
        );
      if (hasDocuments && searchPermitted && !searchConfigured)
        this.logger.warn(
          `The knowledge base of '${label}' has documents, but RAG_API_URL / RAG_API_TOKEN are not set: its search tool is not attached`
        );
      const knowledgeSearch =
        knowledgeBase && hasDocuments && searchPermitted && searchConfigured
          ? { name: knowledgeBase.searchTool, namespace: knowledgeBase.namespace, label }
          : undefined;
      return { connection, serverName, label, pack, turn, toolNames, knowledgeSearch };
    });
    this.logger.trace(
      'Turn opened with packs',
      servers.map((server) => server.pack.id)
    );
    return { servers, now, stateContextToolParams };
  }

  /**
   * Fases de precarga y ensamblado
   * Ejecuta las fases 2 de precarga y 3 de ensamblado una vez que existen las herramientas del turno.
   */
  public async buildInstructions(
    opened: OpenedTurn,
    toolsByServer: ReadonlyMap<string, ToolOutput[]>,
    message: string
  ): Promise<{ instructions: string; middleware: AgentMiddleware[] }> {
    const preloaded = await this.preloadService.run(
      opened.servers.map(({ connection, serverName, label, pack, knowledgeSearch }) => ({
        connection,
        label,
        pack,
        knowledgeSearch,
        tools: toolsByServer.get(serverName) ?? [],
      })),
      message
    );
    return this.assemble(opened, toolsByServer, preloaded);
  }

  /**
   * Fase de ensamblado
   * Ensambla las instrucciones: identidad, cada parte servidor por servidor y luego la sesión.
   */
  private assemble(
    opened: OpenedTurn,
    toolsByServer: ReadonlyMap<string, ToolOutput[]>,
    preloaded: PreloadedContext[]
  ): { instructions: string; middleware: AgentMiddleware[] } {
    const appContext = getSocketContext();

    const UTC_OFFSET_HOURS = -5;

    const blocksOf = (server: OpenedServer, index: number, part: SectionPart): (string | null | undefined)[] => {
      const { pack, turn } = server;
      switch (part) {
        case 'instructions':
          return [pack.playbook.trim() ? pack.playbook : renderFallbackInstructions(), pack.replyShapes];
        case 'knowledge':
          return [renderVocabulary(pack.vocabulary), server.knowledgeSearch && renderKnowledgeIndex(pack.knowledgeBase)];
        case 'data':
          return [preloaded[index]?.catalog, preloaded[index]?.retrieval];
        case 'current state':
          return [turn.statePrompt];
      }
    };

    const sections = [
      IdentityPrompt({ botName: appContext?.client?.botName, userName: toDisplayName(appContext?.user?.userName) }),
      ...SECTION_PARTS.flatMap((part) => opened.servers.map((server, index) => renderSection(server.label, part, blocksOf(server, index, part)))),
      SessionPrompt(opened.now, UTC_OFFSET_HOURS),
    ];

    const policies: DomainToolPolicy[] = opened.servers.map(({ serverName, pack, turn, knowledgeSearch }) => {
      const prefix = pack.server.toolPrefix;

      const searchLimit = knowledgeSearch ? { [shortName(knowledgeSearch.name, prefix)]: config.rag.knowledgeSearchLimit } : {};
      return {
        toolNames: new Set((toolsByServer.get(serverName) ?? []).map((tool) => tool.name)),
        prefix,
        limits: { ...searchLimit, ...pack.toolCallLimits },
        evaluate: turn.evaluateToolCall,
      };
    });

    return {
      instructions: sections.filter((section) => section.trim()).join('\n\n'),
      middleware: [buildToolPolicyMiddleware(policies)],
    };
  }
}

const shortName = (name: string, prefix: string): string => (prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name);
