import type { ApiClient } from '~/modules/api/application/interfaces/port.interface';
import { LoggerService } from '~/shared/logging/main.logger';
import { renameOldNames } from '../update/guards/form_data.guard';
import type { SavedData, FormData, Filter } from './interfaces/fix_compatible_names';

const logger = new LoggerService('AfterMcpSave');
const filterInWords = (filter: Filter): string => {
  if (filter.expressionType === 'SQL') return `custom SQL: ${String(filter.sqlExpression)}`;
  if (filter.operator === 'TEMPORAL_RANGE')
    return `${String(filter.subject)}: ${filter.comparator === 'No filter' ? 'every date (no range)' : `range ${String(filter.comparator)}`}`;
  const comparator = Array.isArray(filter.comparator) ? filter.comparator.join(', ') : String(filter.comparator);
  return `${String(filter.subject)} ${String(filter.operator)} ${comparator}`;
};

const nameOf = (entry: unknown): string =>
  typeof entry === 'string' ? entry : `custom SQL '${String((entry as { label?: unknown } | null)?.label ?? 'unnamed')}'`;

const namesOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value]).map(nameOf);

export const fixCompatibleNames = async (Api: ApiClient | undefined, chartId: number | null | undefined): Promise<SavedData | undefined> => {
  if (!Api || !chartId) return undefined;
  const chart = await Api.getChart(chartId).catch(() => undefined);
  if (!chart) return undefined;
  const { params, renamed } = renameOldNames({ ...chart.params, viz_type: chart.vizType });
  if (renamed.length)
    await Api.updateChart(chartId, { params, resetQueryContext: false }).catch((error: unknown) =>
      logger.warn(`Chart ${chartId} keeps the MCP's old names (${renamed.join(', ')}): ${error instanceof Error ? error.message : String(error)}`)
    );
  return describeSavedData(params);
};

/**
 * Descripción de datos guardados
 * Se usa en 'generate_chart' y 'update_chart' (reconstrucción con 'config'); un cambio parcial reporta su propio 'changed'.
 */

export const describeSavedData = (formData: FormData): SavedData => {
  const grouped = namesOf(formData['groupby']);
  const columns = namesOf(formData['all_columns']);
  const filters = (Array.isArray(formData['adhoc_filters']) ? (formData['adhoc_filters'] as Filter[]) : []).map(filterInWords);
  return {
    metrics: namesOf(formData['metrics'] ?? formData['metric']),
    ...(formData['x_axis'] !== undefined && formData['x_axis'] !== null && { x_axis: nameOf(formData['x_axis']) }),
    ...(grouped.length && { grouped_by: grouped }),
    ...(columns.length && { columns }),
    ...(typeof formData['time_grain_sqla'] === 'string' && { time_grain: formData['time_grain_sqla'] }),
    filters: filters.length ? filters : 'none',
  };
};
