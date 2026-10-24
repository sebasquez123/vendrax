import { describe, expect, it } from '@jest/globals';
import { assessSavedChart, checkChanges, describeUpdateSupport, neededContext, renameOldNames } from './form_data.guard';
import { defaultOf, EDITABLE_CONTROLS, familyOf } from './editable_controls';

const SEVEN_DAYS = {
  clause: 'WHERE',
  comparator: 'DATEADD(DATETIME("now"), -7, day) : now',
  datasourceWarning: false,
  expressionType: 'SIMPLE',
  filterOptionName: 'filter_jhwt0nxmh5_5x9nx8pxknq',
  isExtra: false,
  isNew: false,
  operator: 'TEMPORAL_RANGE',
  sqlExpression: null,
  subject: 'DATE',
};
const TABLE_3504 = {
  datasource: '123__table',
  viz_type: 'table',
  query_mode: 'aggregate',
  groupby: ['DATE_TIME', 'PLACE', 'SELLER', 'DEVICE', 'STATUS_DESC', 'ACCOUNT', 'MOVEMENT_CATEGORY_DESC', 'VALUE_MONEY'],
  all_columns: [],
  adhoc_filters: [SEVEN_DAYS],
  order_by_cols: [],
  row_limit: 1000,
  table_timestamp_format: 'smart_date',
  include_search: true,
  allow_rearrange_columns: true,
  column_config: { DATE_TIME: { horizontalAlign: 'left' } },
  show_cell_bars: true,
  color_pn: true,
};
const DONUT_3510 = {
  viz_type: 'pie',
  groupby: ['DEVICE_TYPE'],
  metric: 'Total validaciones',
  color_scheme: 'supersetColors',
  show_labels: true,
  show_legend: true,
  label_type: 'key_value_percent',
  number_format: 'SMART_NUMBER',
  sort_by_metric: true,
  row_limit: 100,
  donut: false,
  show_total: false,
  labels_outside: true,
  outerRadius: 70,
  innerRadius: 30,
  date_format: 'smart_date',
};
const DATASET = {
  columns: ['DATE', 'DATE_TIME', 'PLACE', 'SELLER', 'DEVICE', 'DEVICE_TYPE', 'STATUS_DESC', 'ACCOUNT', 'MOVEMENT_CATEGORY_DESC', 'VALUE_MONEY'],
  metrics: ['Total validaciones'],
  dateColumns: ['DATE', 'DATE_TIME'],
};
const BOT = [{ id: 47, username: 'MET_BOT_PAY' }];

describe('assessSavedChart (rebuild with config)', () => {
  it('finds a donut created through the MCP reproducible', () => {
    expect(assessSavedChart(DONUT_3510)).toEqual({ kind: 'reproducible' });
  });

  it('refuses to rebuild the table: it would lose the 7-day range', () => {
    const assessment = assessSavedChart(TABLE_3504);
    expect(assessment.kind).toBe('not_reproducible');
  });
});

describe('renameOldNames (after the MCP saves a chart)', () => {
  const MCP_LINE = {
    viz_type: 'echarts_timeseries_line',
    x_axis: 'DATE',
    metrics: ['Total validaciones'],
    legend_orientation: 'bottom',
    y_axis_scale: 'log',
    x_axis_format: '%m/%Y',
  };

  it("moves the MCP's old names to the controls the editor reads, the log scale as true/false", () => {
    expect(renameOldNames(MCP_LINE)).toEqual({
      params: {
        viz_type: 'echarts_timeseries_line',
        x_axis: 'DATE',
        metrics: ['Total validaciones'],
        legendOrientation: 'bottom',
        logAxis: true,
        x_axis_time_format: '%m/%Y',
      },
      renamed: ['legend_orientation', 'y_axis_scale', 'x_axis_format'],
    });
    expect(renameOldNames({ ...MCP_LINE, y_axis_scale: 'linear' }).params['logAxis']).toBe(false);
  });

  it('keeps a control already set and only drops its old name; touches nothing else', () => {
    expect(renameOldNames({ viz_type: 'big_number_total', metric: 'Total ventas', subheader: 'viejo', subtitle: 'nuevo' })).toEqual({
      params: { viz_type: 'big_number_total', metric: 'Total ventas', subtitle: 'nuevo' },
      renamed: ['subheader'],
    });
    expect(renameOldNames(TABLE_3504)).toEqual({ params: TABLE_3504, renamed: [] });
  });

  it('leaves a renamed chart as rebuildable as it was', () => {
    expect(assessSavedChart(MCP_LINE)).toEqual({ kind: 'reproducible' });
    expect(assessSavedChart(renameOldNames(MCP_LINE).params)).toEqual({ kind: 'reproducible' });
  });
});

describe('checkChanges (partial change)', () => {
  it('removes a column and keeps everything else as saved', () => {
    const groupby = TABLE_3504.groupby.filter((column) => column !== 'STATUS_DESC');
    const check = checkChanges(TABLE_3504, { groupby }, { dataset: DATASET });
    if (!check.ok) throw new Error(check.reason);
    expect(check.params).toEqual({ ...TABLE_3504, groupby });
    expect(check.changed).toEqual({ groupby: { before: TABLE_3504.groupby, after: groupby } });
    expect(check.resetsData).toBe(true);
  });

  it('changes a look setting without resetting the data', () => {
    const check = checkChanges(DONUT_3510, { legendOrientation: 'bottom' });
    expect(check).toMatchObject({ ok: true, resetsData: false, params: { ...DONUT_3510, legendOrientation: 'bottom' } });
  });

  it('refuses keys that are not editable, invalid values and unknown names', () => {
    expect(checkChanges(DONUT_3510, { label_colors: { Android: '#00ff00' } })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('dashboard manager'),
    });
    expect(checkChanges(DONUT_3510, { legendOrientation: 'middle' })).toMatchObject({ ok: false });
    expect(checkChanges(DONUT_3510, { outerRadius: 5 })).toMatchObject({ ok: false });
    expect(checkChanges(TABLE_3504, { groupby: ['ESTADO'] }, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("'ESTADO'"),
    });
    expect(checkChanges(DONUT_3510, { metric: 'Ventas' }, { dataset: DATASET })).toMatchObject({ ok: false });
    expect(checkChanges(TABLE_3504, { groupby: ['PLACE'] })).toMatchObject({ ok: false, reason: expect.stringContaining('dataset') });
  });

  it("applies a log scale sent under the MCP's old name as true/false", () => {
    const line = { viz_type: 'echarts_timeseries_line', x_axis: 'DATE', metrics: ['Total validaciones'], y_axis_scale: 'linear' };
    const check = checkChanges(line, { y_axis_scale: 'log' });
    if (!check.ok) throw new Error(check.reason);
    expect(check.params).toMatchObject({ logAxis: true });
    expect(check.params).not.toHaveProperty('y_axis_scale');
  });

  it('applies a change sent under an old MCP name to its control, and drops the old name', () => {
    const line = { viz_type: 'echarts_timeseries_line', x_axis: 'DATE', metrics: ['Total validaciones'], legend_orientation: 'right' };
    const check = checkChanges(line, { legend_orientation: 'bottom' });
    if (!check.ok) throw new Error(check.reason);
    expect(check.params['legendOrientation']).toBe('bottom');
    expect(check.params).not.toHaveProperty('legend_orientation');
    expect(check.changed).toEqual({ legendOrientation: { before: 'right', after: 'bottom' } });
  });

  it('keeps saved filters, writes new ones in the server shape and refuses unknown time ranges', () => {
    const placeFilter = { subject: 'PLACE', operator: '==', comparator: 'Centro' };
    const added = checkChanges(TABLE_3504, { adhoc_filters: [SEVEN_DAYS, placeFilter] }, { dataset: DATASET });
    if (!added.ok) throw new Error(added.reason);
    expect(added.params['adhoc_filters']).toEqual([SEVEN_DAYS, { ...placeFilter, clause: 'WHERE', expressionType: 'SIMPLE' }]);

    const lastMonth = { ...SEVEN_DAYS, comparator: 'Last month' };
    expect(checkChanges(TABLE_3504, { adhoc_filters: [lastMonth] }, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges(TABLE_3504, { adhoc_filters: [{ ...SEVEN_DAYS, comparator: 'last_7_days' }] }, { dataset: DATASET })).toMatchObject({
      ok: false,
    });
  });

  it('says a list that arrived as unparsed text is not valid JSON, instead of calling it incomplete', () => {
    const unescaped = '[{"subject": "DATE_TIME", "operator": "TEMPORAL_RANGE", "comparator": "DATEADD(DATETIME("now"), -30, day) : now"}]';
    expect(checkChanges(TABLE_3504, { adhoc_filters: unescaped }, { dataset: DATASET })).toEqual({
      ok: false,
      reason: expect.stringContaining('not valid JSON'),
    });
  });

  it('never drops or writes a custom SQL filter', () => {
    const sqlFilter = { clause: 'WHERE', expressionType: 'SQL', sqlExpression: "STATUS_DESC <> 'ANULADA'" };
    const withSql = { ...TABLE_3504, adhoc_filters: [SEVEN_DAYS, sqlFilter] };
    expect(checkChanges(withSql, { adhoc_filters: [SEVEN_DAYS] }, { dataset: DATASET })).toMatchObject({ ok: false });
    expect(checkChanges(withSql, { adhoc_filters: [sqlFilter] }, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges(TABLE_3504, { adhoc_filters: [sqlFilter] }, { dataset: DATASET })).toMatchObject({ ok: false });
  });

  it('recognizes a saved filter sent back with its keys in another order', () => {
    const sqlFilter = { clause: 'WHERE', expressionType: 'SQL', sqlExpression: "STATUS_DESC <> 'ANULADA'" };
    const withSql = { ...TABLE_3504, adhoc_filters: [SEVEN_DAYS, sqlFilter] };
    const reordered = { sqlExpression: "STATUS_DESC <> 'ANULADA'", expressionType: 'SQL', clause: 'WHERE' };
    const kept = checkChanges(withSql, { adhoc_filters: [SEVEN_DAYS, reordered] }, { dataset: DATASET });
    expect(kept).toMatchObject({ ok: true });
  });

  it('refuses a change that would not show, as Superset hides that control', () => {
    expect(checkChanges(DONUT_3510, { innerRadius: 50 })).toMatchObject({ ok: false, reason: expect.stringContaining("'donut' is true") });
    expect(checkChanges(DONUT_3510, { donut: true, innerRadius: 50 })).toMatchObject({ ok: true });
    const hiddenLegend = { ...DONUT_3510, show_legend: false };
    expect(checkChanges(hiddenLegend, { legendOrientation: 'bottom' })).toMatchObject({ ok: false });
    expect(checkChanges(hiddenLegend, { show_legend: true, legendOrientation: 'bottom' })).toMatchObject({ ok: true });
    const { show_legend: _legend, show_labels: _labels, ...neverSaved } = DONUT_3510;
    expect(checkChanges(neverSaved, { legendOrientation: 'bottom', labels_outside: false })).toMatchObject({ ok: true });
    expect(checkChanges(DONUT_3510, { show_labels: false })).toMatchObject({ ok: true });
  });

  it('applies a time grain only to a date x-axis', () => {
    const bars = { viz_type: 'echarts_timeseries_bar', x_axis: 'PLACE', metrics: ['Total validaciones'] };
    expect(neededContext(bars, { time_grain_sqla: 'P1W' }).dataset).toBe(true);
    expect(checkChanges(bars, { time_grain_sqla: 'P1W' }, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('date column'),
    });
    expect(checkChanges({ ...bars, x_axis: 'DATE' }, { time_grain_sqla: 'P1W' }, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges(bars, { x_axis: 'DATE', time_grain_sqla: 'P1W' }, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges({ ...bars, x_axis: 'DATE' }, { time_grain_sqla: 'P1W' })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('Retry'),
    });
  });

  it('knows when the dataset names are needed', () => {
    expect(neededContext(TABLE_3504, { groupby: [] }).dataset).toBe(true);
    expect(neededContext(TABLE_3504, { include_search: false }).dataset).toBe(false);
    expect(neededContext(DONUT_3510, { legend_orientation: 'top' }).dataset).toBe(false);
  });

  it('offers each table control only in the mode it takes effect in', () => {
    const sortByColumn = { order_by_cols: ['["DATE_TIME", false]'] };
    expect(checkChanges(TABLE_3504, sortByColumn, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('timeseries_limit_metric'),
    });
    const rawTable = { ...TABLE_3504, query_mode: 'raw', groupby: [], all_columns: ['DATE_TIME', 'PLACE'] };
    expect(checkChanges(rawTable, sortByColumn, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges(rawTable, { groupby: ['PLACE'] }, { dataset: DATASET })).toMatchObject({ ok: false });
  });
});

describe('checkChanges (settings enabled on 2026-10-15)', () => {
  it('changes the color palette, unless the selected dashboard imposes its own', () => {
    expect(checkChanges(DONUT_3510, { color_scheme: 'blueToGreen' })).toMatchObject({ ok: true, params: { color_scheme: 'blueToGreen' } });
    expect(checkChanges(DONUT_3510, { color_scheme: 'green' })).toMatchObject({ ok: false });
    expect(neededContext(DONUT_3510, { color_scheme: 'blueToGreen' }).dashboard).toBe(true);
    expect(checkChanges(DONUT_3510, { color_scheme: 'blueToGreen' }, { dashboardColorScheme: 'bnbColors' })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('color scheme of its own'),
    });
    expect(checkChanges(DONUT_3510, { color_scheme: 'blueToGreen' }, { dashboardColorScheme: '' })).toMatchObject({ ok: true });
  });

  it("switches a table between grouped and one row per record only with the new mode's columns", () => {
    expect(checkChanges(TABLE_3504, { query_mode: 'raw' }, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('all_columns'),
    });
    const toRaw = checkChanges(TABLE_3504, { query_mode: 'raw', all_columns: ['DATE_TIME', 'PLACE'] }, { dataset: DATASET });
    expect(toRaw).toMatchObject({ ok: true, resetsData: true, params: { query_mode: 'raw', all_columns: ['DATE_TIME', 'PLACE'] } });
    expect(checkChanges(TABLE_3504, { query_mode: 'raw', all_columns: ['ESTADO'] }, { dataset: DATASET })).toMatchObject({ ok: false });
    const rawTable = { ...TABLE_3504, query_mode: 'raw', groupby: [], all_columns: ['DATE_TIME'] };
    expect(checkChanges(rawTable, { query_mode: 'aggregate', groupby: ['PLACE'] }, { dataset: DATASET })).toMatchObject({ ok: true });
    const card = { viz_type: 'handlebars', query_mode: 'aggregate', groupby: ['PLACE'], metrics: ['Total validaciones'] };
    expect(checkChanges(card, { query_mode: 'raw', all_columns: ['PLACE', 'VALUE_MONEY'] }, { dataset: DATASET })).toMatchObject({ ok: true });
    const { query_mode: _mode, ...inferred } = rawTable;
    expect(checkChanges(inferred, { order_by_cols: ['["DATE_TIME", true]'] }, { dataset: DATASET })).toMatchObject({ ok: true });
  });

  it("ignores the old mode's keys sent empty while switching modes, and points to the new mode's key otherwise", () => {
    const toRaw = checkChanges(
      TABLE_3504,
      { query_mode: 'raw', all_columns: ['DATE_TIME', 'PLACE'], groupby: null, metrics: [] },
      { dataset: DATASET }
    );
    expect(toRaw).toMatchObject({ ok: true });
    if (toRaw.ok) expect(toRaw.params['groupby']).toEqual(TABLE_3504.groupby);
    const rawTable = { ...TABLE_3504, query_mode: 'raw', all_columns: ['DATE_TIME'] };
    expect(checkChanges(rawTable, { groupby: ['PLACE'] }, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('grouped rows'),
    });
  });

  it('takes a number or true/false sent as text as that value, only when the control takes it', () => {
    const bars = { viz_type: 'echarts_timeseries_bar', x_axis: 'DATE', metrics: ['Total validaciones'] };
    expect(checkChanges(bars, { xAxisLabelRotation: '45' })).toMatchObject({ ok: true, params: { xAxisLabelRotation: 45 } });
    expect(checkChanges(bars, { zoomable: 'true' })).toMatchObject({ ok: true, params: { zoomable: true } });
    expect(checkChanges(bars, { xAxisLabelRotation: '30' })).toMatchObject({ ok: false });
    expect(checkChanges({ ...DONUT_3510, donut: true }, { innerRadius: '50' })).toMatchObject({ ok: true, params: { innerRadius: 50 } });
  });

  it('writes a saved metric sent as the MCP references it by its name, and refuses a new label', () => {
    const ref = { name: 'Total validaciones', saved_metric: true };
    expect(checkChanges(TABLE_3504, { metrics: [ref] }, { dataset: DATASET })).toMatchObject({
      ok: true,
      params: { metrics: ['Total validaciones'] },
    });
    expect(checkChanges(TABLE_3504, { metrics: [{ ...ref, label: 'Recaudo' }] }, { dataset: DATASET })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('label'),
    });
  });

  it('writes the subtitle of a key number and drops the old name the MCP wrote', () => {
    const total = { viz_type: 'big_number_total', metric: 'Total validaciones', subheader: 'hoy' };
    const check = checkChanges(total, { subtitle: 'Validaciones de hoy', subtitle_font_size: 0.2 });
    if (!check.ok) throw new Error(check.reason);
    expect(check.params).not.toHaveProperty('subheader');
    expect(check.changed['subtitle']).toEqual({ before: 'hoy', after: 'Validaciones de hoy' });
  });

  it("shows a key number's metric name, and sizes it only while it is shown", () => {
    const total = { viz_type: 'big_number_total', metric: 'Total validaciones' };
    expect(checkChanges(total, { show_metric_name: true, metric_name_font_size: 0.2 })).toMatchObject({ ok: true });
    expect(checkChanges(total, { metric_name_font_size: 0.2 })).toMatchObject({ ok: false });
  });

  it('adds conditional formatting only on a column the table shows, with a known operator and color', () => {
    const rule = { column: 'VALUE_MONEY', operator: '>', targetValue: 1000, colorScheme: 'colorSuccess' };
    expect(checkChanges(TABLE_3504, { conditional_formatting: [rule] })).toMatchObject({ ok: true, resetsData: false });
    expect(checkChanges(TABLE_3504, { conditional_formatting: [{ ...rule, column: 'ESTADO' }] })).toMatchObject({ ok: false });
    expect(checkChanges(TABLE_3504, { conditional_formatting: [{ ...rule, colorScheme: 'green' }] })).toMatchObject({ ok: false });
    expect(checkChanges(TABLE_3504, { conditional_formatting: [{ ...rule, operator: '< x <' }] })).toMatchObject({ ok: false });
    const range = { ...rule, operator: '< x <', targetValueLeft: 0, targetValueRight: 10 };
    expect(checkChanges(TABLE_3504, { conditional_formatting: [range] })).toMatchObject({ ok: true });
  });

  it('adds percentage metrics, and pages on the server only with server pagination on', () => {
    expect(checkChanges(TABLE_3504, { percent_metrics: ['Total validaciones'] }, { dataset: DATASET })).toMatchObject({ ok: true });
    expect(checkChanges(TABLE_3504, { server_page_length: 50 })).toMatchObject({ ok: false });
    expect(checkChanges(TABLE_3504, { server_pagination: true, server_page_length: 50 })).toMatchObject({ ok: true, resetsData: true });
  });

  it('sets y-axis bounds only with the bounds turned on', () => {
    const line = { viz_type: 'echarts_timeseries_line', x_axis: 'DATE', metrics: ['Total validaciones'] };
    expect(checkChanges(line, { y_axis_bounds: [0, null] })).toMatchObject({ ok: false });
    expect(checkChanges(line, { truncateYAxis: true, y_axis_bounds: [0, null] })).toMatchObject({ ok: true });
    expect(checkChanges(line, { truncateYAxis: true, y_axis_bounds: [0] })).toMatchObject({ ok: false });
  });

  it('changes the settings of a pivot table, a heatmap, a mixed chart and a funnel', () => {
    const pivot = { viz_type: 'pivot_table_v2', groupbyRows: ['PLACE'], groupbyColumns: [], metrics: ['Total validaciones'] };
    expect(checkChanges(pivot, { rowTotals: true, aggregateFunction: 'Sum' })).toMatchObject({ ok: true });
    expect(checkChanges(pivot, { groupbyColumns: ['DEVICE'] }, { dataset: DATASET })).toMatchObject({ ok: true, resetsData: true });
    expect(
      checkChanges(pivot, { conditional_formatting: [{ column: 'Total validaciones', operator: 'None', colorScheme: 'colorError' }] })
    ).toMatchObject({
      ok: true,
    });
    const heatmap = { viz_type: 'heatmap_v2', x_axis: 'DATE', groupby: ['PLACE'], metric: 'Total validaciones' };
    expect(checkChanges(heatmap, { linear_color_scheme: 'schemeGreens', show_values: true })).toMatchObject({ ok: true });
    const sqlFilter = { clause: 'WHERE', expressionType: 'SQL', sqlExpression: "STATUS_DESC <> 'ANULADA'" };
    const mixed = { viz_type: 'mixed_timeseries', x_axis: 'DATE', metrics: ['Total validaciones'], adhoc_filters_b: [sqlFilter] };
    expect(checkChanges(mixed, { seriesTypeB: 'bar', yAxisIndexB: 1 })).toMatchObject({ ok: true });
    expect(checkChanges(mixed, { adhoc_filters_b: [] }, { dataset: DATASET })).toMatchObject({ ok: false, reason: expect.stringContaining('SQL') });
    const funnel = { viz_type: 'funnel', groupby: ['STATUS_DESC'], metric: 'Total validaciones' };
    expect(checkChanges(funnel, { label_type: 5, percent_calculation_type: 'prev_step' })).toMatchObject({ ok: true });
    expect(checkChanges(funnel, { label_type: 'key' })).toMatchObject({ ok: false });
  });

  it('keeps refusing the chart types that are not mapped', () => {
    expect(checkChanges({ viz_type: 'gauge_chart' }, { show_legend: false })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('dashboard manager'),
    });
  });
});

describe('describeUpdateSupport', () => {
  it('lists what can change on a chart the bot owns', () => {
    const support = describeUpdateSupport(TABLE_3504, { owners: BOT, account: 'MET_BOT_PAY' });
    expect(support).toMatchObject({ editable: expect.objectContaining({ groupby: expect.any(String), include_search: expect.any(String) }) });
    expect(support).toMatchObject({ chart_type_change: expect.stringContaining('not possible') });
  });

  it('tells, next to each control, the setting it depends on', () => {
    const support = describeUpdateSupport(DONUT_3510, { owners: BOT, account: 'MET_BOT_PAY' }) as { editable: Record<string, string> };
    expect(support.editable['innerRadius']).toContain("only while 'donut' is true");
    expect(support.editable['donut']).not.toContain('only while');
  });

  it("tells Superset's default next to a control, by chart type when the types differ", () => {
    const support = describeUpdateSupport(DONUT_3510, { owners: BOT, account: 'MET_BOT_PAY' }) as { editable: Record<string, string> };
    expect(support.editable['legendOrientation']).toContain('default "top"');
    expect(support.editable['innerRadius']).toContain('default 30');
    expect(support.editable['color_scheme']).not.toMatch(/; default /);
    const bars = describeUpdateSupport({ viz_type: 'echarts_timeseries_bar', metrics: ['x'] }, { owners: BOT, account: 'MET_BOT_PAY' }) as {
      editable: Record<string, string>;
    };
    const lines = describeUpdateSupport({ viz_type: 'echarts_timeseries_line', metrics: ['x'] }, { owners: BOT, account: 'MET_BOT_PAY' }) as {
      editable: Record<string, string>;
    };
    expect(bars.editable['y_axis_title_margin']).toContain('default 15');
    expect(lines.editable['y_axis_title_margin']).toContain('default 0');
  });

  it('says a chart of other users cannot be changed', () => {
    expect(describeUpdateSupport(TABLE_3504, { owners: [{ username: 'miguelciro' }], account: 'MET_BOT_PAY' })).toEqual(
      expect.stringContaining('belongs to other users')
    );
  });

  it('falls back to the rebuild rule without the REST API', () => {
    expect(describeUpdateSupport(DONUT_3510)).toBe('A change to this chart can be made and saved from here.');
  });

  it('offers the settings of a type that cannot be rebuilt, and nothing for an unmapped one', () => {
    const pivot = { viz_type: 'pivot_table_v2', groupbyRows: ['PLACE'], metrics: ['Total validaciones'] };
    expect(assessSavedChart(pivot)).toEqual({ kind: 'unsupported_type', vizType: 'pivot_table_v2' });
    expect(describeUpdateSupport(pivot, { owners: BOT, account: 'MET_BOT_PAY' })).toMatchObject({
      editable: expect.objectContaining({ rowTotals: expect.any(String) }),
      chart_type_change: expect.stringContaining('cannot be rebuilt'),
    });
    expect(describeUpdateSupport(pivot)).toEqual(expect.stringContaining('cannot be changed from here'));
    expect(describeUpdateSupport({ viz_type: 'gauge_chart' }, { owners: BOT, account: 'MET_BOT_PAY' })).toEqual(
      expect.stringContaining('cannot be changed from here')
    );
  });
});

describe('Superset defaults in the map of controls', () => {
  it('are values the control itself takes', () => {
    for (const [family, controls] of Object.entries(EDITABLE_CONTROLS))
      for (const [key, control] of Object.entries(controls)) {
        const defaults = control.byDefaultByVizType ? Object.values(control.byDefaultByVizType) : 'byDefault' in control ? [control.byDefault] : [];
        for (const value of defaults) {
          if (control.values) expect([family, key, control.values.includes(value)]).toEqual([family, key, true]);
          if (control.range && typeof value === 'number')
            expect([family, key, value >= control.range[0] && value <= control.range[1]]).toEqual([family, key, true]);
        }
        for (const vizType of Object.keys(control.byDefaultByVizType ?? {})) expect([key, familyOf(vizType)]).toEqual([key, family]);
      }
  });

  it('are told apart from an unknown default, including a known null', () => {
    expect(defaultOf(EDITABLE_CONTROLS['xy']!['stack']!, 'echarts_timeseries_bar')).toEqual({ found: true, value: null });
    expect(defaultOf(EDITABLE_CONTROLS['xy']!['color_scheme']!, 'echarts_timeseries_bar')).toEqual({ found: false });
    expect(defaultOf(EDITABLE_CONTROLS['table']!['allow_rearrange_columns']!, 'ag-grid-table')).toEqual({ found: false });
  });
});
