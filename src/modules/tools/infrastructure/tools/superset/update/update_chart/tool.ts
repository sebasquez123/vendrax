import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  type ChartChangeValue,
  UpdateChartOutputSchema,
  UpdateChartContentSchema,
  UpdateChartInputSchema,
  UpdateChartInputType,
  UpdateChartOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, update_chart_catalog } from './catalogs';
import { assessSavedChart, checkChanges, DatasetNames, describeLosses, neededContext } from '../guards/form_data.guard';
import { withDomainPrefix } from '../../shared/domain_prefix';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { explainApiError } from '../../shared/failure_controls';
import { fixCompatibleNames } from '../../shared/fix_compatible_names';

type FormData = Record<string, unknown>;
type CustomEvent = (eventData: any, eventType: string, toolName: string, source: string) => void;

export const update_chart = ({ params, onCustomEvent, callback, ApiService }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient, domain, selected_dashboard_id } = params;

  const instruct = domain;

  const real_tool_Name = 'update_chart';
  const toolName = 'call_tool';

  const run_update = (request: Record<string, unknown>, mapResponse: (result: UpdateChartOutputType) => unknown): Promise<unknown> =>
    callback({
      args: request,
      serverName: body.serverName,
      toolName,
      langChainClient,
      toolResponseConfig: { schema: UpdateChartOutputSchema, mapResponse },
    });
  const save = (args: UpdateChartInputType) => run_update(update_chart_args(args, instruct), (result) => mapResponse(result, onCustomEvent));

  const noSave = (reason: string) => `NOT UPDATED: ${reason} Tell the user plainly; never report the change as applied.`;

  const parseFormData = (result: UpdateChartOutputType): FormData | null => {
    try {
      return JSON.parse(result.content[0]?.text ?? '')?.form_data ?? null;
    } catch {
      return null;
    }
  };
  const parseDatasetNames = (result: UpdateChartOutputType): DatasetNames | null => {
    try {
      const dataset = JSON.parse(result.content[0]?.text ?? '') as {
        columns?: { column_name?: string; is_dttm?: boolean | null }[];
        metrics?: { metric_name?: string }[];
      };
      if (!dataset.columns) return null;
      return {
        columns: dataset.columns.map((column) => column.column_name ?? '').filter(Boolean),
        metrics: (dataset.metrics ?? []).map((metric) => metric.metric_name ?? '').filter(Boolean),
        dateColumns: dataset.columns.filter((column) => column.is_dttm).map((column) => column.column_name ?? ''),
      };
    } catch {
      return null;
    }
  };
  const update_chart_args = (args: UpdateChartInputType, instructs: { contain: string } | undefined) => {
    const { chart_id, chart_name, config } = args;
    return {
      name: 'update_chart',
      arguments: {
        request: {
          identifier: chart_id,
          generate_preview: false,
          ...(config && { config }),
          ...(chart_name && { chart_name: withDomainPrefix(chart_name, instructs) }),
        },
      },
    };
  };

  return tool(
    async (args: UpdateChartInputType) => {
      /**- 1. SOLO RENOMBRAR: el MCP guarda el título */
      if (!args.config && !args.changes?.length && args.description === undefined) return save(args);

      /**- 2. CAMBIO DE TIPO: reconstruir con 'config' */
      if (args.config) {
        const savedFormData = await run_update({ name: 'get_chart_info', arguments: { request: { identifier: args.chart_id } } }, parseFormData);
        if (!savedFormData || typeof savedFormData !== 'object')
          return noSave(
            `the current configuration of chart ${args.chart_id} could not be read, so the update could not be checked for losses. Retry.`
          );
        const assessment = assessSavedChart(savedFormData as FormData);
        if (assessment.kind === 'unsupported_type')
          return noSave(
            `'${assessment.vizType}' charts cannot be rebuilt as another chart type from here (only xy, table, pie, big_number and handlebars can). Their settings can still change with 'changes' when '_update_support' lists them; a new type has to be made in the dashboard manager.`
          );
        if (assessment.kind === 'not_reproducible')
          return noSave(
            `rebuilding it would reset settings this tool cannot rebuild (${describeLosses(assessment)}). The change has to be made directly in the dashboard manager.`
          );
        /**- 2.1. TRAS GUARDAR EL MCP: normalizar nombres y describir */
        const rebuilt = await save(args);
        if (!rebuilt || typeof rebuilt !== 'object') return rebuilt;
        const savedData = await fixCompatibleNames(ApiService, args.chart_id);
        return savedData ? { saved_data: savedData, ...rebuilt } : rebuilt;
      }

      /**- 3. CAMBIO PARCIAL: guardado por la API REST */
      if (!ApiService) return noSave('changing part of a chart is not available');
      const changes = parseChanges(args.changes ?? []);
      try {
        /**- 3.1. LEER: la configuración guardada exacta */
        const chart = await ApiService.getChart(args.chart_id);
        const saved = { ...chart.params, viz_type: chart.vizType };

        /**- 3.2. CONTEXTO: leer solo lo necesario */
        const datasetId = chart.datasetId ?? undefined;
        const needs = neededContext(saved, changes);
        const dataset =
          datasetId && needs.dataset
            ? await run_update({ name: 'get_dataset_info', arguments: { request: { identifier: datasetId } } }, parseDatasetNames)
            : undefined;
        const onSelectedDashboard = selected_dashboard_id !== undefined && chart.dashboardIds.includes(selected_dashboard_id);
        const dashboard = needs.dashboard && onSelectedDashboard ? await ApiService.getDashboard(selected_dashboard_id) : undefined;

        /**- 3.3. VALIDAR: claves, valores y nombres */
        const settingsChange = Object.keys(changes).length > 0;
        const check = settingsChange
          ? checkChanges(saved, changes, {
              dataset: dataset && typeof dataset === 'object' ? (dataset as DatasetNames) : undefined,
              dashboardColorScheme: dashboard?.colorScheme,
            })
          : undefined;
        if (check && !check.ok) return noSave(check.reason);

        /**- 3.4. GUARDAR: solo lo que cambió */
        const sliceName = args.chart_name ? withDomainPrefix(args.chart_name, instruct) : undefined;
        await ApiService.updateChart(args.chart_id, {
          ...(check?.ok && { params: check.params, resetQueryContext: check.resetsData }),
          sliceName,
          description: args.description,
        });

        /**- 3.5. INFORMAR: antes y después del cambio */
        onCustomEvent?.(
          {
            chart_name: sliceName ?? chart.sliceName,
            viz_type: chart.vizType,
            chart_id: chart.id,
            dataset_id: datasetId,
          },
          'rendering',
          'update_chart',
          'SuperSet'
        );
        return {
          updated: true,
          chart: { id: chart.id, name: sliceName ?? chart.sliceName },
          changed: {
            ...(check?.ok && check.changed),
            ...(sliceName && { title: { before: chart.sliceName, after: sliceName } }),
            ...(args.description !== undefined && { description: { before: chart.description, after: args.description } }),
          },
        };
      } catch (error) {
        return noSave(explainApiError(error, NOT_OWNER));
      }
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Change a saved chart; the change is saved on the chart. Read it with 'get_chart_info' first: its '_update_support' says what can change on that chart.
      - A change within the same chart type: 'changes', one entry per form_data key that changes, with its complete new value (e.g. removing a column = 'groupby' without it; adding a filter = 'adhoc_filters' with every filter the user did not ask to remove, plus the new one). Every other saved setting stays as it is.
      - New title or description: 'chart_name' / 'description'.
      - Another chart type: 'config' with the whole new chart, only when '_update_support' says it is possible (a form_data metric string is { name, saved_metric: true }). Describe the rebuilt chart from the 'saved_data' of the result, never from what you sent.
      A result starting with 'NOT UPDATED' says why nothing changed: relay it, never retry the same call. The interface refreshes the dashboard view by itself after a saved update. Do not use it to create a chart or to alter dashboard layout.
      `,
      schema: UpdateChartInputSchema,
      responseFormat: 'content',
    }
  );
};

const parseChanges = (changes: { key: string; value: ChartChangeValue }[]): FormData => {
  const parsed: FormData = {};
  for (const { key, value } of changes) parsed[key] = typeof value === 'string' ? parseValue(value) : value;
  return parsed;
};

const parseValue = (text: string): unknown => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return text;
  }
  if (typeof value === 'string' && /^\s*"/.test(value)) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
};

const NOT_OWNER = 'this chart belongs to other users, so it cannot be changed from here; its owners can change it in the dashboard manager.';

const mapResponse = (result: UpdateChartOutputType, onCustomEvent?: CustomEvent) => {
  const text = result.content[0]?.text;
  if (!text) return 'Error reaching update_chart tool';
  if (text.toLowerCase().includes('not_found')) return text + ' User may not have permissions to access the requested resource.';

  const output = UpdateChartContentSchema.safeParse(JSON.parse(text));
  if (!output.success) return `Error: ${formatZodErrorMessages(output)}`;
  if (output.data.success === false || output.data.error) return `Error: chart was not updated. ${JSON.stringify(output.data.error)}`;

  const update = { ...output.data, _semantics: { catalog: collectSemantics(output.data, activeFields, update_chart_catalog) } };
  onCustomEvent?.(
    {
      chart_name: update.chart?.slice_name,
      viz_type: update.chart?.viz_type,
      chart_id: update.chart?.id,
      dataset_id: update.chart?.datasource_name,
    },
    'rendering',
    'update_chart',
    'SuperSet'
  );
  return update;
};

export default { func: update_chart, name: 'update_chart' };
