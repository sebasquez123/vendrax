import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import type { ApiClient } from '~/modules/api/application/interfaces/port.interface';
import { ApiOrchestratorService } from '~/modules/api/application/api_orchestrator.service';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ToolOrchestratorService } from '~/modules/tools/application/tools_orchestrator.service';
import type { ConnectionContext, SocketContext } from '~/shared/context/types/context.types';
import type { Conversation } from '../../core/runtime';
import type { Runtime } from '../../core/types';

const DOMAIN = 'PAY';

export interface Dashboard {
  id: number;
  title: string;
}

export interface SupersetRuntime {
  context: SocketContext;
  dashboard: Dashboard;
  baseDashboardId?: number;
  tools: ToolOrchestratorService;
  superset: ConnectionContext;
  token(): Promise<string>;
  api(): Promise<ApiClient>;
  conversation(mode: string, dashboard: Dashboard): Conversation;
}

export const supersetRuntime = async (runtime: Runtime, settings: { dashboardId: number; baseDashboardId?: number }): Promise<SupersetRuntime> => {
  const { app, context } = runtime;
  const superset = context.connection?.find((connection) => connection.server.serverName === ServerAdapters.superset_mcp);
  if (!superset)
    throw new Error(`The connection has no '${ServerAdapters.superset_mcp}': the handshake's scopes do not grant the dashboard manager.`);

  const { server } = superset;
  const auth = app.get(AuthOrchestratorService);
  const token = (): Promise<string> =>
    auth.authenticateMcp(
      {
        baseUrl: server.url,
        mcpEndpoint: server.serverAuth.oauthMcpAuth.mcpEndpoint,
        refreshEndpoint: server.serverAuth.oauthMcpAuth.refreshEndpoint,
        serverId: server.id,
        userId: context.user.userId ?? '',
        clientId: context.client.appClientId ?? '',
      },
      ServerAdapters.superset_mcp
    );
  const apiOrchestrator = app.get(ApiOrchestratorService);
  const api = async (): Promise<ApiClient> => {
    const client = apiOrchestrator.connect(server, await token());
    if (!client) throw new Error('Superset REST API is not available for this connection.');
    return client;
  };

  const saved = await (await api()).getDashboard(settings.dashboardId);
  return {
    context,
    dashboard: { id: saved.id, title: saved.title },
    ...(settings.baseDashboardId && { baseDashboardId: settings.baseDashboardId }),
    tools: app.get(ToolOrchestratorService),
    superset,
    token,
    api,
    conversation: (mode, dashboard) =>
      runtime.conversation({
        mode,
        target: `dashboard ${dashboard.id}`,
        stateContext: (events) => ({
          SUPERSET: { domain: DOMAIN, location: { id: dashboard.id, dashboard_title: dashboard.title }, events },
        }),
      }),
  };
};
