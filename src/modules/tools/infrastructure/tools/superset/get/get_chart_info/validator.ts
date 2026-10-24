import { z } from 'zod';

export const GetChartInfoContentSchema = z.object({
  id: z.number().nullable().optional(),
  slice_name: z.string().nullable().optional(),
  uuid: z.string().nullable().optional(),
  viz_type: z.string().nullable().optional(),
  datasource_name: z.string().nullable().optional(),
  datasource_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  cache_timeout: z.number().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_on: z.string().nullable().optional(),
  created_on_humanized: z.string().nullable().optional(),
  changed_by: z.string().nullable().optional(),
  changed_by_name: z.string().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
  form_data: z.record(z.string(), z.unknown()).nullable().optional(),
  form_data_key: z.string().nullable().optional(),
  is_unsaved_state: z.boolean().nullable().optional(),
  owners: z.array(z.unknown()).nullable().optional(),
  tags: z.array(z.unknown()).nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const GetChartInfoOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GetChartInfoOutputType = z.infer<typeof GetChartInfoOutputSchema>;

export const GetChartInfoInputSchema = z.object({
  chart_id: z.number().describe("Chart ID to inspect, as returned by 'list_charts' or the current dashboard's chart list."),
});

export type GetChartInfoInputType = z.infer<typeof GetChartInfoInputSchema>;
