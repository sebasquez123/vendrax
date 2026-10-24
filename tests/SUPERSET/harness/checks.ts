import { isDeepStrictEqual } from 'node:util';
import { defaultOf, EDITABLE_CONTROLS, familyOf } from '~/modules/tools/infrastructure/tools/superset/update/guards/editable_controls';
import { clipMiddle, show } from '../../core/report';
import type { Turn } from '../../core/types';
import type { Params } from './superset';

export interface NamesUsed {
  metrics: string[];
  columns: string[];
}

export class Matcher {
  constructor(
    readonly describe: string,
    readonly test: (value: unknown) => boolean,
    readonly names: Partial<NamesUsed> = {}
  ) {}
}

/**
 * Nombre de elemento guardado
 * Nombre de un elemento guardado: texto simple o etiqueta de una métrica o columna ad hoc.
 */
const itemName = (item: unknown): string | undefined => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return undefined;
  const object = item as Record<string, unknown>;
  const column = object['column'] as Record<string, unknown> | undefined;
  return [object['label'], object['metric_name'], object['column_name'], column?.['column_name']].find(
    (value): value is string => typeof value === 'string'
  );
};

const namesIn = (value: unknown): string[] => (Array.isArray(value) ? value.flatMap((item) => itemName(item) ?? []) : []);

const recordsIn = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];

/**
 * Lista con métricas indicadas
 * Lista de métricas que incluye estas, y posiblemente otras.
 */
export const hasMetric = (...names: string[]): Matcher =>
  new Matcher(`incluye ${names.join(' y ')}`, (value) => names.every((name) => namesIn(value).includes(name)), { metrics: names });

/**
 * Métrica única
 * Una sola métrica (número grande, torta, ordenar por), dada por nombre o como objeto.
 */
export const metric = (name: string): Matcher => new Matcher(name, (value) => itemName(value) === name, { metrics: [name] });

/**
 * Lista exacta de columnas
 * Lista con exactamente estas columnas, en cualquier orden.
 */
export const columns = (...names: string[]): Matcher =>
  new Matcher(
    `[${names.join(', ')}]`,
    (value) => {
      const saved = namesIn(value);
      return saved.length === names.length && names.every((name) => saved.includes(name));
    },
    { columns: names }
  );

/**
 * Cualquiera de varios valores
 * Acepta cualquiera de estos valores cuando la petición admite varios, por ejemplo 'percent' o 'key_percent'.
 */
export const oneOf = (...values: unknown[]): Matcher =>
  new Matcher(`uno de ${values.map((value) => show(value, 30)).join(' | ')}`, (value) =>
    values.some((candidate) => isDeepStrictEqual(candidate, value))
  );

/**
 * Texto que cumple patrón
 * Texto que coincide con 'pattern' (un formato, un estilo), descrito con palabras.
 */
export const matching = (pattern: RegExp, describe: string): Matcher =>
  new Matcher(describe, (value) => typeof value === 'string' && pattern.test(value));

/**
 * Número mayor que límite
 * Número mayor que 'limit', para peticiones de agrandar.
 */
export const above = (limit: number): Matcher => new Matcher(`mayor que ${limit}`, (value) => typeof value === 'number' && value > limit);

/**
 * Número menor que límite
 * Número menor que 'limit', para peticiones de achicar.
 */
export const below = (limit: number): Matcher => new Matcher(`menor que ${limit}`, (value) => typeof value === 'number' && value < limit);

/**
 * Todos los matchers a la vez
 * Cumple todos estos matchers a la vez, por ejemplo un rango de fechas que conservó el filtro SQL.
 */
export const allOf = (...matchers: Matcher[]): Matcher =>
  new Matcher(matchers.map((matcher) => matcher.describe).join(' y '), (value) => matchers.every((matcher) => matcher.test(value)), {
    metrics: matchers.flatMap((matcher) => matcher.names.metrics ?? []),
    columns: matchers.flatMap((matcher) => matcher.names.columns ?? []),
  });

/**
 * Título con sufijo esperado
 * Título que termina con este texto, pues el agente agrega el prefijo '[METBOT - <dominio>]'.
 */
export const titled = (title: string): Matcher =>
  new Matcher(`termina en "${title}"`, (value) => typeof value === 'string' && value.trim().endsWith(title));

/**
 * Sin filtros sobre columna
 * Filtros ('adhoc_filters') que no incluyen ninguno sobre esta columna.
 */
export const noFilterOn = (column: string): Matcher =>
  new Matcher(`sin filtros sobre ${column}`, (value) => !recordsIn(value).some((filter) => filter['subject'] === column), {
    columns: [column],
  });

/**
 * Rango de fechas sobre columna
 * Filtros 'adhoc_filters' con rango de fechas sobre la columna, distinto de 'No filter' y de 'replaced'.
 */
export const timeRangeOn = (column: string, replaced?: string): Matcher =>
  new Matcher(
    `un rango de fechas sobre ${column}${replaced ? ` distinto de "${replaced}"` : ''}`,
    (value) =>
      recordsIn(value).some(
        (filter) =>
          filter['subject'] === column &&
          filter['operator'] === 'TEMPORAL_RANGE' &&
          typeof filter['comparator'] === 'string' &&
          filter['comparator'] !== 'No filter' &&
          filter['comparator'] !== replaced
      ),
    { columns: [column] }
  );

/**
 * Cualquier rango de fechas
 * Filtros 'adhoc_filters' con un rango de fechas sobre cualquier columna, distinto de 'No filter'.
 */
export const anyTimeRange = (): Matcher =>
  new Matcher('un rango de fechas', (value) =>
    recordsIn(value).some(
      (filter) => filter['operator'] === 'TEMPORAL_RANGE' && typeof filter['comparator'] === 'string' && filter['comparator'] !== 'No filter'
    )
  );

/**
 * Filtro que conserva valores
 * Filtros 'adhoc_filters' que dejan solo estos valores de una columna: 'IN' exacto o '==' (o '=') con uno.
 */
export const keepsOnly = (column: string, ...values: string[]): Matcher => {
  const expected = [...values].sort();
  return new Matcher(
    `un filtro que deja solo ${column} en [${values.join(', ')}]`,
    (value) =>
      recordsIn(value).some((filter) => {
        if (filter['subject'] !== column) return false;
        const comparator = filter['comparator'];
        if (filter['operator'] === 'IN' && Array.isArray(comparator)) return isDeepStrictEqual([...comparator].map(String).sort(), expected);
        return (filter['operator'] === '==' || filter['operator'] === '=') && expected.length === 1 && comparator === expected[0];
      }),
    { columns: [column] }
  );
};

/**
 * Filtro SQL conservado
 * Filtros 'adhoc_filters' que aún conservan este filtro SQL, tal como estaba.
 */
export const hasSqlFilter = (sqlExpression: string): Matcher =>
  new Matcher(`conserva el filtro SQL "${sqlExpression}"`, (value) =>
    recordsIn(value).some((filter) => filter['expressionType'] === 'SQL' && filter['sqlExpression'] === sqlExpression)
  );

/**
 * Orden de tabla cruda
 * Orden de tabla cruda ('order_by_cols') que empieza por esta columna, en esa dirección o en cualquiera si se omite 'ascending'.
 */
export const sortedBy = (column: string, ascending?: boolean): Matcher => {
  const parse = (item: unknown): unknown[] | undefined => {
    try {
      const parsed: unknown = typeof item === 'string' ? JSON.parse(item) : undefined;
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
  const direction = ascending === undefined ? '' : ascending ? ', ascendente' : ', descendente';
  return new Matcher(
    `ordenada primero por ${column}${direction}`,
    (value) => {
      const first = Array.isArray(value) ? parse(value[0]) : undefined;
      return first?.[0] === column && (ascending === undefined || first[1] === ascending);
    },
    { columns: [column] }
  );
};

/**
 * Regla de formato condicional
 * Formato condicional ('conditional_formatting') con una regla que tiene estos campos, y posiblemente otros.
 */
export const formattingRule = (rule: Record<string, unknown>): Matcher =>
  new Matcher(`una regla ${show(rule, 100)}`, (value) =>
    recordsIn(value).some((saved) => Object.entries(rule).every(([key, field]) => isDeepStrictEqual(saved[key], field)))
  );

const matches = (expected: unknown, saved: unknown): boolean =>
  expected instanceof Matcher ? expected.test(saved) : isDeepStrictEqual(expected, saved);

const describeExpected = (expected: unknown): string => (expected instanceof Matcher ? expected.describe : show(expected));

const METRIC_KEYS = ['metric', 'metrics', 'percent_metrics', 'timeseries_limit_metric'];
const COLUMN_KEYS = ['x_axis', 'groupby', 'all_columns', 'columns', 'groupbyRows', 'groupbyColumns'];

/**
 * Nombres de dataset usados
 * Nombres de dataset requeridos por un paso: los de sus Matchers y los nombres en claves de métrica o columna.
 */
export const namesUsed = (expectations: Record<string, unknown> = {}): NamesUsed => {
  const used: NamesUsed = { metrics: [], columns: [] };
  for (const [key, expected] of Object.entries(expectations)) {
    if (expected instanceof Matcher) {
      used.metrics.push(...(expected.names.metrics ?? []));
      used.columns.push(...(expected.names.columns ?? []));
      continue;
    }
    const names = (Array.isArray(expected) ? expected : [expected]).filter((name): name is string => typeof name === 'string');
    if (keysOf(key).some((one) => METRIC_KEYS.includes(one))) used.metrics.push(...names);
    else if (keysOf(key).some((one) => COLUMN_KEYS.includes(one))) used.columns.push(...names);
  }
  return used;
};

export { clipMiddle, show };

/**
 * Valor mostrado de una clave
 * Valor guardado de la clave o, si nunca se guardó, el 'byDefault' de Superset para ese tipo de gráfico.
 */
const shownValue = (key: string, params: Params): { value: unknown; byDefault: boolean } => {
  if (params[key] !== undefined) return { value: params[key], byDefault: false };
  const vizType = String(params['viz_type'] ?? '');
  const control = EDITABLE_CONTROLS[familyOf(vizType) ?? '']?.[key];
  const known = control ? defaultOf(control, vizType) : { found: false as const };
  return known.found ? { value: known.value, byDefault: true } : { value: undefined, byDefault: false };
};

/**
 * Expectativas no cumplidas
 * Expectativas que el gráfico no cumple; una clave 'a|b' se cumple con cualquiera de las dos claves.
 */
export const unmet = (expectations: Record<string, unknown>, params: Params): string[] =>
  Object.entries(expectations).flatMap(([key, expected]) => {
    const shown = keysOf(key).map((one) => ({ key: one, ...shownValue(one, params) }));
    if (shown.some((candidate) => matches(expected, candidate.value))) return [];
    const saved = shown.map((candidate) => `${candidate.key} = ${show(candidate.value, 60)}${candidate.byDefault ? ' (por defecto)' : ''}`);
    return [`${saved.join(' · ')}, se esperaba ${describeExpected(expected)}`];
  });

/**
 * Claves de una expectativa
 * Devuelve las claves que nombra una expectativa: 'a|b' nombra dos.
 */
export const keysOf = (key: string): string[] => key.split('|');

/**
 * Claves cambiadas
 * Claves cuyo valor guardado cambió entre el antes y el después.
 */
export const changedKeys = (before: Params, after: Params): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => !isDeepStrictEqual(before[key], after[key]));

/**
 * Escritura del valor por defecto
 * Clave guardada por primera vez con el 'byDefault' de Superset: el gráfico se ve igual, pues ya usaba ese valor.
 */
export const isDefaultWrite = (key: string, before: Params, after: Params): boolean => {
  if (before[key] !== undefined || after[key] === undefined) return false;
  const vizType = String(after['viz_type'] ?? before['viz_type'] ?? '');
  const control = EDITABLE_CONTROLS[familyOf(vizType) ?? '']?.[key];
  const known = control ? defaultOf(control, vizType) : { found: false as const };
  return known.found && isDeepStrictEqual(known.value, after[key]);
};

/**
 * Cambios visibles
 * Claves que cambiaron lo que muestra el gráfico: todas las cambiadas salvo las primeras escrituras del valor por defecto.
 */
export const visibleChanges = (before: Params, after: Params): string[] =>
  changedKeys(before, after).filter((key) => !isDefaultWrite(key, before, after));

export const diffLines = (before: Params, after: Params): string[] =>
  changedKeys(before, after).map(
    (key) =>
      `${key}: ${show(before[key], 60)} → ${show(after[key], 60)}${isDefaultWrite(key, before, after) ? ' (el valor por defecto de Superset: no cambia lo que se ve)' : ''}`
  );

const WRITE_ACTIONS = ['generate_chart', 'add_chart_to_existing_dashboard', 'update_chart', 'delete_chart', 'update_dashboard'];

export const writesIn = (turn: Turn): Turn['events'] => turn.events.filter((event) => WRITE_ACTIONS.includes(event.action));

export const eventsOf = (turn: Turn, action: string): Record<string, unknown>[] =>
  turn.events.filter((event) => event.action === action).map((event) => event.object);

/**
 * Identificador de evento
 * Id de gráfico o dashboard como lo traen los eventos: un número, a veces como texto.
 */
export const idOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;
