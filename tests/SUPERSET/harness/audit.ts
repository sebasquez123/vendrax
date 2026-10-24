import { EDITABLE_CONTROLS, familyOf } from '~/modules/tools/infrastructure/tools/superset/update/guards/editable_controls';
import { BASE_CHARTS } from '../fixtures';
import type { AskStep, Circuit, Group } from './circuit';
import { keysOf, Matcher } from './checks';

export const CREATION_KEYS = new Set([
  'viz_type',
  'metric',
  'metrics',
  'x_axis',
  'groupby',
  'all_columns',
  'adhoc_filters',
  'time_grain_sqla',
  'row_limit',
  'orientation',
  'stack',
  'donut',
  'slice_name',
]);

const ALWAYS_EDITABLE = new Set(['slice_name', 'description']);

const KNOWN_VIZ = [
  'echarts_timeseries_line',
  'echarts_timeseries_bar',
  'echarts_area',
  'echarts_timeseries_scatter',
  'table',
  'ag-grid-table',
  'pie',
  'big_number',
  'big_number_total',
  'handlebars',
  'pivot_table_v2',
  'heatmap_v2',
  'mixed_timeseries',
  'funnel',
];

/**
 * Tipo de gráfico del circuito
 * Devuelve el tipo del gráfico base del circuito o el que pide su creación.
 */
const vizTypeOf = (circuit: Circuit): string | undefined => {
  if (circuit.base) return BASE_CHARTS[circuit.base].vizType;
  const creation = circuit.steps.find((step): step is AskStep => step.kind === 'ask' && step.outcome === 'created');
  const expected = creation?.changes?.['viz_type'] ?? creation?.observe?.['viz_type'];
  if (typeof expected === 'string') return expected;
  return expected instanceof Matcher ? KNOWN_VIZ.find((vizType) => expected.test(vizType)) : undefined;
};

export interface AuditFinding {
  circuit: string;
  step: string;
  detail: string;
}

/**
 * Cambio esperado sin respaldo
 * Indica por qué una expectativa de cambio no tiene respaldo en el guard, o nada si lo tiene.
 */
const unbackedChange = (key: string, expected: unknown, vizType: string | undefined): string | undefined => {
  if (ALWAYS_EDITABLE.has(key)) return undefined;
  const family = vizType ? familyOf(vizType) : undefined;
  const control = family ? EDITABLE_CONTROLS[family]?.[key] : undefined;
  if (!control) return `el guard no lista '${key}' para ${vizType ?? 'este tipo'}`;
  if (control.vizTypes && vizType && !control.vizTypes.includes(vizType)) return `el guard solo admite '${key}' en ${control.vizTypes.join(', ')}`;
  if (expected instanceof Matcher) return undefined;
  if (control.values && !control.values.some((value) => JSON.stringify(value) === JSON.stringify(expected)))
    return `el guard no acepta ${JSON.stringify(expected)} en '${key}'`;
  if (control.range && typeof expected === 'number' && (expected < control.range[0] || expected > control.range[1]))
    return `el guard acepta '${key}' entre ${control.range[0]} y ${control.range[1]}`;
  return undefined;
};

/**
 * Imposibilidad no certera
 * Indica por qué la imposibilidad del paso no es cierta porque el guard la permite, o nada.
 */
const allowedAfterAll = ({ key, value }: { key: string; value?: unknown }, vizType: string | undefined): string | undefined => {
  const family = vizType ? familyOf(vizType) : undefined;
  const control = family ? EDITABLE_CONTROLS[family]?.[key] : undefined;
  if (!control) return undefined;
  if (value === undefined) return `el guard sí permite '${key}'`;
  return control.values?.some((allowed) => JSON.stringify(allowed) === JSON.stringify(value))
    ? `el guard sí acepta ${JSON.stringify(value)} en '${key}'`
    : undefined;
};

/**
 * Auditoría de grupos
 * Revisa cada paso de los grupos; mueve lo sin respaldo a 'observe' o lo marca como 'uncertain'.
 */
export const auditGroups = (groups: Group[]): AuditFinding[] => {
  const findings: AuditFinding[] = [];
  for (const circuit of groups.flatMap((group) => group.circuits)) {
    const vizType = vizTypeOf(circuit);
    for (const step of circuit.steps) {
      if (step.kind !== 'ask') continue;
      const where = { circuit: circuit.id, step: step.label };

      if ((step.outcome === 'created' || step.outcome === 'applied') && step.changes) {
        for (const [key, expected] of Object.entries(step.changes)) {
          const reasons = keysOf(key).map((one) =>
            step.outcome === 'created'
              ? CREATION_KEYS.has(one)
                ? undefined
                : `la creación por el MCP no fija '${one}' con certeza`
              : unbackedChange(one, expected, vizType)
          );
          const reason = reasons.every(Boolean) ? reasons[0] : undefined;
          if (!reason) continue;
          delete step.changes[key];
          step.observe = { ...step.observe, [key]: expected };
          findings.push({ ...where, detail: `${reason}: pasa a observación` });
        }
      }

      if (step.unsupported) {
        const reason = allowedAfterAll(step.unsupported, vizType);
        if (reason) {
          step.uncertain = `${reason}; el caso supone que no se puede`;
          findings.push({ ...where, detail: `${reason}: el paso no cuenta en la confiabilidad hasta corregir el caso` });
        }
      }
    }
  }
  return findings;
};
