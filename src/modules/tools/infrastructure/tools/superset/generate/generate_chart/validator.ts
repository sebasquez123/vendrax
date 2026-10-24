import { z } from 'zod';
import { ChartConfigSchema } from '../../shared/schemas/chart_config.schema';

const SemanticsSchema = z.object({
  primary_insight: z.string().nullable().optional(),
  data_story: z.string().nullable().optional(),
  recommended_actions: z.array(z.string()).nullable().optional(),
  anomalies: z.array(z.string()).nullable().optional(),
  statistical_summary: z.record(z.string(), z.unknown()).nullable().optional(),
});

const ChartFormDataSchema = z.object({
  viz_type: z.string().nullable().optional(),
  metrics: z.array(z.string()).nullable().optional(),
  x_axis: z.string().nullable().optional(),
  granularity_sqla: z.string().nullable().optional(),
  groupby: z.array(z.string()).nullable().optional(),
  all_columns: z.array(z.string()).nullable().optional(),
  columns: z.array(z.string()).nullable().optional(),
  query_mode: z.string().nullable().optional(),
  order_by_cols: z.array(z.string()).nullable().optional(),
  time_grain_sqla: z.string().nullable().optional(),
  metric: z.string().nullable().optional(),
  donut: z.boolean().nullable().optional(),
  row_limit: z.number().nullable().optional(),
  adhoc_filters: z.array(z.unknown()).nullable().optional(),
});

const ChartSchema = z.object({
  id: z.number().nullable().optional(),
  slice_name: z.string().nullable().optional(),
  uuid: z.string().nullable().optional(),
  viz_type: z.string().nullable().optional(),
  datasource_name: z.string().nullable().optional(),
  datasource_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  form_data: ChartFormDataSchema.nullable().optional(),
  form_data_key: z.string().nullable().optional(),
  is_unsaved_state: z.boolean().nullable().optional(),
});

export const GenerateChartContentSchema = z.object({
  chart: ChartSchema.nullable().optional(),
  capabilities: z.unknown().nullable().optional(),
  semantics: SemanticsSchema.nullable().optional(),
  embed_code: z.string().nullable().optional(),
  api_endpoints: z.record(z.string(), z.string()).nullable().optional(),
  form_data: ChartFormDataSchema.nullable().optional(),
  form_data_key: z.string().nullable().optional(),
  performance: z.unknown().nullable().optional(),
  accessibility: z.unknown().nullable().optional(),
  success: z.boolean().nullable().optional(),
  error: z.unknown().nullable().optional(),
  warnings: z.array(z.unknown()).nullable().optional(),
  schema_version: z.string().nullable().optional(),
  api_version: z.string().nullable().optional(),
});

export const GenerateChartOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GenerateChartOutputType = z.infer<typeof GenerateChartOutputSchema>;

export const GenerateChartInputSchema = z.object({
  dataset_id: z.number().describe("ID of the source dataset, as returned by 'list_datasets' or 'get_dataset_info'."),
  chart_name: z.string().describe('Descriptive title of the new chart, shown to end users.'),
  save_chart: z
    .boolean()
    .describe(
      "true: persist the chart and return a stable chart id (required before 'add_chart_to_existing_dashboard'). " +
        'false: generate a preview only, nothing is saved.'
    ),
  config: ChartConfigSchema,
});

export type GenerateChartInputType = z.infer<typeof GenerateChartInputSchema>;
