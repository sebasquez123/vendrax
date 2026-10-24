import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GetChartTypeSchemaOutputSchema,
  GetChartTypeSchemaContentSchema,
  GetChartTypeSchemaInputSchema,
  GetChartTypeSchemaInputType,
  GetChartTypeSchemaOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, get_chart_type_schema_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const get_chart_type_schema = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'get_chart_type_schema';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GetChartTypeSchemaOutputSchema,
    mapResponse: (result: GetChartTypeSchemaOutputType) => mapResponse(result),
  };

  return tool(
    async (args: GetChartTypeSchemaInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Inspect the exact fields the dashboard manager expects for one chart type, useful before building an unfamiliar visualization or when 'generate_chart'/'update_chart' rejects a configuration.
      Do not use it to inspect an existing chart's current configuration; use 'get_chart_info' instead.
      `,
      schema: GetChartTypeSchemaInputSchema,
      responseFormat: 'content',
    }
  );
};
const mapRequest = (args: GetChartTypeSchemaInputType) => {
  const argument = {
    name: 'get_chart_type_schema',
    arguments: {
      ...args,
    },
  };
  return argument;
};
const mapResponse = async (result: GetChartTypeSchemaOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching get_chart_type_schema tool';

  const text = result.content[0].text;

  const containsError = text.toLowerCase().includes('not_found');
  if (containsError) return text + ' User may not have permissions to access the requested resource.';

  const output = GetChartTypeSchemaContentSchema.safeParse(JSON.parse(text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, get_chart_type_schema_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: get_chart_type_schema, name: 'get_chart_type_schema' };
