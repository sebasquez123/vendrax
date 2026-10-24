import { z } from 'zod';

export const CHART_TYPE_VALUES = ['xy', 'table', 'pie', 'big_number', 'handlebars'] as const;
export type ChartType = (typeof CHART_TYPE_VALUES)[number];

export const ChartTypeSchema = z
  .enum(CHART_TYPE_VALUES)
  .describe(
    "Chart type to build. 'xy': line/bar/area/scatter (requires 'kind'). 'table': tabular list of columns. " +
      "'pie': single categorical breakdown. 'big_number': single KPI value, optionally with a trendline. " +
      "'handlebars': custom HTML card/report template. Other chart types (e.g. pivot_table, mixed_timeseries) " +
      "can be inspected with 'get_chart_type_schema' but cannot be built through this tool yet."
  );

const TIME_GRAIN_DOC =
  'Bucket size for the temporal axis. Plain ISO 8601 durations (recommended): PT1M/PT5M/PT15M/PT30M=minutes, ' +
  'PT1H/PT6H=hours, P1D=daily, P1W=weekly, P1M=monthly, P3M=quarterly, P1Y=yearly. ' +
  "The two date-anchored week values are special week-start markers: '1969-12-28T00:00:00Z/P1W' = weekly " +
  "starting Sunday, '1969-12-29T00:00:00Z/P1W' = weekly starting Monday. Prefer 'P1W' unless the user needs a specific week-start day.";

export const TIME_GRAIN_VALUES = [
  'PT1S',
  'PT5S',
  'PT30S',
  'PT1M',
  'PT5M',
  'PT10M',
  'PT15M',
  'PT30M',
  'PT0.5H',
  'PT1H',
  'PT6H',
  'P1D',
  'P1W',
  '1969-12-28T00:00:00Z/P1W',
  '1969-12-29T00:00:00Z/P1W',
  'P1W/1970-01-03T00:00:00Z',
  'P1W/1970-01-04T00:00:00Z',
  'P1M',
  'P3M',
  'P0.25Y',
  'P1Y',
] as const;

export const TimeGrainSchema = z.enum(TIME_GRAIN_VALUES).describe(TIME_GRAIN_DOC);

export const AxisFieldSchema = z.object({
  name: z
    .string()
    .describe(
      "Column or saved metric name, exactly as returned by 'get_dataset_info' or 'get_chart_info' form_data. Never a display label, verbose name, or glossary term."
    ),
  label: z.string().optional().describe('Custom display label shown in the chart legend/axis.'),
  dtype: z.string().optional().describe("Dataset column data type, as returned by 'get_dataset_info' (e.g. VARCHAR, NUMERIC, TIMESTAMP)."),
  aggregate: z
    .enum(['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT', 'STDDEV', 'VAR', 'MEDIAN', 'PERCENTILE'])
    .optional()
    .describe('Aggregation applied to a raw column. Omit when name is already a saved metric.'),
  saved_metric: z.boolean().optional().describe("True when 'name' is a saved metric from the dataset, not a raw column."),
});

export const XAxisSchema = z.object({
  title: z.string().optional().describe('Axis title text.'),
});

export const YAxisSchema = XAxisSchema.extend({
  format: z.string().optional().describe("D3 number format string for axis ticks, for example ',.1f' or '.0%'."),
});

export const LegendSchema = z.object({
  show: z.boolean().optional().describe('Whether to render the legend.'),
  position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
});

export const ChartFilterValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])
  .describe("Value to compare. Use an array of strings/numbers only when 'op' is 'IN' or 'NOT IN'.");

export const ChartFilterSchema = z.object({
  column: z.string().describe("Dataset column name to filter on, as returned by 'get_dataset_info'."),
  op: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'NOT LIKE', 'IN', 'NOT IN']).describe('Comparison operator.'),
  value: ChartFilterValueSchema,
});

export const ChartConfigSchema = z
  .object({
    chart_type: ChartTypeSchema,

    kind: z.enum(['bar', 'line', 'area', 'scatter']).optional().describe('(xy only, required) Visual sub-type of the xy chart.'),
    x: AxisFieldSchema.optional().describe('(xy only) X-axis dimension, typically the temporal or categorical column.'),
    y: z.array(AxisFieldSchema).optional().describe('(xy only, required, min 1) Metric(s) or numeric columns plotted on the Y axis.'),
    orientation: z.enum(['vertical', 'horizontal']).optional().describe('(xy only) Bar orientation.'),
    stacked: z.boolean().optional().describe('(xy only) Stack series instead of grouping them side by side.'),
    time_grain: TimeGrainSchema.optional().describe(`(xy and big_number only) ${TIME_GRAIN_DOC}`),
    group_by: z.array(AxisFieldSchema).optional().describe('(xy only) Dimension(s) used to split the data into separate series.'),
    x_axis: XAxisSchema.optional().describe('(xy only) X-axis display options.'),
    y_axis: YAxisSchema.optional().describe('(xy only) Y-axis display options.'),
    legend: LegendSchema.optional().describe("(xy only) Legend display options. A pie uses 'show_legend'."),

    viz_type: z
      .enum(['table', 'ag-grid-table'])
      .optional()
      .describe("(table only) 'table' for a standard grid, 'ag-grid-table' for an interactive AG Grid."),
    columns: z.array(AxisFieldSchema).optional().describe('(table only, required, min 1) Dataset columns to display, in display order.'),

    dimension: AxisFieldSchema.optional().describe('(pie only, required) Categorical dataset column that defines each pie slice.'),
    metric: AxisFieldSchema.optional().describe('(pie and big_number only, required) Saved metric or aggregated numeric column to measure.'),
    donut: z.boolean().optional().describe('(pie only) Render as a donut chart instead of a filled pie.'),
    show_labels: z.boolean().optional().describe('(pie only) Show value/percent labels on slices.'),
    label_type: z
      .enum(['key', 'value', 'percent', 'key_value', 'key_percent', 'key_value_percent'])
      .optional()
      .describe('(pie only) Content shown in slice labels.'),
    sort_by_metric: z.boolean().optional().describe('(pie only) Sort slices by metric value instead of category order.'),
    show_legend: z.boolean().optional().describe('(pie only) Show the slice legend.'),
    number_format: z.string().optional().describe("(pie only) D3 number format applied to slice values, for example ',.2f'."),
    show_total: z.boolean().optional().describe('(pie only) Show the aggregated total in the center (donut) or as a label.'),
    labels_outside: z.boolean().optional().describe('(pie only) Render labels outside the pie instead of inside each slice.'),
    outer_radius: z.number().optional().describe('(pie only) Outer radius as a percentage of the available space (0-100).'),
    inner_radius: z
      .number()
      .optional()
      .describe('(pie only) Inner radius as a percentage of the outer radius (0-100); ignored unless donut is true.'),

    show_trendline: z.boolean().optional().describe('(big_number only) Show a small trendline below the KPI value. Requires temporal_column.'),
    temporal_column: z
      .string()
      .optional()
      .describe('(big_number only, required when show_trendline is true) Dataset date/time column used to draw the trendline.'),
    y_axis_format: z.string().optional().describe("(big_number only) D3 number format applied to the KPI value, for example '$,.2f'."),

    handlebars_template: z
      .string()
      .optional()
      .describe(
        "(handlebars only, required) Handlebars HTML template. Data rows are available as the '{{data}}' array; " +
          "helpers 'dateFormat', 'formatNumber', and 'stringify' are available."
      ),
    query_mode: z.enum(['aggregate', 'raw']).optional().describe("(handlebars only, required) 'aggregate' uses metrics/groupby; 'raw' uses columns."),
    metrics: z.array(AxisFieldSchema).optional().describe("(handlebars only) Metrics to aggregate; required when query_mode is 'aggregate'."),
    groupby: z
      .array(AxisFieldSchema)
      .optional()
      .describe(
        "(handlebars only) Dimension(s) used to group rows when query_mode is 'aggregate'. Note the field name has no underscore, unlike xy's 'group_by'."
      ),
    order_desc: z.boolean().optional().describe('(handlebars only) Sort aggregated rows in descending order. Defaults to true.'),
    style_template: z.string().optional().describe('(handlebars only) Optional CSS applied to the rendered template.'),

    filters: z.array(ChartFilterSchema).optional().describe('Row-level filters applied before rendering the chart.'),
    row_limit: z.number().optional().describe('(all but big_number) Maximum number of rows fetched from the dataset.'),
  })
  .superRefine((config, ctx) => {
    const requireField = (condition: boolean, field: keyof typeof config, message: string) => {
      if (condition && (config[field] === undefined || config[field] === null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    };

    requireField(config.chart_type === 'xy', 'kind', "'kind' is required when chart_type is 'xy'.");
    requireField(config.chart_type === 'xy', 'y', "'y' (at least one metric) is required when chart_type is 'xy'.");
    if (config.chart_type === 'xy' && config.y && config.y.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['y'], message: "'y' must contain at least one field when chart_type is 'xy'." });
    }

    requireField(config.chart_type === 'table', 'columns', "'columns' (at least one column) is required when chart_type is 'table'.");
    if (config.chart_type === 'table' && config.columns && config.columns.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['columns'],
        message: "'columns' must contain at least one field when chart_type is 'table'.",
      });
    }

    requireField(config.chart_type === 'pie', 'dimension', "'dimension' is required when chart_type is 'pie'.");
    requireField(
      config.chart_type === 'pie' || config.chart_type === 'big_number',
      'metric',
      "'metric' is required when chart_type is 'pie' or 'big_number'."
    );

    if (config.chart_type === 'pie' && config.legend) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['legend'], message: "A pie has no 'legend' field: use 'show_legend'." });
    }
    if (config.chart_type === 'big_number' && config.row_limit !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['row_limit'], message: "A big_number takes no 'row_limit'." });
    }

    if (config.chart_type === 'big_number' && config.show_trendline && !config.temporal_column) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['temporal_column'], message: "'temporal_column' is required when show_trendline is true." });
    }

    if (config.chart_type === 'handlebars') {
      requireField(true, 'handlebars_template', "'handlebars_template' is required when chart_type is 'handlebars'.");
      requireField(true, 'query_mode', "'query_mode' is required when chart_type is 'handlebars'.");
      if (config.query_mode === 'aggregate' && (!config.metrics || config.metrics.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['metrics'], message: "'metrics' is required when query_mode is 'aggregate'." });
      }
      if (config.query_mode === 'raw' && (!config.columns || config.columns.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['columns'], message: "'columns' is required when query_mode is 'raw'." });
      }
    }
  });

export type ChartConfigType = z.infer<typeof ChartConfigSchema>;
