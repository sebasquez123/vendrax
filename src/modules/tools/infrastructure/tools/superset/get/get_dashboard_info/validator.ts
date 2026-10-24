import { z } from 'zod';

const DashboardChartSchema = z.object({
  id: z.number().nullable().optional(),
  slice_name: z.string().nullable().optional(),
  viz_type: z.string().nullable().optional(),
  datasource_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const GetDashboardInfoContentSchema = z.object({
  id: z.number().nullable().optional(),
  uuid: z.string().nullable().optional(),
  dashboard_title: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  css: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
  published: z.boolean().nullable().optional(),
  is_managed_externally: z.boolean().nullable().optional(),
  external_url: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  created_on: z.string().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  changed_by: z.string().nullable().optional(),
  created_on_humanized: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  chart_count: z.number().nullable().optional(),
  charts: z.array(DashboardChartSchema).nullable().optional(),
  owners: z.array(z.unknown()).nullable().optional(),
  tags: z.array(z.unknown()).nullable().optional(),
  roles: z.array(z.unknown()).nullable().optional(),
  native_filters: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        filter_type: z.string().nullable().optional(),
        targets: z.array(z.unknown()).nullable().optional(),
      })
    )
    .nullable()
    .optional(),
  cross_filters_enabled: z.boolean().nullable().optional(),
  omitted_fields: z.record(z.string(), z.string()).nullable().optional(),
  permalink_key: z.string().nullable().optional(),
  is_permalink_state: z.boolean().nullable().optional(),
  filter_state: z.unknown().nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const GetDashboardInfoOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GetDashboardInfoOutputType = z.infer<typeof GetDashboardInfoOutputSchema>;

export const GetDashboardInfoInputSchema = z.object({
  dashboard_id: z.number().describe("Dashboard ID to inspect, as returned by 'list_dashboards' or the currently selected dashboard."),
});

export type GetDashboardInfoInputType = z.infer<typeof GetDashboardInfoInputSchema>;
