/**
 * Guarda de cambios del gráfico
 * Decide cómo puede cambiarse un gráfico guardado: reconstrucción con 'config', cambio parcial con 'changes' o renombrado de nombres antiguos.
 */
import {
  ChangeContext,
  describeControl,
  EDITABLE_CONTROLS,
  EditableControl,
  EXPRESSIBLE_FILTER_OPERATORS,
  familyOf,
  FILTER_OPERATORS,
  MCP_ALIAS_VALUES,
  MCP_ALIASES,
  queryModeOf,
} from './editable_controls';
import type { DatasetNames } from './editable_controls';

export type { ChangeContext, DatasetNames } from './editable_controls';

type FormData = Record<string, unknown>;

const UNSUPPORTED_TYPE = (vizType: string) =>
  `This chart type ('${vizType}') cannot be changed from here; changes have to be made directly in the dashboard manager.`;

const REPRODUCIBLE_KEYS: Record<string, readonly string[]> = {
  table: ['query_mode', 'all_columns', 'columns', 'groupby', 'metrics', 'include_time', 'order_desc'],
  xy: [
    'metrics',
    'x_axis',
    'groupby',
    'granularity_sqla',
    'time_grain_sqla',
    'x_axis_sort_series_type',
    'x_axis_sort_series_ascending',
    'stack',
    'orientation',
    'x_axis_title',
    'x_axis_format',
    'y_axis_title',
    'y_axis_format',
    'y_axis_scale',
    'show_legend',
    'legend_orientation',
  ],
  pie: [
    'groupby',
    'metric',
    'show_labels',
    'show_legend',
    'label_type',
    'number_format',
    'sort_by_metric',
    'donut',
    'show_total',
    'labels_outside',
    'outerRadius',
    'innerRadius',
  ],
  big_number: ['metric', 'y_axis_format', 'granularity_sqla', 'show_trend_line', 'start_y_axis_at_zero', 'time_grain_sqla'],
  handlebars: ['handlebars_template', 'styleTemplate', 'order_desc', 'query_mode', 'all_columns', 'groupby', 'metrics'],
};

const FIXED_VALUES: Record<string, FormData> = {
  pie: { color_scheme: 'supersetColors', date_format: 'smart_date' },
};

const NEUTRAL_KEYS = [
  'viz_type',
  'row_limit',
  'datasource',
  'slice_id',
  'slice_name',
  'dashboards',
  'extra_form_data',
  'url_params',
  'force',
  'result_format',
  'result_type',
  'standalone',
  'temporal_columns_lookup',
  'queryFields',
];

const COLUMN_LIST_KEYS = ['groupby', 'columns', 'all_columns'];
const METRIC_KEYS = ['metrics', 'metric'];

interface AdhocFilter {
  expressionType?: string;
  operator?: string;
  subject?: string;
  comparator?: unknown;
  sqlExpression?: string | null;
  clause?: string;
}

export type ChartAssessment =
  | { kind: 'reproducible' }
  | { kind: 'unsupported_type'; vizType: string }
  | {
      kind: 'not_reproducible';
      settings: string[];
      expressions: string[];
    };

export const assessSavedChart = (formData: FormData): ChartAssessment => {
  const vizType = String(formData['viz_type'] ?? '');
  const family = familyOf(vizType);
  const reproducible = family ? REPRODUCIBLE_KEYS[family] : undefined;
  if (!family || !reproducible) return { kind: 'unsupported_type', vizType };

  const fixed = FIXED_VALUES[family] ?? {};
  const isReproducible = (key: string) => reproducible.includes(key) || (MCP_ALIASES[key] ?? []).some((old) => reproducible.includes(old));
  const settings: string[] = [];
  const expressions: string[] = [];

  for (const [key, value] of Object.entries(formData)) {
    if (key === 'adhoc_filters' || NEUTRAL_KEYS.includes(key) || isEmpty(value)) continue;
    if (key === 'time_range' && value === 'No filter') continue;
    if (key in fixed) {
      if (value !== fixed[key]) settings.push(key);
      continue;
    }
    if (!isReproducible(key)) settings.push(key);
    else expressions.push(...unexpressibleEntries(key, value));
  }

  expressions.push(...unexpressibleFilters(formData, family));

  return settings.length || expressions.length ? { kind: 'not_reproducible', settings, expressions } : { kind: 'reproducible' };
};

const SETTINGS_SHOWN = 5;

/**
 * Lista de pérdidas por guardado
 * Lista simple de lo que un guardado directo reiniciaría: expresiones una por una y ajustes de visualización contados.
 */
export const describeLosses = ({ settings, expressions }: { settings: string[]; expressions: string[] }): string => {
  const parts = [...expressions];
  if (settings.length) {
    const shown = settings.slice(0, SETTINGS_SHOWN).join(', ');
    parts.push(`${settings.length} display settings (${shown}${settings.length > SETTINGS_SHOWN ? ', …' : ''})`);
  }
  return parts.join('; ');
};

const unexpressibleEntries = (key: string, value: unknown): string[] => {
  const entries = Array.isArray(value) ? value : [value];
  if (METRIC_KEYS.includes(key))
    return entries
      .filter((metric) => typeof metric === 'object' && metric !== null && (metric as { expressionType?: string }).expressionType !== 'SIMPLE')
      .map((metric) => `custom SQL metric '${(metric as { label?: string }).label ?? 'unnamed'}'`);
  if (COLUMN_LIST_KEYS.includes(key) || key === 'x_axis')
    return entries
      .filter((column) => typeof column === 'object' && column !== null)
      .map((column) => `custom SQL column '${(column as { label?: string }).label ?? 'unnamed'}'`);
  return [];
};

const unexpressibleFilters = (formData: FormData, family: string): string[] =>
  asFilters(formData['adhoc_filters'])
    .filter((filter) => !isExpressibleFilter(filter, family, formData['x_axis']))
    .map(describeFilter);

const isExpressibleFilter = (filter: AdhocFilter, family: string, xAxis: unknown): boolean => {
  if (filter.expressionType !== 'SIMPLE') return false;
  if (EXPRESSIBLE_FILTER_OPERATORS.includes(filter.operator ?? '')) return true;
  return family === 'xy' && filter.operator === 'TEMPORAL_RANGE' && filter.subject === xAxis && filter.comparator === 'No filter';
};

const asFilters = (value: unknown): AdhocFilter[] => (Array.isArray(value) ? (value as AdhocFilter[]) : []);
const describeFilter = (filter: AdhocFilter) =>
  filter.expressionType === 'SIMPLE'
    ? `${filter.operator} filter on ${filter.subject} (${JSON.stringify(filter.comparator)})`
    : `custom SQL filter (${filter.sqlExpression})`;

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);

const METRIC_AGGREGATES = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT'];
const TIME_RANGE_FORMS = [
  /^No filter$/,
  /^Last (day|week|month|quarter|year)$/,
  /^previous calendar (week|month|year)$/,
  /^DATEADD\(DATETIME\("now"\), -\d+, (day|week|month|quarter|year)\) : now$/,
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})? : \d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/,
];

const CONTROL_OF_ALIAS: Record<string, string> = Object.fromEntries(
  Object.entries(MCP_ALIASES).flatMap(([control, aliases]) => aliases.map((alias) => [alias, control]))
);

export type ChangeCheck =
  { ok: true; params: FormData; changed: Record<string, { before: unknown; after: unknown }>; resetsData: boolean } | { ok: false; reason: string };

/**
 * Controles editables del gráfico
 * Controles que un cambio parcial puede tocar, según el tipo y, en tablas y tarjetas, el modo de consulta.
 */
const editableControlsOf = (formData: FormData): Record<string, EditableControl> => {
  const vizType = String(formData['viz_type'] ?? '');
  const queryMode = queryModeOf(formData);
  return Object.fromEntries(
    Object.entries(EDITABLE_CONTROLS[familyOf(vizType) ?? ''] ?? {}).filter(
      ([, control]) => (!control.vizTypes || control.vizTypes.includes(vizType)) && (!control.queryMode || control.queryMode === queryMode)
    )
  );
};
const controlsFor = (saved: FormData, changes: FormData) =>
  editableControlsOf(changes['query_mode'] === undefined ? saved : { ...saved, query_mode: changes['query_mode'] });

/**
 * Contexto previo requerido
 * Lo que debe leerse antes de validar los cambios: los nombres del dataset y el dashboard seleccionado.
 */
export const neededContext = (saved: FormData, changes: FormData): { dataset: boolean; dashboard: boolean } => {
  const controls = controlsFor(saved, changes);
  const changed = Object.keys(changes).map((key) => controls[CONTROL_OF_ALIAS[key] ?? key]);
  return {
    dataset: changed.some((control) => control?.names || control?.shownWhen?.needs === 'dataset'),
    dashboard: changed.some((control) => control?.shownWhen?.needs === 'dashboard'),
  };
};

/**
 * Validación de cambios parciales
 * Valida un cambio parcial y arma la configuración a guardar; rechaza con motivo lo que rompería el gráfico.
 */
export const checkChanges = (saved: FormData, changes: FormData, context: ChangeContext = {}): ChangeCheck => {
  const vizType = String(saved['viz_type'] ?? '');
  const { dataset } = context;

  /**- 1. TIPO DE GRÁFICO: solo las familias del mapa */
  const controls = controlsFor(saved, changes);
  if (!Object.keys(controls).length) return { ok: false, reason: UNSUPPORTED_TYPE(vizType) };

  const accepted: FormData = {};
  for (const [sentKey, sent] of Object.entries(changes)) {
    let value: unknown = sent;
    /**- 2. CLAVE EDITABLE: alias antiguos del MCP */
    const key = CONTROL_OF_ALIAS[sentKey] ?? sentKey;
    if (sentKey in MCP_ALIAS_VALUES) value = MCP_ALIAS_VALUES[sentKey]!(value);
    const control = controls[key];
    if (!control) {
      const otherMode = (EDITABLE_CONTROLS[familyOf(vizType) ?? ''] ?? {})[key]?.queryMode;
      if (otherMode && (value === null || (Array.isArray(value) && !value.length))) continue;
      return {
        ok: false,
        reason: otherMode
          ? `'${sentKey}' applies only to ${otherMode === 'aggregate' ? "grouped rows (query_mode 'aggregate')" : "one row per record (query_mode 'raw', columns in 'all_columns')"}, not to this chart's mode; it stays as saved and is not needed. Changeable here: ${Object.keys(controls).join(', ')}.`
          : `'${sentKey}' cannot be changed from here on this chart; it can only be changed in the dashboard manager. Changeable here: ${Object.keys(controls).join(', ')}.`,
      };
    }

    /**- 3. VALOR: opciones y límites */
    if ((control.names || control.validate) && typeof value === 'string' && /^\s*[[{]/.test(value))
      return {
        ok: false,
        reason: `'${key}' is not valid JSON, so nothing was checked: escape every quote inside a text value (e.g. DATETIME(\\"now\\")) and send it again.`,
      };
    value = asChoice(value, control);
    if (control.values && !control.values.includes(value))
      return { ok: false, reason: `'${key}' takes ${control.values.map((v) => JSON.stringify(v)).join(', ')}; got ${JSON.stringify(value)}.` };
    if (control.range && !(typeof value === 'number' && value >= control.range[0] && value <= control.range[1]))
      return { ok: false, reason: `'${key}' takes a number from ${control.range[0]} to ${control.range[1]}; got ${JSON.stringify(value)}.` };

    /**- 4. NOMBRES Y FILTROS: deben existir */
    if (control.names) {
      if (!dataset) return { ok: false, reason: `the dataset of this chart could not be read to check '${key}'. Retry.` };
      const checked = checkNames(control.names, key, value, saved, dataset);
      if (typeof checked === 'string') return { ok: false, reason: checked };
      accepted[key] = checked.value;
      continue;
    }
    accepted[key] = value;
  }

  /**- 5. FUSIONAR: solo las claves enviadas */
  const params: FormData = { ...saved };
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const [key, value] of Object.entries(accepted)) {
    const aliases = MCP_ALIASES[key] ?? [];
    const before = saved[key] ?? aliases.map((alias) => saved[alias]).find((old) => old !== undefined) ?? null;
    aliases.forEach((alias) => delete params[alias]);
    params[key] = value;
    changed[key] = { before, after: value };
  }

  for (const key of Object.keys(accepted)) {
    const control = controls[key]!;
    /**- 6. ESTRUCTURA: validación propia del control */
    const problem = control.validate?.(accepted[key], params);
    if (problem) return { ok: false, reason: problem };

    /**- 7. VISIBLE: el cambio debe notarse */
    const { shownWhen } = control;
    if (!shownWhen) continue;
    if (shownWhen.needs === 'dataset' && !dataset)
      return { ok: false, reason: `the dataset of this chart could not be read to check '${key}'. Retry.` };
    if (!shownWhen.holds(params, context)) return { ok: false, reason: `'${key}' would not show: ${shownWhen.rule}, and here it is not.` };
  }

  const resetsData = Object.keys(accepted).some((key) => controls[key]?.names || controls[key]?.data);
  return { ok: true, params, changed, resetsData };
};

/**
 * Conversión de valor de texto
 * Convierte un número o true/false recibido como texto al valor que toma el control; otros valores quedan igual.
 */
const asChoice = (value: unknown, control: EditableControl): unknown => {
  if (typeof value !== 'string' || !value.trim()) return value;
  const number = Number(value);
  if (control.range && Number.isFinite(number)) return number;
  const choice = control.values?.find((option) => (typeof option === 'number' ? option === number : String(option) === value));
  return choice !== undefined && typeof choice !== 'string' ? choice : value;
};

/**
 * Referencia por nombre del MCP
 * Referencia del MCP a una columna o métrica guardada ('name', 'saved_metric', 'label'), sin forma de form_data.
 */
const isNameRef = (entry: unknown): entry is { name: string; label?: unknown } =>
  !!entry && typeof entry === 'object' && typeof (entry as { name?: unknown }).name === 'string' && !('expressionType' in entry);

const plainName = (entry: unknown): unknown => (isNameRef(entry) ? entry.name : entry);

/**
 * Validación de valores con nombres
 * Valor verificado (los filtros adoptan la forma que escribe el servidor) o el motivo por el que se rechazó.
 */
const checkNames = (
  kind: NonNullable<EditableControl['names']>,
  key: string,
  value: unknown,
  saved: FormData,
  dataset: DatasetNames
): { value: unknown } | string => {
  const isColumn = (name: unknown) => typeof name === 'string' && dataset.columns.includes(name);
  const unknownColumn = (name: unknown) =>
    `'${String(name)}' is not a column of this chart's dataset (${key}). Columns: ${dataset.columns.join(', ')}.`;
  const savedEntries = Object.values(saved).flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
  const isSavedObject = (entry: unknown) => savedEntries.some((savedEntry) => sameValue(savedEntry, entry));

  const checkColumn = (entry: unknown): string | undefined => {
    if (typeof entry === 'string') return isColumn(entry) ? undefined : unknownColumn(entry);
    return isSavedObject(entry) ? undefined : `a custom SQL column in '${key}' can only be kept as it was, not written here.`;
  };
  const checkMetric = (entry: unknown): string | undefined => {
    if (typeof entry === 'string')
      return dataset.metrics.includes(entry)
        ? undefined
        : `'${entry}' is not a saved metric of this chart's dataset. Metrics: ${dataset.metrics.join(', ')}.`;
    const metric = entry as { expressionType?: string; aggregate?: string; column?: { column_name?: string } } | null;
    if (metric?.expressionType === 'SIMPLE') {
      if (!isColumn(metric.column?.column_name)) return unknownColumn(metric.column?.column_name);
      return METRIC_AGGREGATES.includes(metric.aggregate ?? '') ? undefined : `a metric aggregate is one of ${METRIC_AGGREGATES.join(', ')}.`;
    }
    return isSavedObject(entry) ? undefined : `a custom SQL metric in '${key}' can only be kept as it was, not written here.`;
  };
  const firstProblem = (entries: unknown, check: (entry: unknown) => string | undefined): string | undefined =>
    Array.isArray(entries) ? entries.map(check).find(Boolean) : `'${key}' takes a list.`;

  const refs = (Array.isArray(value) ? value : [value]) as unknown[];
  const relabeled = refs.find((entry) => isNameRef(entry) && typeof entry.label === 'string' && entry.label !== entry.name);
  if (relabeled)
    return `'${key}' takes saved metrics and columns by their name; a different label (e.g. the legend text '${(relabeled as { label: string }).label}') cannot be set here.`;
  value = Array.isArray(value) ? value.map(plainName) : plainName(value);

  switch (kind) {
    case 'column': {
      const problem = checkColumn(value);
      return problem ?? { value };
    }
    case 'columns': {
      const problem = firstProblem(value, checkColumn);
      return problem ?? { value };
    }
    case 'metric': {
      const problem = checkMetric(value);
      return problem ?? { value };
    }
    case 'metrics': {
      const problem = firstProblem(value, checkMetric);
      return problem ?? { value };
    }
    case 'sort': {
      const problem = firstProblem(value, (entry) => {
        const pair = parseJson(entry);
        return Array.isArray(pair) && isColumn(pair[0]) && typeof pair[1] === 'boolean'
          ? undefined
          : `each '${key}' entry is '["<column>", true|false]'.`;
      });
      return problem ?? { value };
    }
    case 'filters':
      return checkFilters(key, value, saved, isColumn, unknownColumn);
  }
};

const checkFilters = (
  key: string,
  value: unknown,
  saved: FormData,
  isColumn: (name: unknown) => boolean,
  unknownColumn: (name: unknown) => string
): { value: unknown } | string => {
  if (!Array.isArray(value)) return `'${key}' takes the complete list of filters.`;
  const sent = value as AdhocFilter[];

  /**- 1. Filtros SQL personalizados se conservan */
  const savedFilters = asFilters(saved[key]);
  const dropped = savedFilters.find((filter) => filter.expressionType === 'SQL' && !sent.some((entry) => sameValue(entry, filter)));
  if (dropped)
    return `the custom SQL filter (${dropped.sqlExpression}) has to stay exactly as it is; it can only be changed in the dashboard manager.`;

  /**- 2. Filtros simples sobre columnas reales */
  const filters: AdhocFilter[] = [];
  for (const filter of sent) {
    if (savedFilters.some((savedFilter) => sameValue(savedFilter, filter))) {
      filters.push(filter);
      continue;
    }
    if (filter?.expressionType === 'SQL') return 'a custom SQL filter cannot be written here.';
    if (!isColumn(filter?.subject)) return unknownColumn(filter?.subject);
    if (!FILTER_OPERATORS.includes(filter.operator ?? ''))
      return `filter operator '${filter.operator}' is not one of ${FILTER_OPERATORS.join(', ')}.`;
    if (filter.operator === 'TEMPORAL_RANGE' && !TIME_RANGE_FORMS.some((form) => form.test(String(filter.comparator))))
      return `time range '${String(filter.comparator)}' is not in a known form (e.g. 'Last month', 'DATEADD(DATETIME("now"), -30, day) : now', '2024-01-01 : 2024-02-01').`;
    /**- 3. Forma que escribe el servidor */
    filters.push({ ...filter, clause: filter.clause ?? 'WHERE', expressionType: 'SIMPLE' });
  }
  return { value: filters };
};

/**
 * Soporte de cambios de 'update_chart'
 * Informa de antemano cómo puede cambiar 'update_chart' este gráfico, para que el usuario lo sepa antes de describir el cambio.
 */
export const describeUpdateSupport = (
  formData: FormData,
  access?: { owners?: unknown[] | null; account?: string }
): string | Record<string, unknown> => {
  const assessment = assessSavedChart(formData);
  const controls = editableControlsOf(formData);
  if (!Object.keys(controls).length) return UNSUPPORTED_TYPE(String(formData['viz_type'] ?? ''));
  const rebuild =
    assessment.kind === 'reproducible'
      ? "possible: send the whole new chart as 'config'"
      : assessment.kind === 'unsupported_type'
        ? 'not possible: this chart type cannot be rebuilt from here; only the settings in editable can change'
        : `not possible from here: rebuilding it would lose ${describeLosses(assessment)}`;

  /**- 1. Sin API REST solo reconstrucción */
  if (!access?.account) {
    if (assessment.kind === 'reproducible') return 'A change to this chart can be made and saved from here.';
    if (assessment.kind === 'unsupported_type') return UNSUPPORTED_TYPE(assessment.vizType);
    return `A change cannot be made from here: saving would reset settings this tool cannot rebuild (${describeLosses(assessment)}). Changes to this chart have to be made directly in the dashboard manager.`;
  }

  /**- 2. Solo los propietarios pueden cambiar */
  const owners = (access.owners ?? []).map((owner) => String((owner as { username?: string })?.username ?? '').toLowerCase());
  if (!owners.includes(access.account.toLowerCase()))
    return 'This chart belongs to other users: it cannot be changed from here; its owners can change it in the dashboard manager.';

  /**- 3. Cambio parcial toca solo claves enviadas */
  return {
    partial: "Send 'changes' with only the keys to change, each with its complete new value; every other saved setting stays as it is.",
    editable: Object.fromEntries(
      Object.entries(controls).map(([key, control]) => [key, describeControl(control, String(formData['viz_type'] ?? ''))])
    ),
    other_settings: 'Any other setting, and tags, owners or dashboard membership, can only be changed in the dashboard manager.',
    chart_type_change: rebuild,
  };
};

/**
 * Comparación insensible al orden
 * Dos valores son iguales sin importar el orden de las claves de un objeto, pues el agente puede reordenarlas.
 */
const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])])
  );
};

const parseJson = (value: unknown): unknown => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Renombrado de nombres viejos del MCP
 * Mueve los nombres viejos del MCP ('MCP_ALIASES') al control que lee el editor; 'renamed' vacío significa nada que guardar.
 */
export const renameOldNames = (formData: FormData): { params: FormData; renamed: string[] } => {
  const controls = EDITABLE_CONTROLS[familyOf(String(formData['viz_type'] ?? '')) ?? ''] ?? {};
  const params: FormData = { ...formData };
  const renamed: string[] = [];
  for (const [oldName, control] of Object.entries(CONTROL_OF_ALIAS)) {
    if (!(oldName in params) || !controls[control]) continue;
    const value = params[oldName];
    delete params[oldName];
    renamed.push(oldName);
    if (params[control] === undefined && value !== null && value !== undefined)
      params[control] = oldName in MCP_ALIAS_VALUES ? MCP_ALIAS_VALUES[oldName]!(value) : value;
  }
  return { params, renamed };
};
