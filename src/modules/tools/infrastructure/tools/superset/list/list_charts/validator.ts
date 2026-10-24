import { z } from 'zod';
const selectableFieldsSchema = z.enum([
  'id',
  'uuid',
  'slice_name',
  'viz_type',
  'datasource_id',
  'datasource_type',
  'datasource_name',
  'description',
  'form_data',
  'tags',
]);

const SortableFieldsSchema = z.enum(['id', 'slice_name', 'viz_type', 'description', 'changed_on', 'created_on']);

const ChartSchema = z.object({
  id: z.number().nullable().optional(),
  uuid: z.string().nullable().optional(),
  slice_name: z.string().nullable().optional(),
  viz_type: z.string().nullable().optional(),
  datasource_id: z.number().nullable().optional(),
  datasource_type: z.string().nullable().optional(),
  datasource_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  form_data: z.record(z.string(), z.unknown()).nullable().optional(),
  changed_on: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
});

export const ListChartsContentSchema = z.object({
  count: z.number().nullable().optional(),
  total_count: z.number().nullable().optional(),
  total_pages: z.number().nullable().optional(),
  has_previous: z.boolean().nullable().optional(),
  has_next: z.boolean().nullable().optional(),
  page: z.number().nullable().optional(),
  page_size: z.number().nullable().optional(),
  charts: z.array(ChartSchema).nullable().optional(),
  timestamp: z.string().nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const ListChartsOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type ListChartsOutputType = z.infer<typeof ListChartsOutputSchema>;

export const ListChartsInputSchema = z.object({
  page: z.number().min(1).default(1).describe('1-based page number. First page is 1, not 0.'),
  page_size: z.number().min(1).max(100).default(20).describe('Number of charts per page (1-100).'),
  select_columns: z.array(selectableFieldsSchema).optional().describe('Restrict the response to these chart fields.'),
  order_column: SortableFieldsSchema.optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
  search: z.string().describe('Filter charts by title or description').optional(),
  filters: z
    .array(
      z.object({
        col: selectableFieldsSchema,
        opr: z.enum(['eq', 'in', 'sw']).describe("'eq': exact match. 'in': value is one of a list. 'sw': value starts with (string columns only)."),
        value: z
          .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
          .describe("Value to compare, e.g. {col: 'viz_type', opr: 'in', value: ['table', 'pivot_table_v2']}. Use an array only when opr is 'in'."),
      })
    )
    .optional(),
});

export type ListChartsInputType = z.infer<typeof ListChartsInputSchema>;
