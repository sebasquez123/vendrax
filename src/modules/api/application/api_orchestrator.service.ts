import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { ServerEntity } from '~/entities';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { Superset } from '../infrastructure';
import { ApiCapabilities, ApiClient, ApiPortInterface } from './interfaces/port.interface';

/**
 * Orquestador de la API
 * Accede a la API REST de un servidor conectado para lo que su servidor MCP no cubre.
 */
@Injectable()
export class ApiOrchestratorService implements OnModuleInit {
  private logger = new LoggerService(ApiOrchestratorService.name);
  private adapters: Map<string, ApiPortInterface> = new Map();
  constructor(private readonly superset: Superset) {}

  onModuleInit(): void {
    this.adapters.set(ServerAdapters.superset_mcp, this.superset);
    this.logger.info(`Api Orchestrator initialized with adapters: ${Array.from(this.adapters.keys()).join(', ')}`);
  }

  private verifyAdapterCapability(adapter: ApiPortInterface, capability: ApiCapabilities): boolean {
    return capability.toString() in adapter;
  }

  /**
   * Cliente de API por servidor
   * Devuelve la API REST de un servidor para este turno, actuando con el token validado en su conexión MCP.
   */
  public connect(server: ServerEntity, accessToken: string | undefined): ApiClient | undefined {
    const adapter = this.adapters.get(server.serverName);
    if (!adapter || !accessToken) return undefined;
    const capabilities = [
      ApiCapabilities.getChart,
      ApiCapabilities.updateChart,
      ApiCapabilities.deleteChart,
      ApiCapabilities.removeChartFromDashboard,
      ApiCapabilities.updateDashboard,
      ApiCapabilities.getDashboard,
    ];
    if (!capabilities.every((capability) => this.verifyAdapterCapability(adapter, capability))) return undefined;

    const target = { baseUrl: server.url, accessToken };
    const account = server.serverAuth.oauthMcpAuth?.username ?? '';
    if (!account) this.logger.warn(`Server '${server.serverName}' has no account username: partial chart changes will not be offered`);
    return {
      account,
      getChart: (chartId) => adapter.getChart!({ ...target, chartId }),
      updateChart: (chartId, change) => adapter.updateChart!({ ...target, chartId, change }),
      deleteChart: (chartId) => adapter.deleteChart!({ ...target, chartId }),
      removeChartFromDashboard: (dashboardId, chartId) => adapter.removeChartFromDashboard!({ ...target, dashboardId, chartId }),
      updateDashboard: (dashboardId, change) => adapter.updateDashboard!({ ...target, dashboardId, change }),
      getDashboard: (dashboardId) => adapter.getDashboard!({ ...target, dashboardId }),
    };
  }
}
