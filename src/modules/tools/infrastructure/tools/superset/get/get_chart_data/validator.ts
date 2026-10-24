import { z } from 'zod';

const ChartDataColumnSchema = z.object({
  name: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  data_type: z.string().nullable().optional(),
  sample_values: z.array(z.unknown()).nullable().optional(),
  null_count: z.number().nullable().optional(),
  unique_count: z.number().nullable().optional(),
  statistics: z.unknown().nullable().optional(),
  semantic_type: z.string().nullable().optional(),
});

export const GetChartDataContentSchema = z.object({
  chart_id: z.number().nullable().optional(),
  chart_name: z.string().nullable().optional(),
  chart_type: z.string().nullable().optional(),
  columns: z.array(ChartDataColumnSchema).nullable().optional(),
  data: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  row_count: z.number().nullable().optional(),
  total_rows: z.number().nullable().optional(),
  data_freshness: z.unknown().nullable().optional(),
  summary: z.string().nullable().optional(),
  insights: z.array(z.string()).nullable().optional(),
  data_quality: z.object({ completeness: z.number().nullable().optional() }).nullable().optional(),
  recommended_visualizations: z.array(z.string()).nullable().optional(),
  performance: z
    .object({
      query_duration_ms: z.number().nullable().optional(),
      estimated_cost: z.unknown().nullable().optional(),
      cache_status: z.string().nullable().optional(),
      optimization_suggestions: z.array(z.unknown()).nullable().optional(),
    })
    .nullable()
    .optional(),
  cache_status: z
    .object({
      cache_hit: z.boolean().nullable().optional(),
      cache_type: z.string().nullable().optional(),
      cache_age_seconds: z.number().nullable().optional(),
      cache_key: z.string().nullable().optional(),
      refreshed: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  csv_data: z.unknown().nullable().optional(),
  excel_data: z.unknown().nullable().optional(),
  format: z.string().nullable().optional(),
  schema_version: z.string().nullable().optional(),
  api_version: z.string().nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const GetChartDataOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GetChartDataOutputType = z.infer<typeof GetChartDataOutputSchema>;

export const GetChartDataInputSchema = z.object({
  chart_id: z.number().describe("Chart ID to fetch data for, as returned by 'list_charts' or the current dashboard's chart list."),
});

export type GetChartDataInputType = z.infer<typeof GetChartDataInputSchema>;
