import { z } from 'zod';

const DatasetColumnSchema = z.object({
  column_name: z.string().nullable().optional(),
  verbose_name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  is_dttm: z.boolean().nullable().optional(),
  groupby: z.boolean().nullable().optional(),
  filterable: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
});

const DatasetMetricSchema = z.object({
  metric_name: z.string().nullable().optional(),
  verbose_name: z.string().nullable().optional(),
  expression: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  d3format: z.string().nullable().optional(),
});

export const GetDatasetInfoContentSchema = z.object({
  id: z.number().nullable().optional(),
  database_id: z.number().nullable().optional(),
  table_name: z.string().nullable().optional(),
  schema: z.string().nullable().optional(),
  database_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  uuid: z.string().nullable().optional(),
  main_dttm_col: z.string().nullable().optional(),
  is_virtual: z.boolean().nullable().optional(),
  created_on: z.string().nullable().optional(),
  created_on_humanized: z.string().nullable().optional(),
  changed_on: z.string().nullable().optional(),
  changed_on_humanized: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  changed_by: z.string().nullable().optional(),
  tags: z.array(z.unknown()).nullable().optional(),
  owners: z.array(z.unknown()).nullable().optional(),
  sql: z.string().nullable().optional(),
  params: z.unknown().nullable().optional(),
  template_params: z.unknown().nullable().optional(),
  extra: z.unknown().nullable().optional(),
  url: z.string().nullable().optional(),
  schema_perm: z.string().nullable().optional(),
  offset: z.number().nullable().optional(),
  cache_timeout: z.number().nullable().optional(),
  is_favorite: z.boolean().nullable().optional(),
  columns: z.array(DatasetColumnSchema).nullable().optional(),
  metrics: z.array(DatasetMetricSchema).nullable().optional(),
  error: z.unknown().nullable().optional(),
});

export const GetDatasetInfoOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GetDatasetInfoOutputType = z.infer<typeof GetDatasetInfoOutputSchema>;

export const GetDatasetInfoInputSchema = z.object({
  dataset_id: z.number().describe("Dataset ID to inspect, as returned by 'list_datasets'."),
});

export type GetDatasetInfoInputType = z.infer<typeof GetDatasetInfoInputSchema>;
