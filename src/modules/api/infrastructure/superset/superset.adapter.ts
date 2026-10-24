import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import {
  ApiPortInterface,
  DeleteChartAdapterParams,
  GetChartAdapterParams,
  GetDashboardAdapterParams,
  RemoveChartAdapterParams,
  SavedChart,
  SavedDashboard,
  UpdateChartAdapterParams,
  UpdateDashboardAdapterParams,
} from '../../application/interfaces/port.interface';
import {
  ApiBadGatewayError,
  ApiBadRequestError,
  ApiForbiddenError,
  ApiGatewayTimeoutError,
  ApiNotFoundError,
  ApiPreconditionFailedError,
  ApiUnauthorizedError,
  ApiUnprocessableEntityError,
  DomainErrorCodes as e,
} from '../../domain/errors';
import { chartsInLayout, removeChartFromLayout } from '../../domain/superset.layout';

const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class SupersetApiAdapterService implements ApiPortInterface {
  private logger = new LoggerService(SupersetApiAdapterService.name);
  constructor(private readonly authOrchestratorService: AuthOrchestratorService) {}

  public async getChart({ baseUrl, accessToken, chartId }: GetChartAdapterParams): Promise<SavedChart> {
    const query = `(columns:!(id,slice_name,viz_type,description,datasource_id,params,dashboards.id),filters:!((col:id,opr:eq,value:${chartId})))`;
    const body = (await this.request(`${baseUrl}/api/v1/chart/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })) as {
      result?: {
        id?: number;
        slice_name?: string;
        viz_type?: string;
        description?: string | null;
        datasource_id?: number | null;
        params?: string | null;
        dashboards?: { id?: number }[] | null;
      }[];
    };
    const chart = body.result?.[0];
    if (!chart) throw new ApiNotFoundError(`Superset did not find chart ${chartId}`, e.NOT_FOUND_ERROR);
    const params = parseParams(chart.params);
    if (!chart.id || !params)
      throw new ApiBadGatewayError(`Superset returned chart ${chartId} without a readable configuration`, e.RESPONSE_FORMAT_ERROR);
    return {
      id: chart.id,
      sliceName: chart.slice_name ?? '',
      vizType: chart.viz_type ?? '',
      description: chart.description ?? null,
      datasetId: chart.datasource_id ?? null,
      dashboardIds: (chart.dashboards ?? []).flatMap((dashboard) => (dashboard.id ? [dashboard.id] : [])),
      params,
    };
  }

  public async updateChart({ baseUrl, accessToken, chartId, change }: UpdateChartAdapterParams): Promise<void> {
    await this.write({ baseUrl, accessToken }, 'PUT', `/api/v1/chart/${chartId}`, {
      ...(change.params && { params: JSON.stringify(change.params) }),
      ...(change.sliceName && { slice_name: change.sliceName }),
      ...(change.description !== undefined && { description: change.description }),
      ...(change.resetQueryContext && { query_context: null }),
    });
  }

  public async deleteChart({ baseUrl, accessToken, chartId }: DeleteChartAdapterParams): Promise<void> {
    await this.write({ baseUrl, accessToken }, 'DELETE', `/api/v1/chart/${chartId}`);
  }

  public async removeChartFromDashboard({ baseUrl, accessToken, dashboardId, chartId }: RemoveChartAdapterParams): Promise<void> {
    const read = { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } };

    const [dashboard, linked] = (await Promise.all([
      this.request(`${baseUrl}/api/v1/dashboard/${dashboardId}`, read),
      this.request(`${baseUrl}/api/v1/dashboard/${dashboardId}/charts`, read),
    ])) as [{ result?: { position_json?: string | null; json_metadata?: string | null } }, { result?: { id?: number }[] }];
    const layout = parseParams(dashboard.result?.position_json);
    const metadata = parseParams(dashboard.result?.json_metadata);
    if (!layout || !metadata)
      throw new ApiBadGatewayError(`Superset returned dashboard ${dashboardId} without a readable layout`, e.RESPONSE_FORMAT_ERROR);

    const positions = removeChartFromLayout(layout, chartId);

    const placed = chartsInLayout(positions);
    const unplaced = (linked.result ?? []).map((chart) => chart.id).filter((id): id is number => !!id && id !== chartId && !placed.has(id));
    if (unplaced.length)
      throw new ApiPreconditionFailedError(
        `Dashboard ${dashboardId} has charts that are not in its saved layout (${unplaced.join(', ')})`,
        e.UNSAVED_LAYOUT_ERROR
      );

    await this.write({ baseUrl, accessToken }, 'PUT', `/api/v1/dashboard/${dashboardId}`, {
      position_json: JSON.stringify(positions),
      json_metadata: JSON.stringify({ ...metadata, positions }),
    });
  }

  public async updateDashboard({ baseUrl, accessToken, dashboardId, change }: UpdateDashboardAdapterParams): Promise<SavedDashboard> {
    await this.write({ baseUrl, accessToken }, 'PUT', `/api/v1/dashboard/${dashboardId}`, {
      ...(change.title !== undefined && { dashboard_title: change.title }),
      ...(change.published !== undefined && { published: change.published }),
    });

    return this.getDashboard({ baseUrl, accessToken, dashboardId });
  }

  public async getDashboard({ baseUrl, accessToken, dashboardId }: GetDashboardAdapterParams): Promise<SavedDashboard> {
    const body = (await this.request(`${baseUrl}/api/v1/dashboard/${dashboardId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })) as { result?: { id?: number; dashboard_title?: string; published?: boolean; json_metadata?: string | null } };
    const saved = body.result;
    if (!saved?.id) throw new ApiBadGatewayError(`Superset did not return dashboard ${dashboardId}`, e.RESPONSE_FORMAT_ERROR);
    const colorScheme = parseParams(saved.json_metadata)?.['color_scheme'];
    return {
      id: saved.id,
      title: saved.dashboard_title ?? '',
      published: Boolean(saved.published),
      colorScheme: typeof colorScheme === 'string' ? colorScheme : '',
    };
  }

  private async write(target: { baseUrl: string; accessToken: string }, method: 'PUT' | 'DELETE', path: string, body?: object): Promise<void> {
    const send = async () => {
      const session = await this.authOrchestratorService.getApiSession(target, ServerAdapters.superset_mcp);
      await this.request(`${target.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'X-CSRFToken': session.csrfToken,
          Cookie: session.cookie,
          Referer: target.baseUrl,
          ...(body && { 'Content-Type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
      });
    };
    try {
      await send();
    } catch (error) {
      if (!(error instanceof ApiBadRequestError && error.code === e.CSRF_REJECTED_ERROR)) throw error;
      this.logger.warn(`Superset rejected the CSRF token for ${method} ${path}; retrying with a new one`);
      await send();
    }
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...init.headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ApiGatewayTimeoutError(`Superset did not respond: ${error instanceof Error ? error.message : 'unknown error'}`, e.UNAVAILABLE_ERROR, {
        url,
      });
    }
    const text = await response.text();
    if (response.ok) return text ? JSON.parse(text) : {};

    const message = supersetMessage(text);
    const detail = { url, status: response.status };
    this.logger.warn(`Superset answered ${response.status} to ${init.method} ${url}`, { message });
    if (response.status === 401) throw new ApiUnauthorizedError(`Superset session expired: ${message}`, e.SESSION_EXPIRED_ERROR, detail);
    if (response.status === 403) throw new ApiForbiddenError(`Superset refused the change: ${message}`, e.NOT_OWNER_ERROR, detail);
    if (response.status === 404) throw new ApiNotFoundError(`Superset did not find it: ${message}`, e.NOT_FOUND_ERROR, detail);
    if (response.status === 400 && /csrf/i.test(text))
      throw new ApiBadRequestError(`Superset rejected the CSRF token: ${message}`, e.CSRF_REJECTED_ERROR, detail);
    if (response.status === 400) throw new ApiBadRequestError(message, e.REJECTED_ERROR, detail);
    if (response.status === 422) throw new ApiUnprocessableEntityError(message, e.REJECTED_ERROR, detail);
    throw new ApiBadGatewayError(`Superset answered ${response.status}: ${message}`, e.UNAVAILABLE_ERROR, detail);
  }
}

const parseParams = (params: string | null | undefined): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(params || '{}') as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const supersetMessage = (text: string): string => {
  try {
    const body = JSON.parse(text) as { message?: unknown; errors?: { message?: string }[] };
    if (typeof body.message === 'string') return body.message;
    if (body.message) return JSON.stringify(body.message);
    if (body.errors?.length) return body.errors.map((error) => error.message).join('; ');
  } catch {
    return text.slice(0, 300);
  }
  return text.slice(0, 300);
};
