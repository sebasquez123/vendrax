import type { ApiClient } from '~/modules/api/application/interfaces/port.interface';
import { DomainErrorCodes } from '~/modules/api/domain/errors';
import { isDomainError } from '~/shared/filters/http-exception.filter';

export type Params = Record<string, unknown>;

const getParams = async (api: ApiClient, chartId: number): Promise<Params> => (await api.getChart(chartId)).params;

/**
 * Lectura del gráfico
 * Configuración guardada contra la que se revisa un paso, más título y descripción que Superset guarda aparte.
 */
export const readChart = async (api: ApiClient, chartId: number): Promise<Params> => {
  const chart = await api.getChart(chartId);
  return { ...chart.params, viz_type: chart.vizType || chart.params['viz_type'], slice_name: chart.sliceName, description: chart.description };
};

export interface ChartSnapshot {
  chartId: number;
  params: Params;
  sliceName: string;
  description: string | null;
}

export const snapshotChart = async (api: ApiClient, chartId: number): Promise<ChartSnapshot> => {
  const chart = await api.getChart(chartId);
  return { chartId, params: chart.params, sliceName: chart.sliceName, description: chart.description };
};

/**
 * Restauración del gráfico
 * Guarda el gráfico tal como estaba, sin su query context, que Superset reconstruye desde la configuración.
 */
export const restoreChart = async (api: ApiClient, snapshot: ChartSnapshot): Promise<void> =>
  api.updateChart(snapshot.chartId, {
    params: snapshot.params,
    sliceName: snapshot.sliceName,
    description: snapshot.description ?? '',
    resetQueryContext: true,
  });

export type Damage = Params | ((params: Params) => Params);

/**
 * Daño del gráfico
 * Guarda 'damage' sobre la configuración del gráfico, sin query context para que el gráfico muestre también el daño.
 */
export const damageChart = async (api: ApiClient, chartId: number, damage: Damage): Promise<Params> => {
  const params = await getParams(api, chartId);
  const keys = typeof damage === 'function' ? damage(params) : damage;
  await api.updateChart(chartId, { params: { ...params, ...keys }, resetQueryContext: true });
  return keys;
};

export const isOnDashboard = async (api: ApiClient, chartId: number, dashboardId: number): Promise<boolean> =>
  (await api.getChart(chartId)).dashboardIds.includes(dashboardId);

export const chartExists = async (api: ApiClient, chartId: number): Promise<boolean> => {
  try {
    await api.getChart(chartId);
    return true;
  } catch (error) {
    if (isDomainError(error) && error.code === DomainErrorCodes.NOT_FOUND_ERROR) return false;
    throw error;
  }
};

export interface CleanupScope {
  dashboards: number[];
  keep: ReadonlySet<number>;
}

/**
 * Borrado de gráficos creados
 * Borra los gráficos creados en la corrida, primero quitándolos de sus dashboards, nunca los de 'keep'; devuelve 'removed' y 'left'.
 */
export const removeCharts = async (
  api: ApiClient,
  chartIds: number[],
  { dashboards, keep }: CleanupScope
): Promise<{ removed: number[]; left: number[] }> => {
  const removed: number[] = [];
  const left: number[] = [];
  for (const chartId of chartIds) {
    if (keep.has(chartId)) continue;
    try {
      if (!(await chartExists(api, chartId))) continue;
      const { dashboardIds } = await api.getChart(chartId);
      for (const dashboardId of dashboardIds.filter((id) => dashboards.includes(id))) await api.removeChartFromDashboard(dashboardId, chartId);
      await api.deleteChart(chartId);
      removed.push(chartId);
    } catch {
      left.push(chartId);
    }
  }
  return { removed, left };
};
