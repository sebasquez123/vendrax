import { z } from 'zod';

export const GetChartTypeSchemaContentSchema = z.object({
  chart_type: z.string().nullable().optional(),
  schema: z.unknown().nullable().optional(),
  examples: z.array(z.unknown()).nullable().optional(),
});

export const GetChartTypeSchemaOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(['text']),
      text: z.string(),
    })
  ),
  isError: z.boolean(),
});
export type GetChartTypeSchemaOutputType = z.infer<typeof GetChartTypeSchemaOutputSchema>;

export const GetChartTypeSchemaInputSchema = z.object({
  chart_type: z
    .enum(['xy', 'table', 'pie', 'big_number', 'pivot_table', 'mixed_timeseries', 'handlebars'])
    .describe(
      "Chart type to inspect. 'xy', 'table', 'pie', 'big_number', and 'handlebars' can be built with 'generate_chart'/'update_chart'. " +
        "'pivot_table' and 'mixed_timeseries' can only be inspected here: they cannot be built, nor rebuilt with 'config'; the settings of a saved one change with 'update_chart' 'changes' when its '_update_support' lists them."
    ),
  include_examples: z.boolean().optional().describe('Include valid configuration examples for the requested chart type.'),
});

export type GetChartTypeSchemaInputType = z.infer<typeof GetChartTypeSchemaInputSchema>;
