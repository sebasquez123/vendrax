import type { StructuredToolInterface } from '@langchain/core/tools';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import type { DatasetInfo, DatasetListing } from '~/knowledge/SUPERSET/general/06_preload_data_catalog/interfaces';
import { LangchainMCPClient } from '~/modules/mcp_client/infrastructure';
import type { VariableCheck } from '../../core/types';
import { BASE_CHARTS, BASE_DATASET, type BaseChartKind, baseChartName } from '../fixtures';
import type { NamesUsed } from './checks';
import { namesUsed } from './checks';
import type { Circuit } from './circuit';
import type { SupersetRuntime } from './runtime';

const DASHBOARD_VARIABLE = 'SUPERSET_TEST_DASHBOARD_ID';
export const BASE_DASHBOARD_VARIABLE = 'SUPERSET_TEST_BASE_DASHBOARD_ID';

export interface Settings {
  dashboardId: number;
  baseDashboardId?: number;
}

const readId = (variable: string, required: boolean, what: string): { check: VariableCheck; id?: number } => {
  const raw = process.env[variable]?.trim();
  const id = Number(raw);
  if (!raw) return { check: required ? { variable, state: 'missing' } : { variable, state: 'unset', note: `opcional: sin ella se omiten ${what}` } };
  if (!Number.isInteger(id) || id <= 0) return { check: { variable, state: 'invalid', note: `debe ser el id (número) del ${what}` } };
  return { check: { variable, state: 'set' }, id };
};

/**
 * Lectura de ajustes
 * Devuelve cada ajuste del servicio verificado; 'settings' solo si los requeridos se pueden usar.
 */
export const readSettings = (): { variables: VariableCheck[]; settings?: Settings } => {
  const sandbox = readId(DASHBOARD_VARIABLE, true, 'dashboard sandbox');
  const base = readId(BASE_DASHBOARD_VARIABLE, false, 'los circuitos sobre gráficos que crea el desarrollador');
  const variables = [sandbox.check, base.check];
  const usable = variables.every((check) => check.state === 'set' || check.state === 'unset');
  return { variables, ...(usable && sandbox.id && { settings: { dashboardId: sandbox.id, ...(base.id && { baseDashboardId: base.id }) } }) };
};

export interface Sandbox {
  datasetIds: Map<string, number>;
}

/**
 * Nombres requeridos por dataset
 * Métricas y columnas que cada dataset debe tener según los checks de los circuitos, en el dataset del circuito.
 */
const requiredNames = (circuits: Circuit[]): Map<string, NamesUsed> => {
  const required = new Map<string, NamesUsed>();
  const add = (dataset: string, names: NamesUsed) => {
    const entry = required.get(dataset) ?? { metrics: [], columns: [] };
    entry.metrics.push(...names.metrics);
    entry.columns.push(...names.columns);
    required.set(dataset, entry);
  };
  for (const circuit of circuits) {
    const own = new Set(
      circuit.steps.flatMap((step) => (step.kind === 'prepare' ? (step.production?.sqlMetrics ?? []).map(({ label }) => label) : []))
    );
    for (const step of circuit.steps) {
      if (step.kind === 'prepare' && step.production?.timeRange) add(circuit.dataset, { metrics: [], columns: [step.production.timeRange.column] });
      if (step.kind !== 'ask') continue;
      for (const names of [namesUsed(step.changes), namesUsed(step.observe)])
        add(circuit.dataset, { metrics: names.metrics.filter((name) => !own.has(name)), columns: names.columns });
    }
    if (circuit.base) add(BASE_DATASET, { metrics: [], columns: [] });
  }
  return required;
};

export const checkSandbox = async (runtime: SupersetRuntime, circuits: Circuit[]): Promise<Sandbox> => {
  const { dashboard } = runtime;
  if (!/e2e/i.test(dashboard.title))
    throw new Error(`Dashboard ${dashboard.id} ("${dashboard.title}") is not a sandbox: its title must contain "E2E".`);
  return withTools(runtime, ['list_datasets', 'get_dataset_info'], (tool) => checkNames(tool, requiredNames(circuits)));
};

/**
 * Ejecución con herramientas de lectura
 * Ejecuta 'work' con las herramientas de lectura del agente, sobre un cliente MCP abierto como lo hace ChatService.loadMcps.
 */
const withTools = async <T>(
  runtime: SupersetRuntime,
  names: string[],
  work: (tool: (name: string) => StructuredToolInterface) => Promise<T>
): Promise<T> => {
  const { server } = runtime.superset;
  const token = await runtime.token();
  const mcp = new LangchainMCPClient();
  await mcp.createClient([{ ...server, url: `${server.url}${server.serverAuth.oauthMcpAuth.mcpEndpoint}` }], {
    [server.serverName]: { Authorization: `Bearer ${token}` },
  });
  try {
    const tools = runtime.tools.getToolChain(names, [runtime.superset], mcp, undefined, {}, { [server.serverName]: token });
    return await work((name) => {
      const found = tools.find((candidate) => candidate.name === `${TOOL_PREFIX}${name}`);
      if (!found) throw new Error(`The connection does not grant '${name}', needed by the test's checks.`);
      return found;
    });
  } finally {
    await mcp.closeClient();
  }
};

/**
 * Verificación de nombres de dataset
 * Comprueba que cada dataset exista, sea visible para el usuario y tenga los nombres usados; si no, detiene la corrida.
 */
const checkNames = async (tool: (name: string) => StructuredToolInterface, required: Map<string, NamesUsed>): Promise<Sandbox> => {
  const tableNames = [...required.keys()];
  const listing = (await tool('list_datasets').invoke({
    page: 1,
    page_size: 100,
    filters: [{ col: 'table_name', opr: 'in', value: tableNames }],
  })) as DatasetListing | string;
  const datasetIds = new Map<string, number>();
  const problems: string[] = [];
  for (const tableName of tableNames) {
    const datasetId = typeof listing === 'object' ? listing.datasets?.find((dataset) => dataset.table_name === tableName)?.id : undefined;
    if (!datasetId) {
      problems.push(`dataset ${tableName} was not found or this user cannot see it`);
      continue;
    }
    datasetIds.set(tableName, datasetId);
    const info = (await tool('get_dataset_info').invoke({ dataset_id: datasetId })) as DatasetInfo | string;
    if (typeof info !== 'object') {
      problems.push(`dataset ${tableName} could not be read: ${info}`);
      continue;
    }
    const metrics = new Set((info.metrics ?? []).map((metric) => metric.metric_name));
    const columns = new Set((info.columns ?? []).map((column) => column.column_name));
    const { metrics: usedMetrics, columns: usedColumns } = required.get(tableName)!;
    const missing = [
      ...[...new Set(usedMetrics)].filter((name) => !metrics.has(name)).map((name) => `metric '${name}'`),
      ...[...new Set(usedColumns)].filter((name) => !columns.has(name)).map((name) => `column '${name}'`),
    ];
    if (missing.length) problems.push(`${tableName} has no ${missing.join(', ')}`);
  }
  if (problems.length) throw new Error(`The circuits name data that does not exist: ${problems.join('; ')}.`);
  return { datasetIds };
};

export interface BaseCharts {
  dashboard?: { id: number; title: string };
  charts: Partial<Record<BaseChartKind, { chartId: number } | { missing: string }>>;
}

export const findBaseCharts = async (runtime: SupersetRuntime, sandbox: Sandbox, kinds: BaseChartKind[]): Promise<BaseCharts> => {
  const missingAll = (reason: string): BaseCharts => ({ charts: Object.fromEntries(kinds.map((kind) => [kind, { missing: reason }])) });
  const dashboardId = runtime.baseDashboardId;
  if (!dashboardId) return missingAll(`define ${BASE_DASHBOARD_VARIABLE} con el dashboard de los gráficos base`);

  const api = await runtime.api();
  const saved = await api.getDashboard(dashboardId);
  if (!/e2e/i.test(saved.title)) return missingAll(`el dashboard ${dashboardId} ("${saved.title}") no es un sandbox: su título debe decir "E2E"`);
  if (dashboardId === runtime.dashboard.id) return missingAll(`${BASE_DASHBOARD_VARIABLE} debe ser otro dashboard que el sandbox de los circuitos`);

  const info = await withTools(runtime, ['get_dashboard_info'], (tool) => tool('get_dashboard_info').invoke({ dashboard_id: dashboardId }));
  const charts =
    typeof info === 'object' && info ? ((info as { charts?: { id?: number | null; viz_type?: string | null }[] | null }).charts ?? []) : [];

  const found: BaseCharts['charts'] = {};
  for (const kind of kinds) {
    const spec = BASE_CHARTS[kind];
    const matching = charts.filter((chart) => chart.viz_type === spec.vizType && chart.id);
    if (matching.length !== 1) {
      const lookalike = charts.find((chart) => chart.viz_type && spec.lookalikes?.[chart.viz_type]);
      found[kind] = {
        missing: matching.length
          ? `hay ${matching.length} gráficos de tipo ${spec.vizType} en el dashboard ${dashboardId}; deja uno`
          : lookalike
            ? `el gráfico ${lookalike.id} es ${spec.lookalikes![lookalike.viz_type!]}: crea ${baseChartName(kind)} de tipo ${spec.vizType} en el dashboard ${dashboardId} (tests/SUPERSET/README.md)`
            : `crea ${baseChartName(kind)} en el dashboard ${dashboardId} (tests/SUPERSET/README.md)`,
      };
      continue;
    }
    const chartId = matching[0]!.id!;
    const chart = await api.getChart(chartId);
    found[kind] =
      chart.datasetId && chart.datasetId !== sandbox.datasetIds.get(BASE_DATASET)
        ? { missing: `${baseChartName(kind)} (id ${chartId}) debe usar el dataset ${BASE_DATASET}` }
        : { chartId };
  }
  return { dashboard: { id: saved.id, title: saved.title }, charts: found };
};
