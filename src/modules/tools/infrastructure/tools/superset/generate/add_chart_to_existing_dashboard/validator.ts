import { z } from 'zod';

const DashboardChartSchema = z.object({
  id: z.number(),
  slice_name: z.string(),
  viz_type: z.string(),
  datasource_name: z.string(),
  description: z.string().nullable(),
});
const DashboardSchema = z.object({
  id: z.number(),
  dashboard_title: z.string(),
  uuid: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  css: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
  published: z.boolean().nullable().optional(),
  is_managed_externally: z.boolean().nullable().optional(),
  created_on: z.string().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  changed_by: z.string().nullable().optional(),
  created_on_humanized: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  chart_count: z.number().nullable().optional(),
  charts: z.array(DashboardChartSchema).nullable().optional(),
  native_filters: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      })
    )
    .optional(),
});
export const AddChartToExistingDashboardContentSchema = z.object({
  dashboard: DashboardSchema.nullable().optional(),
  position: z
    .object({
      row: z.string().nullable().optional(),
      chart_key: z.string().nullable().optional(),
      row_key: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  error: z.unknown().nullable().optional(),
  permission_denied: z.boolean().nullable().optional(),
});

export const AddChartToExistingDashboardOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type AddChartToExistingDashboardOutputType = z.infer<typeof AddChartToExistingDashboardOutputSchema>;

export const AddChartToExistingDashboardInputSchema = z.object({
  dashboard_id: z.number().describe('Selected dashboard ID.'),
  chart_id: z.number().describe('One saved chart ID.'),
});

export type AddChartToExistingDashboardInputType = z.infer<typeof AddChartToExistingDashboardInputSchema>;
