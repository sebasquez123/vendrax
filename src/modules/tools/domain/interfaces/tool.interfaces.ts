import z from 'zod';
import { AdminService } from '~/modules/admin/application/admin.service';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ApiClient } from '~/modules/api/application/interfaces/port.interface';
import { LangchainMCPInterface } from '~/modules/mcp_client/application/interfaces/mcp_langchain_client';

export interface ConsentScreenExeParams {
  userId: string;
  serverId: string;
  clientId: string;
  url: string;
  serverName: string;
  client: string;
  redirectUrl: string;
}
export interface OauthExeParams {
  serverContext: {
    url: string;
    serverName: string;
    userId: string;
    serverId: string;
    clientId: string;
    client: string;
    baseUrl: string;
    refreshEndpoint: string;
    secret: string;
  };
  toolContext: ToolContext;
  attempts: number;
}

export interface JwtExeParams {
  serverContext: {
    url: string;
    serverName: string;
    token: string;
  };
  toolContext: ToolContext;
}

export interface RagServiceParams {
  query: string;
  namespace: string;
  toolResponseConfig: ToolResponseConfig;
}

export type RagRequest = (params: RagServiceParams) => Promise<unknown>;

export interface MCPExeParams {
  args: {
    [x: string]: unknown;
  };
  serverName: string;
  toolName: string;
  langChainClient: LangchainMCPInterface;
  toolResponseConfig: ToolResponseConfig;
}

export interface ToolContext {
  args: {
    params: any;
    body: any;
  };
  toolName: string;
  httpMethod: string;
  toolResponseConfig: ToolResponseConfig;
}

export type ToolResponseConfig = {
  schema: z.ZodType;
  mapResponse?: (response: any, input?: any, auth?: AuthOrchestratorService, admin?: AdminService) => unknown;
};

export interface StateContextToolParams {
  domain?: { contain: string };
  selected_dashboard_id?: number;
}

export interface OauthToolParams {
  params: {
    body: {
      serverName: string;
      userId: string;
      serverId: string;
      clientId: string;
      baseUrl: string;
      client: string;
      refreshEndpoint: string;
      secret: string;
      redirectUrl: string;
    };
    headers: Record<string, never>;
  };
  callback: (params: OauthExeParams) => Promise<string>;
  consentScreenCB: (params: ConsentScreenExeParams) => string;
  RagRequest?: RagRequest;
}

export interface JwtToolParams {
  params: {
    body: {
      serverName: string;
      baseUrl: string;
    };
    headers: {
      token: string;
    };
  };
  callback: (params: JwtExeParams) => Promise<string>;
  RagRequest?: RagRequest;
}

export interface MCPToolParams {
  params: {
    body: { serverName: string };
    langChainClient: LangchainMCPInterface;
    headers: { Authorization: string } | Record<string, never>;
  } & StateContextToolParams;
  callback: (params: MCPExeParams) => Promise<string>;
  RagRequest?: RagRequest;
  ApiService?: ApiClient;
  onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void;
}
