import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GetChartDataOutputSchema,
  GetChartDataContentSchema,
  GetChartDataInputSchema,
  GetChartDataInputType,
  GetChartDataOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, get_chart_data_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const get_chart_data = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'get_chart_data';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GetChartDataOutputSchema,
    mapResponse: (result: GetChartDataOutputType) => mapResponse(result),
  };

  return tool(
    async (args: GetChartDataInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Retrieve the rendered data behind a known chart for detailed values, records, metrics, or analysis.
      Use a chart ID from the current dashboard or from 'list_charts'. Do not use this tool to inspect chart configuration; use 'get_chart_info' for that.
      `,
      schema: GetChartDataInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapRequest = (args: GetChartDataInputType) => {
  const argument = {
    name: 'get_chart_data',
    arguments: {
      request: {
        identifier: args.chart_id,
      },
    },
  };
  return argument;
};

const mapResponse = async (result: GetChartDataOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching get_chart_data tool';

  const text = result.content[0].text;

  const containsError = text.toLowerCase().includes('not_found');
  if (containsError) return text + ' User may not have permissions to access the requested resource.';

  const output = GetChartDataContentSchema.safeParse(JSON.parse(text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, get_chart_data_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: get_chart_data, name: 'get_chart_data' };
