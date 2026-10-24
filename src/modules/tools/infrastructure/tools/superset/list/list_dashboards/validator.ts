import { z } from 'zod';
const selectableFieldsSchema = z.enum([
  'uuid',
  'created_on',
  'changed_on',
  'id',
  'dashboard_title',
  'position_json',
  'description',
  'css',
  'theme_id',
  'certified_by',
  'certification_details',
  'json_metadata',
  'slug',
  'published',
  'is_managed_externally',
  'external_url',
  'created_by_fk',
  'changed_by_fk',
  'url',
  'changed_by',
  'changed_by_name',
  'changed_on_humanized',
  'created_by',
  'created_by_name',
  'created_on_humanized',
  'tags',
  'owners',
  'charts',
]);

const SortableFieldsSchema = z.enum(['id', 'dashboard_title', 'slug', 'published', 'changed_on', 'created_on']);
const DashboardSchema = z.object({
  id: z.number().nullable().optional(),
  uuid: z.string().nullable().optional(),
  dashboard_title: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  published: z.boolean().nullable().optional(),
  chart_count: z.number().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
});

export const ListDashboardContentSchema = z.object({
  dashboards: z.array(DashboardSchema).nullable().optional(),
  count: z.number().nullable().optional(),
  total_count: z.number().nullable().optional(),
  total_pages: z.number().nullable().optional(),
  has_previous: z.boolean().nullable().optional(),
  has_next: z.boolean().nullable().optional(),
  page: z.number().nullable().optional(),
  page_size: z.number().nullable().optional(),
  timestamp: z.string().nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const ListDashboardOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type ListDashboardOutputType = z.infer<typeof ListDashboardOutputSchema>;

export const ListDashboardsInputSchema = z.object({
  page: z.number().min(1).default(1).describe('1-based page number. First page is 1, not 0.'),
  page_size: z.number().min(1).max(100).default(20).describe('Number of dashboards per page (1-100).'),
  select_columns: z.array(selectableFieldsSchema).optional().describe('Restrict the response to these dashboard fields.'),
  order_column: SortableFieldsSchema.optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
  search: z.string().describe('Search by dashboard_title.').optional(),
  filters: z
    .array(
      z.object({
        col: selectableFieldsSchema,
        opr: z.enum(['eq', 'in', 'sw']).describe("'eq': exact match. 'in': value is one of a list. 'sw': value starts with (string columns only)."),
        value: z
          .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
          .describe("Value to compare, e.g. {col: 'created_by_fk', opr: 'eq', value: <user_id>}. Use an array only when opr is 'in'."),
      })
    )
    .optional(),
});

export type ListDashboardsInputType = z.infer<typeof ListDashboardsInputSchema>;
