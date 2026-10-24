import { LoggerService } from '~/shared/logging/main.logger';
import { ConsentScreenExeParams, StateContextToolParams } from '../domain/interfaces/tool.interfaces';
import { pms, pay, superset } from '../infrastructure/tools';

import { Injectable } from '@nestjs/common';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { JwtTools, MCPTools, OauthTools, ToolOutput, ToolBatch } from '../domain/interfaces/tool.types';
import { AuthType, ServerType } from '~/entities';
import { LangchainMCPInterface } from '~/modules/mcp_client/application/interfaces/mcp_langchain_client';
import { ConnectionContext } from '~/shared/context/types/context.types';
import { JwtApiToolType, JwtMcpToolType, OauthApiToolType, OauthMcpToolType } from '~/modules/admin/domain/interfaces/authorization.interface';
import { Oauth, Mcp, Jwt } from './providers';
import { ApiOrchestratorService } from '~/modules/api/application/api_orchestrator.service';
import { RagService } from '~/modules/RAG/application/rag.service';
import { KNOWLEDGE_SEARCH_PERMISSION, KnowledgeSearch, knowledgeSearchTool, searchKnowledgeTool } from '../infrastructure/tools/rag/tool';

/**
 * Registro de herramientas MCP
 * Administra el registro de herramientas disponibles del cliente MCP; es un singleton sin estado.
 */

@Injectable()
export class ToolOrchestratorService {
  private logger = new LoggerService(ToolOrchestratorService.name);
  public readonly tools: ToolBatch = {};
  constructor(
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly apiOrchestratorService: ApiOrchestratorService,
    private readonly ragService: RagService,
    private readonly jwt: Jwt,
    private readonly mcp: Mcp,
    private readonly oauth: Oauth
  ) {
    this.tools = {
      pay_api: pay,
      pms_api: pms,
      superset_mcp: superset,
    };
  }

  public getFlattenedTools(): (JwtTools | OauthTools | MCPTools)[] {
    return Object.values(this.tools).flatMap((toolArray) => toolArray.map((tool) => tool));
  }

  public getSystemToolNames(): Set<string> {
    return new Set([...this.getFlattenedTools().map((tool) => tool.name), KNOWLEDGE_SEARCH_PERMISSION]);
  }

  public getKnowledgeSearchTool(spec: KnowledgeSearch): ToolOutput {
    return knowledgeSearchTool(spec, this.ragService.query);
  }

  public retrieveKnowledge(spec: KnowledgeSearch, query: string): Promise<unknown> {
    return searchKnowledgeTool(spec, this.ragService.query, query);
  }

  public apiOauthConsentScreenExe = (params: ConsentScreenExeParams) => {
    return this.authOrchestratorService.getConsentScreen({ ...params }, params.serverName as ServerAdapters);
  };

  /**
   * Armado de la cadena de herramientas
   * Reúne las herramientas de los servidores disponibles en un kit de herramientas 'ToolOutput' listo para usar.
   */

  public getToolChain(
    plannedTools: string[],
    connections: ConnectionContext[],
    langChainClient: LangchainMCPInterface | null,
    onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void,
    stateContextToolParams: Partial<Record<string, StateContextToolParams>> = {},
    accessTokens: Partial<Record<string, string>> = {}
  ): ToolOutput[] {
    this.logger.trace('Loading tool set');

    const tools: ToolOutput[] = connections.reduce<ToolOutput[]>((acc, connection) => {
      const serverName = connection.server.serverName;
      const toolBunch = this.tools[serverName] ?? [];
      const serverType = connection.server.serverAuth.serverType;
      const authType = connection.server.serverAuth.authType;

      const headers = connection.authSchema.headers;
      const body = connection.authSchema.body;
      const props = { body, headers };
      const stateContext = stateContextToolParams[serverName] ?? {};

      switch (true) {
        case serverType === ServerType.API && authType === AuthType.JWT:
          acc.push(
            ...(toolBunch as JwtTools[])
              .map((tool) => {
                if (!connection.tools.some((t) => t.name === tool.name)) return undefined;
                if (!plannedTools.includes(tool.name)) return undefined;
                return tool.func({
                  callback: this.jwt.RunExecutor,
                  RagRequest: this.ragService.query,
                  params: props as JwtApiToolType,
                });
              })
              .filter((t) => t != undefined)
          );
          break;
        case serverType === ServerType.API && authType === AuthType.OAUTH:
          acc.push(
            ...(toolBunch as OauthTools[])
              .map((tool) => {
                if (!connection.tools.some((t) => t.name === tool.name)) return undefined;
                if (!plannedTools.includes(tool.name)) return undefined;
                return tool.func({
                  callback: (prms) => this.oauth.RunExecutor(prms),
                  consentScreenCB: this.apiOauthConsentScreenExe,
                  RagRequest: this.ragService.query,
                  params: props as OauthApiToolType,
                });
              })
              .filter((t) => t != undefined)
          );
          break;
        case serverType === ServerType.MCP && authType === AuthType.JWT:
          if (!langChainClient) return acc;
          acc.push(
            ...(toolBunch as MCPTools[])
              .map((tool) => {
                if (!connection.tools.some((t) => t.name === tool.name)) return undefined;
                if (!plannedTools.includes(tool.name)) return undefined;
                return tool.func({
                  callback: this.mcp.RunExecutor,
                  onCustomEvent: onCustomEvent,
                  RagRequest: this.ragService.query,
                  params: { ...(props as JwtMcpToolType), langChainClient },
                });
              })
              .filter((t) => t != undefined)
          );
          break;
        case serverType === ServerType.MCP && authType === AuthType.OAUTH:
          if (!langChainClient) return acc;
          acc.push(
            ...(toolBunch as MCPTools[])
              .map((tool) => {
                if (!connection.tools.some((t) => t.name === tool.name)) return undefined;
                if (!plannedTools.includes(tool.name)) return undefined;
                return tool.func({
                  callback: this.mcp.RunExecutor,
                  onCustomEvent: onCustomEvent,
                  RagRequest: this.ragService.query,
                  ApiService: this.apiOrchestratorService.connect(connection.server, accessTokens[serverName]),
                  params: { ...(props as OauthMcpToolType), langChainClient, ...stateContext },
                });
              })
              .filter((t) => t != undefined)
          );
          break;
        default:
          return acc;
      }

      return acc;
    }, []);

    return tools;
  }
}
