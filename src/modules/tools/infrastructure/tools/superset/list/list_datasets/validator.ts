import { z } from 'zod';
const selectableFieldsSchema = z.enum(['id', 'uuid', 'table_name', 'schema', 'database_id', 'created_by_fk', 'is_sqllab_view', 'certified_by']);

const SortableFieldsSchema = z.enum(['id', 'table_name', 'schema', 'changed_on', 'created_on']);

const DatasetSchema = z.object({
  id: z.number().nullable().optional(),
  uuid: z.string().nullable().optional(),
  table_name: z.string().nullable().optional(),
  database_id: z.number().nullable().optional(),
  database_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  certified_by: z.string().nullable().optional(),
  certification_details: z.string().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  schema: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export const ListDatasetsContentSchema = z.object({
  count: z.number().nullable().optional(),
  total_count: z.number().nullable().optional(),
  total_pages: z.number().nullable().optional(),
  has_previous: z.boolean().nullable().optional(),
  has_next: z.boolean().nullable().optional(),
  page: z.number().nullable().optional(),
  page_size: z.number().nullable().optional(),
  datasets: z.array(DatasetSchema).nullable().optional(),
  timestamp: z.string().nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const ListDatasetsOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type ListDatasetsOutputType = z.infer<typeof ListDatasetsOutputSchema>;

export const ListDatasetsInputSchema = z.object({
  page: z.number().min(1).default(1).describe('1-based page number. First page is 1, not 0.'),
  page_size: z.number().min(1).max(100).default(20).describe('Number of datasets per page (1-100).'),
  select_columns: z.array(selectableFieldsSchema).optional().describe('Restrict the response to these dataset fields.'),
  order_column: SortableFieldsSchema.optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
  search: z.string().describe('Search term to filter datasets by name or table name.').optional(),
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

export type ListDatasetsInputType = z.infer<typeof ListDatasetsInputSchema>;
