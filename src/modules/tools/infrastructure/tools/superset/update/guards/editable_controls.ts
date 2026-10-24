/**
 * Mapa de controles editables
 * Define qué controles puede tocar un cambio parcial ('changes') por familia; lo ausente solo se cambia en el gestor.
 */
import { TIME_GRAIN_VALUES } from '../../shared/schemas/chart_config.schema';

type FormData = Record<string, unknown>;

const XY_VIZ = ['echarts_timeseries_line', 'echarts_timeseries_bar', 'echarts_timeseries_scatter', 'echarts_area'];

/**
 * Familia de un tipo de gráfico
 * Los primeros cinco también pueden reconstruirse como otro tipo; el resto solo cambia parcialmente.
 */
export const familyOf = (vizType: string): string | undefined => {
  if (vizType === 'table' || vizType === 'ag-grid-table') return 'table';
  if (XY_VIZ.includes(vizType)) return 'xy';
  if (vizType === 'pie') return 'pie';
  if (vizType === 'big_number' || vizType === 'big_number_total') return 'big_number';
  if (vizType === 'handlebars') return 'handlebars';
  if (vizType === 'pivot_table_v2') return 'pivot';
  if (vizType === 'heatmap_v2') return 'heatmap';
  if (vizType === 'mixed_timeseries') return 'mixed';
  if (vizType === 'funnel') return 'funnel';
  return undefined;
};

/**
 * Modo de consulta guardado
 * Agrupado ('aggregate') o una fila por registro ('raw'), como lo lee Superset; sin 'query_mode', columnas guardadas implican 'raw'.
 */
export const queryModeOf = (formData: FormData): 'aggregate' | 'raw' => {
  const mode = formData['query_mode'];
  if (mode === 'aggregate' || mode === 'raw') return mode;
  const columns = formData['all_columns'];
  return Array.isArray(columns) && columns.length > 0 ? 'raw' : 'aggregate';
};

export interface DatasetNames {
  columns: readonly string[];
  metrics: readonly string[];
  dateColumns: readonly string[];
}

export interface ChangeContext {
  dataset?: DatasetNames;
  dashboardColorScheme?: string;
}

export interface ShownWhen {
  rule: string;
  holds: (formData: FormData, context: ChangeContext) => boolean;
  needs?: 'dataset' | 'dashboard';
}

export interface EditableControl {
  hint: string;
  values?: readonly unknown[];
  range?: readonly [number, number];
  names?: 'columns' | 'column' | 'metrics' | 'metric' | 'sort' | 'filters';
  validate?: (value: unknown, next: FormData) => string | undefined;
  data?: true;
  vizTypes?: readonly string[];
  queryMode?: 'aggregate' | 'raw';
  shownWhen?: ShownWhen;
  byDefault?: unknown;
  byDefaultByVizType?: Readonly<Record<string, unknown>>;
}

/**
 * Valor por defecto de un control
 * Valor por defecto de Superset para este control y tipo de gráfico, si se conoce; 'found' distingue un null conocido.
 */
export const defaultOf = (control: EditableControl, vizType: string): { found: true; value: unknown } | { found: false } => {
  if (control.byDefaultByVizType)
    return vizType in control.byDefaultByVizType ? { found: true, value: control.byDefaultByVizType[vizType] } : { found: false };
  return 'byDefault' in control ? { found: true, value: control.byDefault } : { found: false };
};

/**
 * Descripción de un control
 * Describe el control como lo lee el agente en '_update_support': qué hace, su valor por defecto conocido y su regla.
 */
export const describeControl = (control: EditableControl, vizType: string): string => {
  const known = defaultOf(control, vizType);
  return [control.hint, known.found && `default ${JSON.stringify(known.value)}`, control.shownWhen?.rule].filter(Boolean).join('; ');
};

/**
 * Regla de visibilidad por ajuste
 * Se cumple mientras el ajuste tenga este valor; 'byDefault' es el valor por defecto de Superset si nunca se guardó.
 */
const whileSetting = (key: string, value: boolean, byDefault: boolean): ShownWhen => ({
  rule: `it takes effect only while '${key}' is ${value}`,
  holds: (formData) => (formData[key] ?? byDefault) === value,
});

const ON_A_DATE_AXIS =
  '; it needs a date x-axis: on a category x-axis, put the date column on the x-axis and keep the category as the series (groupby) only to do what the user asked, and say plainly that the x-axis changed';

const DATE_X_AXIS: ShownWhen = {
  rule: "it takes effect only when 'x_axis' is a date column",
  holds: (formData, { dataset }) => typeof formData['x_axis'] !== 'string' || Boolean(dataset?.dateColumns.includes(formData['x_axis'])),
  needs: 'dataset',
};

const NO_DASHBOARD_SCHEME: ShownWhen = {
  rule: 'on the selected dashboard it shows only while that dashboard has no color scheme of its own',
  holds: (_formData, { dashboardColorScheme }) => !dashboardColorScheme,
  needs: 'dashboard',
};

const BOOL = [true, false] as const;
const TITLE_MARGINS = [0, 15, 30, 50, 75, 100, 125, 150, 200] as const;
export const EXPRESSIBLE_FILTER_OPERATORS = ['==', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'NOT LIKE', 'IN', 'NOT IN'];
export const FILTER_OPERATORS = [...EXPRESSIBLE_FILTER_OPERATORS, 'TEMPORAL_RANGE'];
const METRICS_HINT = 'saved metric names, or metric objects as form_data shows them';
const TIME_GRAIN_HINT = 'PT1H, P1D, P1W, P1M, P3M, P1Y';
const SERIES_TYPES = ['line', 'scatter', 'smooth', 'bar', 'start', 'middle', 'end'];
const isBounds = (value: unknown): boolean =>
  Array.isArray(value) && value.length === 2 && value.every((bound) => bound === null || typeof bound === 'number');

const FILTERS: EditableControl = {
  hint:
    'the complete list of filters, as form_data shows them: keep every filter the user did not ask to remove; SQL filters stay exactly as they are. ' +
    `A new filter is {subject: <dataset column>, operator: ${FILTER_OPERATORS.join('|')}, comparator: <value>}. ` +
    `A TEMPORAL_RANGE comparator is 'No filter', 'Last week', 'Last month', 'Last quarter', 'Last year', 'previous calendar month', 'DATEADD(DATETIME("now"), -30, day) : now' or '2024-01-01 : 2024-02-01'.`,
  names: 'filters',
};
const ROW_LIMIT: EditableControl = { hint: 'maximum rows fetched, 1-50000', range: [1, 50000], data: true, byDefault: 10000 };
const D3_NUMBER_HINT = "d3 style (e.g. 'SMART_NUMBER', ',.0f', '.1%', '$,.2f')";
const D3_TIME_HINT = "d3 style (e.g. '%d/%m/%Y', 'smart_date')";
const SMART_NUMBER = 'SMART_NUMBER';
const SMART_DATE = 'smart_date';

const LEGEND_SHOWN = whileSetting('show_legend', true, true);
const SHOW_LEGEND: EditableControl = { hint: 'show the legend: true|false', values: BOOL, byDefault: true };
const LEGEND_ORIENTATION: EditableControl = {
  hint: 'legend position: top|bottom|left|right',
  values: ['top', 'bottom', 'left', 'right'],
  shownWhen: LEGEND_SHOWN,
  byDefault: 'top',
};
const LEGEND: Record<string, EditableControl> = {
  show_legend: SHOW_LEGEND,
  legendOrientation: LEGEND_ORIENTATION,
  legendType: {
    hint: "legend style: 'scroll' (one line) or 'plain' (every item)",
    values: ['scroll', 'plain'],
    shownWhen: LEGEND_SHOWN,
    byDefault: 'scroll',
  },
};

const CATEGORICAL_SCHEMES: Record<string, string> = {
  supersetColors: 'Superset Colors, the default',
  blueToGreen: 'Blue to green',
  redToYellow: 'Red to yellow',
  wavesOfBlue: 'Waves of blue',
  modernSunset: 'Modern sunset',
  colorsOfRainbow: 'Colors of rainbow',
  presetColors: 'Preset Colors',
  supersetAndPresetColors: 'Preset + Superset',
  bnbColors: 'Airbnb Colors',
  googleCategory10c: 'Google Category 10c',
  googleCategory20c: 'Google Category 20c',
  d3Category10: 'D3 Category 10',
  d3Category20: 'D3 Category 20',
  d3Category20b: 'D3 Category 20b',
  d3Category20c: 'D3 Category 20c',
  echarts4Colors: 'ECharts v4.x Colors',
  echarts5Colors: 'ECharts v5.x Colors',
  lyftColors: 'Lyft Colors',
};
const COLOR_SCHEME: EditableControl = {
  hint:
    `the color palette of the series or slices, one of: ${Object.entries(CATEGORICAL_SCHEMES)
      .map(([id, label]) => `${id} (${label})`)
      .join(', ')}. ` +
    "It sets the whole palette, never the color of one series; on a dashboard, labels other charts share keep the dashboard's color",
  values: Object.keys(CATEGORICAL_SCHEMES),
  shownWhen: NO_DASHBOARD_SCHEME,
};

const SEQUENTIAL_SCHEMES: Record<string, string> = {
  superset_seq_1: 'Superset Sequential #1',
  schemeBlues: 'blues',
  schemeGreens: 'greens',
  schemeReds: 'reds',
  schemeOranges: 'oranges',
  schemePurples: 'purples',
  schemeGrays: 'grays',
  schemeYlOrRd: 'yellow/orange/red',
  schemeRdYlGn: 'red/yellow/green',
  schemeRdBu: 'red/blue',
  schemeViridis: 'Viridis',
};

const RANGE_OPERATORS = ['< x <', '≤ x ≤', '≤ x <', '< x ≤'];
const NO_TARGET_OPERATORS = ['None', 'is true', 'is false', 'is null', 'is not null'];
const FORMATTING_OPERATORS = [
  '>',
  '<',
  '≥',
  '≤',
  '=',
  '≠',
  ...RANGE_OPERATORS,
  ...NO_TARGET_OPERATORS,
  'begins with',
  'ends with',
  'containing',
  'not containing',
];
const FORMATTING_COLORS = ['colorSuccess', 'colorWarning', 'colorError'];

const nameOf = (entry: unknown): string | undefined =>
  typeof entry === 'string' ? entry : ((entry as { label?: string } | null)?.label ?? undefined);
const namesOf = (value: unknown): string[] => (Array.isArray(value) ? value.map(nameOf).filter((name): name is string => !!name) : []);

/**
 * Columnas mostradas por la tabla
 * Columnas de una tabla o tabla dinámica, por el nombre que apunta una regla de formato ('%' en porcentuales).
 */
const shownColumns = (next: FormData): string[] => {
  if (String(next['viz_type']) === 'pivot_table_v2') return namesOf(next['metrics']);
  if (queryModeOf(next) === 'raw') return namesOf(next['all_columns']);
  return [...namesOf(next['groupby']), ...namesOf(next['metrics']), ...namesOf(next['percent_metrics']).map((name) => `%${name}`)];
};

interface FormattingRule {
  column?: unknown;
  operator?: unknown;
  targetValue?: unknown;
  targetValueLeft?: unknown;
  targetValueRight?: unknown;
  colorScheme?: unknown;
  objectFormatting?: unknown;
  columnFormatting?: unknown;
}

/**
 * Validación de formato condicional
 * Cada regla nueva debe apuntar a una columna mostrada, con operador conocido, sus objetivos y un color conocido.
 */
const checkFormatting = (value: unknown, next: FormData): string | undefined => {
  if (!Array.isArray(value)) return "'conditional_formatting' takes the complete list of rules.";
  const columns = shownColumns(next);
  for (const rule of value as FormattingRule[]) {
    const isNumber = (target: unknown) => typeof target === 'number';
    if (typeof rule?.column !== 'string' || !columns.includes(rule.column))
      return `a formatting rule targets '${String(rule?.column)}', which this chart does not show. It shows: ${columns.join(', ')}.`;
    if (!FORMATTING_OPERATORS.includes(String(rule.operator)))
      return `formatting operator '${String(rule.operator)}' is not one of ${FORMATTING_OPERATORS.join(', ')}.`;
    if (RANGE_OPERATORS.includes(String(rule.operator)) && !(isNumber(rule.targetValueLeft) && isNumber(rule.targetValueRight)))
      return `a '${String(rule.operator)}' rule needs numbers in 'targetValueLeft' and 'targetValueRight'.`;
    const needsTarget = !RANGE_OPERATORS.includes(String(rule.operator)) && !NO_TARGET_OPERATORS.includes(String(rule.operator));
    if (needsTarget && (rule.targetValue === undefined || rule.targetValue === null || rule.targetValue === ''))
      return `a '${String(rule.operator)}' rule needs a 'targetValue'.`;
    if (!FORMATTING_COLORS.includes(String(rule.colorScheme)))
      return `a formatting color is one of ${FORMATTING_COLORS.join(', ')} (green, yellow, red); got '${String(rule.colorScheme)}'.`;
    if (rule.objectFormatting !== undefined && !['BACKGROUND_COLOR', 'TEXT_COLOR'].includes(String(rule.objectFormatting)))
      return "'objectFormatting' is 'BACKGROUND_COLOR' or 'TEXT_COLOR'.";
    if (rule.columnFormatting !== undefined && rule.columnFormatting !== 'ENTIRE_ROW') return "'columnFormatting' is 'ENTIRE_ROW' (the whole row).";
  }
  return undefined;
};

const CONDITIONAL_FORMATTING: EditableControl = {
  hint:
    'rules that color cells by their value: the complete list, as form_data shows it (keep the rules the user did not ask to remove). ' +
    `A new rule is {column: <a column or metric the chart shows>, operator: ${['>', '<', '≥', '≤', '=', '≠', ...RANGE_OPERATORS, 'None'].join('|')} ` +
    "(or 'begins with', 'containing'… for text), targetValue: <number or text> (targetValueLeft and targetValueRight for a range; none for 'None', which shades every value), " +
    "colorScheme: colorSuccess (green)|colorWarning (yellow)|colorError (red)}; optional objectFormatting: 'TEXT_COLOR' (color the text, not the cell) and columnFormatting: 'ENTIRE_ROW' (color the whole row)",
  validate: checkFormatting,
};

/**
 * Cambio de 'query_mode'
 * Pasar tabla o tarjeta entre agrupado y fila por registro exige los campos del nuevo modo en el mismo cambio.
 */
const checkQueryModeSwitch = (value: unknown, next: FormData): string | undefined => {
  if (value === 'raw' && !namesOf(next['all_columns']).length)
    return "one row per record needs its columns: send 'all_columns' (dataset column names) in the same change.";
  if (value === 'aggregate' && ![next['groupby'], next['metrics'], next['percent_metrics']].some((list) => Array.isArray(list) && list.length))
    return "grouped rows need 'groupby' or 'metrics' in the same change.";
  return undefined;
};

const QUERY_MODE: EditableControl = {
  hint: "'aggregate' (rows grouped by 'groupby', with 'metrics') or 'raw' (one row per record, columns in 'all_columns'); send it with the new mode's columns or metrics",
  values: ['aggregate', 'raw'],
  data: true,
  validate: checkQueryModeSwitch,
};

export const EDITABLE_CONTROLS: Record<string, Record<string, EditableControl>> = {
  table: {
    adhoc_filters: FILTERS,
    row_limit: ROW_LIMIT,
    query_mode: QUERY_MODE,
    groupby: { hint: 'the columns rows are grouped by (dataset column names)', names: 'columns', queryMode: 'aggregate' },
    metrics: { hint: `the metrics shown (${METRICS_HINT})`, names: 'metrics', queryMode: 'aggregate' },
    percent_metrics: {
      hint: `metrics shown as a percentage of the total of the rows fetched (${METRICS_HINT})`,
      names: 'metrics',
      queryMode: 'aggregate',
    },
    timeseries_limit_metric: {
      hint: 'the metric rows are sorted by (a grouped table sorts only by a metric)',
      names: 'metric',
      queryMode: 'aggregate',
    },
    order_desc: { hint: 'sort descending: true|false', values: BOOL, data: true, queryMode: 'aggregate', byDefault: true },
    all_columns: { hint: 'the columns shown (dataset column names)', names: 'columns', queryMode: 'raw' },
    order_by_cols: { hint: `sort order, a list like ['["<column>", true]'] (true = ascending)`, names: 'sort', queryMode: 'raw' },
    include_search: { hint: 'search box: true|false', values: BOOL, byDefault: false },
    server_pagination: {
      hint: 'fetch one page at a time from the server, for large results (experimental): true|false',
      values: BOOL,
      data: true,
      byDefault: false,
    },
    server_page_length: {
      hint: 'rows per page with server pagination: 10, 20, 50, 100 or 200',
      values: [10, 20, 50, 100, 200],
      data: true,
      shownWhen: whileSetting('server_pagination', true, false),
      byDefault: 10,
    },
    page_length: {
      hint: 'rows per page: 0 (all), 10, 20, 50, 100 or 200',
      values: [0, 10, 20, 50, 100, 200],
      shownWhen: whileSetting('server_pagination', false, false),
    },
    show_totals: { hint: 'totals row: true|false', values: BOOL, byDefault: false },
    show_cell_bars: { hint: 'bars inside numeric cells: true|false', values: BOOL, byDefault: true },
    color_pn: { hint: 'color positive and negative numbers: true|false', values: BOOL, byDefault: true },
    conditional_formatting: CONDITIONAL_FORMATTING,
    allow_rearrange_columns: { hint: 'let viewers drag columns around: true|false', values: BOOL, byDefaultByVizType: { table: false } },
    table_timestamp_format: { hint: `date format, ${D3_TIME_HINT}`, byDefault: SMART_DATE },
    column_config: {
      hint: 'display per column, the whole object: {<column>: {horizontalAlign: left|right|center, d3NumberFormat, d3TimeFormat, columnWidth}}',
    },
  },
  pie: {
    adhoc_filters: FILTERS,
    row_limit: { ...ROW_LIMIT, byDefault: 100 },
    groupby: { hint: 'the column that defines the slices (a one-item list with a dataset column name)', names: 'columns' },
    metric: { hint: `the measured value (${METRICS_HINT})`, names: 'metric' },
    sort_by_metric: { hint: 'sort slices by value: true|false', values: BOOL, data: true, byDefault: true },
    color_scheme: COLOR_SCHEME,
    donut: { hint: 'donut instead of a full pie: true|false', values: BOOL, byDefault: false },
    innerRadius: { hint: 'size of the donut hole, 0-100', range: [0, 100], shownWhen: whileSetting('donut', true, false), byDefault: 30 },
    outerRadius: { hint: 'size of the pie, 10-100', range: [10, 100], byDefault: 70 },
    show_labels: { hint: 'slice labels: true|false', values: BOOL, byDefault: true },
    label_type: {
      hint: 'label content: key|value|percent|key_value|key_percent|key_value_percent|value_percent',
      values: ['key', 'value', 'percent', 'key_value', 'key_percent', 'key_value_percent', 'value_percent'],
      byDefault: 'key',
    },
    labels_outside: {
      hint: 'labels outside the slices: true|false',
      values: BOOL,
      shownWhen: whileSetting('show_labels', true, true),
      byDefault: true,
    },
    label_line: {
      hint: 'lines from slices to outside labels: true|false',
      values: BOOL,
      shownWhen: whileSetting('show_labels', true, true),
      byDefault: false,
    },
    show_labels_threshold: { hint: 'hide labels of slices under this percent, 0-100', range: [0, 100], byDefault: 5 },
    show_total: { hint: 'show the total: true|false', values: BOOL, byDefault: false },
    number_format: { hint: `number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    ...LEGEND,
  },
  xy: {
    adhoc_filters: FILTERS,
    row_limit: ROW_LIMIT,
    x_axis: { hint: 'the x-axis column (dataset column name)', names: 'column' },
    metrics: { hint: `the plotted values (${METRICS_HINT})`, names: 'metrics' },
    groupby: { hint: 'columns that split the data into series (dataset column names)', names: 'columns' },
    time_grain_sqla: {
      hint: `time bucket of the x-axis: ${TIME_GRAIN_HINT}${ON_A_DATE_AXIS}`,
      values: TIME_GRAIN_VALUES,
      data: true,
      shownWhen: DATE_X_AXIS,
    },
    color_scheme: COLOR_SCHEME,
    ...LEGEND,
    x_axis_title: { hint: 'x-axis title; set x_axis_title_margin too (e.g. 30) so it does not overlap the labels', byDefault: '' },
    x_axis_title_margin: { hint: 'space for the x-axis title: 0, 15, 30, 50, 75, 100, 125, 150, 200', values: TITLE_MARGINS, byDefault: 0 },
    y_axis_title: { hint: 'y-axis title; set y_axis_title_margin too (e.g. 30) so it does not overlap the labels', byDefault: '' },
    y_axis_title_margin: {
      hint: 'space for the y-axis title: 0, 15, 30, 50, 75, 100, 125, 150, 200',
      values: TITLE_MARGINS,
      byDefaultByVizType: { echarts_timeseries_bar: 15, echarts_timeseries_line: 0, echarts_timeseries_scatter: 0, echarts_area: 0 },
    },
    y_axis_format: { hint: `y-axis number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    x_axis_time_format: { hint: `date format of a date x-axis, ${D3_TIME_HINT}`, byDefault: SMART_DATE },
    logAxis: { hint: 'logarithmic y-axis: true|false', values: BOOL, byDefault: false },
    truncateYAxis: { hint: "set the y-axis bounds by hand with 'y_axis_bounds': true|false", values: BOOL, byDefault: false },
    y_axis_bounds: {
      hint: 'y-axis [min, max], null for automatic (e.g. [null, 1000] sets only the maximum); it only widens the axis, it never hides data',
      validate: (value) => (isBounds(value) ? undefined : "'y_axis_bounds' is [min, max], each a number or null."),
      shownWhen: whileSetting('truncateYAxis', true, false),
      byDefault: [null, null],
    },
    show_value: { hint: 'show the values on the chart: true|false', values: BOOL, byDefault: false },
    stack: { hint: "stack series: null (no), 'Stack' or 'Expand' (as 100%)", values: [null, 'Stack', 'Expand'], byDefault: null },
    orientation: {
      hint: 'bar direction: vertical|horizontal',
      values: ['vertical', 'horizontal'],
      vizTypes: ['echarts_timeseries_bar'],
      byDefault: 'vertical',
    },
    markerEnabled: {
      hint: 'a dot on each data point: true|false',
      values: BOOL,
      vizTypes: ['echarts_timeseries_line', 'echarts_timeseries_scatter', 'echarts_area'],
      byDefault: false,
    },
    markerSize: {
      hint: 'size of the dots, 0-20',
      range: [0, 20],
      vizTypes: ['echarts_timeseries_line', 'echarts_timeseries_scatter', 'echarts_area'],
      shownWhen: whileSetting('markerEnabled', true, false),
      byDefault: 6,
    },
    xAxisLabelRotation: { hint: 'x-axis label rotation: 0, 45 or 90', values: [0, 45, 90], byDefault: 0 },
    zoomable: { hint: 'zoom slider: true|false', values: BOOL, byDefault: false },
  },
  big_number: {
    adhoc_filters: FILTERS,
    metric: { hint: `the value shown (${METRICS_HINT})`, names: 'metric' },
    time_grain_sqla: { hint: `trendline time bucket: ${TIME_GRAIN_HINT}`, values: TIME_GRAIN_VALUES, data: true, vizTypes: ['big_number'] },
    y_axis_format: { hint: `number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    header_font_size: { hint: 'number size: 0.2, 0.3, 0.4, 0.5 or 0.6', values: [0.2, 0.3, 0.4, 0.5, 0.6], byDefault: 0.4 },
    subtitle: { hint: "text shown below the number ('' removes it)" },
    subtitle_font_size: { hint: 'subtitle size: 0.125, 0.15, 0.2, 0.3 or 0.4', values: [0.125, 0.15, 0.2, 0.3, 0.4], byDefault: 0.15 },
    show_metric_name: { hint: "show the metric's name below the number: true|false", values: BOOL, byDefault: false },
    metric_name_font_size: {
      hint: 'metric name size: 0.125, 0.15, 0.2, 0.3 or 0.4',
      values: [0.125, 0.15, 0.2, 0.3, 0.4],
      shownWhen: whileSetting('show_metric_name', true, false),
      byDefault: 0.15,
    },
    show_trend_line: { hint: 'show the trendline: true|false', values: BOOL, vizTypes: ['big_number'], byDefault: true },
    start_y_axis_at_zero: { hint: 'trendline starts at zero: true|false', values: BOOL, vizTypes: ['big_number'], byDefault: true },
  },
  handlebars: {
    adhoc_filters: FILTERS,
    row_limit: ROW_LIMIT,
    query_mode: QUERY_MODE,
    metrics: { hint: `the metrics (${METRICS_HINT})`, names: 'metrics', queryMode: 'aggregate' },
    groupby: { hint: 'the grouping columns (dataset column names)', names: 'columns', queryMode: 'aggregate' },
    order_desc: { hint: 'sort descending: true|false', values: BOOL, data: true, queryMode: 'aggregate', byDefault: true },
    all_columns: { hint: 'the columns (dataset column names)', names: 'columns', queryMode: 'raw' },
    handlebarsTemplate: { hint: 'the HTML template (Handlebars); the rows are in {{data}}' },
    styleTemplate: { hint: 'CSS applied to the template' },
  },
  pivot: {
    adhoc_filters: FILTERS,
    row_limit: { hint: 'maximum cells fetched, 1-50000', range: [1, 50000], data: true, byDefault: 10000 },
    groupbyRows: { hint: 'the columns that make the rows (dataset column names)', names: 'columns' },
    groupbyColumns: { hint: 'the columns that make the columns (dataset column names)', names: 'columns' },
    metrics: { hint: `the values in the cells (${METRICS_HINT})`, names: 'metrics' },
    metricsLayout: { hint: "where the metrics go when there are several: 'COLUMNS' or 'ROWS'", values: ['COLUMNS', 'ROWS'], byDefault: 'COLUMNS' },
    aggregateFunction: {
      hint: 'how cells and totals are combined, e.g. Sum, Count, Average, Minimum, Maximum, Median, Sum as Fraction of Total',
      values: [
        'Count',
        'Count Unique Values',
        'List Unique Values',
        'Sum',
        'Average',
        'Median',
        'Sample Variance',
        'Sample Standard Deviation',
        'Minimum',
        'Maximum',
        'First',
        'Last',
        'Sum as Fraction of Total',
        'Sum as Fraction of Rows',
        'Sum as Fraction of Columns',
        'Count as Fraction of Total',
        'Count as Fraction of Rows',
        'Count as Fraction of Columns',
      ],
      byDefault: 'Sum',
    },
    rowTotals: { hint: 'a total for each row: true|false', values: BOOL, byDefault: false },
    colTotals: { hint: 'a total for each column: true|false', values: BOOL, byDefault: false },
    rowSubTotals: { hint: 'row subtotals: true|false', values: BOOL, byDefault: false },
    colSubTotals: { hint: 'column subtotals: true|false', values: BOOL, byDefault: false },
    rowSubtotalPosition: { hint: 'row subtotals on top (true) or at the bottom (false)', values: BOOL, byDefault: false },
    colSubtotalPosition: { hint: 'column subtotals on the left (true) or on the right (false)', values: BOOL, byDefault: false },
    transposePivot: { hint: 'swap rows and columns: true|false', values: BOOL, byDefault: false },
    combineMetric: { hint: 'show the metrics side by side within each column: true|false', values: BOOL, byDefault: false },
    rowOrder: {
      hint: 'row order: key_a_to_z, key_z_to_a, value_a_to_z, value_z_to_a',
      values: ['key_a_to_z', 'key_z_to_a', 'value_a_to_z', 'value_z_to_a'],
      byDefault: 'key_a_to_z',
    },
    colOrder: {
      hint: 'column order: key_a_to_z, key_z_to_a, value_a_to_z, value_z_to_a',
      values: ['key_a_to_z', 'key_z_to_a', 'value_a_to_z', 'value_z_to_a'],
      byDefault: 'key_a_to_z',
    },
    valueFormat: { hint: `number format of the cells, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    date_format: { hint: `date format, ${D3_TIME_HINT}`, byDefault: SMART_DATE },
    conditional_formatting: CONDITIONAL_FORMATTING,
  },
  heatmap: {
    adhoc_filters: FILTERS,
    row_limit: ROW_LIMIT,
    x_axis: { hint: 'the column across (dataset column name)', names: 'column' },
    time_grain_sqla: {
      hint: `time bucket of a date x-axis: ${TIME_GRAIN_HINT}${ON_A_DATE_AXIS}`,
      values: TIME_GRAIN_VALUES,
      data: true,
      shownWhen: DATE_X_AXIS,
    },
    groupby: { hint: 'the column down (a one-item list with a dataset column name)', names: 'columns' },
    metric: { hint: `the value that colors each cell (${METRICS_HINT})`, names: 'metric' },
    linear_color_scheme: {
      hint: `the color gradient, one of: ${Object.entries(SEQUENTIAL_SCHEMES)
        .map(([id, label]) => `${id} (${label})`)
        .join(', ')}`,
      values: Object.keys(SEQUENTIAL_SCHEMES),
    },
    normalize_across: {
      hint: "what the color compares against: 'heatmap' (all cells), 'x' (each column) or 'y' (each row)",
      values: ['heatmap', 'x', 'y'],
      byDefault: 'heatmap',
    },
    sort_x_axis: {
      hint: 'order across: alpha_asc, alpha_desc, value_asc, value_desc',
      values: ['alpha_asc', 'alpha_desc', 'value_asc', 'value_desc'],
    },
    sort_y_axis: { hint: 'order down: alpha_asc, alpha_desc, value_asc, value_desc', values: ['alpha_asc', 'alpha_desc', 'value_asc', 'value_desc'] },
    show_legend: SHOW_LEGEND,
    legend_type: { hint: "legend: 'continuous' (a gradient) or 'piecewise' (ranges)", values: ['continuous', 'piecewise'], byDefault: 'continuous' },
    show_values: { hint: 'the value inside each cell: true|false', values: BOOL, byDefault: false },
    show_percentage: { hint: 'percentages in the tooltip: true|false', values: BOOL, byDefault: true },
    normalized: { hint: 'color by rank instead of by value: true|false', values: BOOL, byDefault: false },
    y_axis_format: { hint: `number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    x_axis_time_format: { hint: `date format of a date x-axis, ${D3_TIME_HINT}`, byDefault: SMART_DATE },
  },
  mixed: {
    x_axis: { hint: 'the x-axis column, shared by both queries (dataset column name)', names: 'column' },
    time_grain_sqla: {
      hint: `time bucket of the x-axis: ${TIME_GRAIN_HINT}${ON_A_DATE_AXIS}`,
      values: TIME_GRAIN_VALUES,
      data: true,
      shownWhen: DATE_X_AXIS,
    },
    metrics: { hint: `the values of query A (${METRICS_HINT})`, names: 'metrics' },
    metrics_b: { hint: `the values of query B (${METRICS_HINT})`, names: 'metrics' },
    groupby: { hint: 'columns that split query A into series (dataset column names)', names: 'columns' },
    groupby_b: { hint: 'columns that split query B into series (dataset column names)', names: 'columns' },
    adhoc_filters: { ...FILTERS, hint: `filters of query A: ${FILTERS.hint}` },
    adhoc_filters_b: { ...FILTERS, hint: `filters of query B: ${FILTERS.hint}` },
    row_limit: { ...ROW_LIMIT, hint: `query A: ${ROW_LIMIT.hint}` },
    row_limit_b: { ...ROW_LIMIT, hint: `query B: ${ROW_LIMIT.hint}` },
    seriesType: { hint: 'how query A is drawn: line, scatter, smooth, bar, start, middle, end (steps)', values: SERIES_TYPES, byDefault: 'line' },
    seriesTypeB: { hint: 'how query B is drawn: line, scatter, smooth, bar, start, middle, end (steps)', values: SERIES_TYPES, byDefault: 'line' },
    yAxisIndex: { hint: 'axis of query A: 0 (primary, left) or 1 (secondary, right)', values: [0, 1], byDefault: 0 },
    yAxisIndexB: { hint: 'axis of query B: 0 (primary, left) or 1 (secondary, right)', values: [0, 1], byDefault: 0 },
    stack: { hint: 'stack the series of query A: true|false', values: BOOL, byDefault: false },
    stackB: { hint: 'stack the series of query B: true|false', values: BOOL, byDefault: false },
    area: { hint: 'fill the area under query A: true|false', values: BOOL, byDefault: false },
    areaB: { hint: 'fill the area under query B: true|false', values: BOOL, byDefault: false },
    show_value: { hint: 'show the values of query A: true|false', values: BOOL },
    show_valueB: { hint: 'show the values of query B: true|false', values: BOOL },
    markerEnabled: { hint: 'a dot on each point of query A: true|false', values: BOOL, byDefault: false },
    markerEnabledB: { hint: 'a dot on each point of query B: true|false', values: BOOL, byDefault: false },
    color_scheme: COLOR_SCHEME,
    ...LEGEND,
    x_axis_title: { hint: 'x-axis title; set x_axis_title_margin too (e.g. 30) so it does not overlap the labels', byDefault: '' },
    x_axis_title_margin: { hint: 'space for the x-axis title: 0, 15, 30, 50, 75, 100, 125, 150, 200', values: TITLE_MARGINS, byDefault: 0 },
    y_axis_title: { hint: 'primary y-axis title; set y_axis_title_margin too (e.g. 30)', byDefault: '' },
    y_axis_title_margin: { hint: 'space for the y-axis title: 0, 15, 30, 50, 75, 100, 125, 150, 200', values: TITLE_MARGINS, byDefault: 0 },
    yAxisTitleSecondary: { hint: 'secondary y-axis title', byDefault: '' },
    y_axis_format: { hint: `primary y-axis number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    y_axis_format_secondary: { hint: `secondary y-axis number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
    x_axis_time_format: { hint: `date format of a date x-axis, ${D3_TIME_HINT}`, byDefault: SMART_DATE },
    logAxis: { hint: 'logarithmic primary y-axis: true|false', values: BOOL, byDefault: false },
    logAxisSecondary: { hint: 'logarithmic secondary y-axis: true|false', values: BOOL, byDefault: false },
    zoomable: { hint: 'zoom slider: true|false', values: BOOL, byDefault: false },
  },
  funnel: {
    adhoc_filters: FILTERS,
    row_limit: { ...ROW_LIMIT, byDefault: 10 },
    groupby: { hint: 'the column that defines the steps (dataset column names)', names: 'columns' },
    metric: { hint: `the value of each step (${METRICS_HINT})`, names: 'metric' },
    sort_by_metric: { hint: 'order the steps by value: true|false', values: BOOL, data: true, byDefault: true },
    percent_calculation_type: {
      hint: "how percentages are computed: 'first_step', 'prev_step' (previous step) or 'total'",
      values: ['first_step', 'prev_step', 'total'],
      byDefault: 'first_step',
    },
    color_scheme: COLOR_SCHEME,
    show_legend: SHOW_LEGEND,
    legendOrientation: LEGEND_ORIENTATION,
    show_labels: { hint: 'labels on the steps: true|false', values: BOOL, byDefault: true },
    label_type: {
      hint: 'label content: 0 name, 1 value, 2 percent, 3 name and value, 4 name and percent, 5 name, value and percent, 6 value and percent',
      values: [0, 1, 2, 3, 4, 5, 6],
      byDefault: 0,
    },
    show_tooltip_labels: { hint: 'labels in the tooltip: true|false', values: BOOL, byDefault: true },
    number_format: { hint: `number format, ${D3_NUMBER_HINT}`, byDefault: SMART_NUMBER },
  },
};

export const MCP_ALIASES: Record<string, readonly string[]> = {
  legendOrientation: ['legend_orientation'],
  handlebarsTemplate: ['handlebars_template'],
  logAxis: ['y_axis_scale'],
  x_axis_time_format: ['x_axis_format'],
  subtitle: ['subheader'],
};

export const MCP_ALIAS_VALUES: Record<string, (value: unknown) => unknown> = {
  y_axis_scale: (value) => (typeof value === 'string' ? value === 'log' : value),
};
