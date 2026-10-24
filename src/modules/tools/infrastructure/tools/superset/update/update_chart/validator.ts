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
  groupby: z.array(z.string()).nullable().optional(),
  columns: z.array(z.string()).nullable().optional(),
  row_limit: z.number().nullable().optional(),
});

const ChartSchema = z.object({
  id: z.number().nullable().optional(),
  slice_name: z.string().nullable().optional(),
  uuid: z.string().nullable().optional(),
  viz_type: z.string().nullable().optional(),
  datasource_name: z.string().nullable().optional(),
  datasource_type: z.string().nullable().optional(),
  form_data: ChartFormDataSchema.nullable().optional(),
  form_data_key: z.string().nullable().optional(),
  is_unsaved_state: z.boolean().nullable().optional(),
});

export const UpdateChartContentSchema = z.object({
  chart: ChartSchema.nullable().optional(),
  previews: z.unknown().nullable().optional(),
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

export const UpdateChartOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type UpdateChartOutputType = z.infer<typeof UpdateChartOutputSchema>;

const ChartChangeValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])
  .describe(
    'Its complete new value: a number, true/false, a text such as "bottom" or a list of names such as ["DATE_TIME","PLACE"]. ' +
      'null and lists of objects (filters, metrics, formatting rules) go as JSON text.'
  );
export type ChartChangeValue = z.infer<typeof ChartChangeValueSchema>;

const ChartChangeSchema = z.object({
  key: z.string().describe("A form_data key, exactly as 'get_chart_info' shows it (its '_update_support.editable' lists the ones that can change)."),
  value: ChartChangeValueSchema,
});

export const UpdateChartInputSchema = z
  .object({
    chart_id: z.number().describe("Saved chart ID to update, as returned by 'list_charts' or 'get_chart_info'."),
    chart_name: z
      .string()
      .optional()
      .describe('New chart title, without any "[METBOT - ...]" prefix (it is added automatically). Omit to keep the current title.'),
    description: z.string().optional().describe('New chart description, shown with the chart on the dashboard. Omit to keep the current one.'),
    changes: z
      .array(ChartChangeSchema)
      .optional()
      .describe(
        'A change within the same chart type: only the keys that change, each with its complete new value. Every other saved setting stays as it is.'
      ),
    config: ChartConfigSchema.optional().describe(
      "Only to switch to another chart type: the whole new chart, which replaces the saved configuration. Never together with 'changes' or 'description'."
    ),
  })
  .superRefine((args, ctx) => {
    if (!args.config && !args.chart_name && !args.changes?.length && args.description === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['changes'], message: "Send 'changes', 'chart_name', 'description' or 'config'." });
    }
    if (args.config && (args.changes?.length || args.description !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['config'],
        message: "'config' rebuilds the whole chart: send it alone (with 'chart_name' at most).",
      });
    }
  });

export type UpdateChartInputType = z.infer<typeof UpdateChartInputSchema>;
