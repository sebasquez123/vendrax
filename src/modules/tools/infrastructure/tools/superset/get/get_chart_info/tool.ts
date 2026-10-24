import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GetChartInfoOutputSchema,
  GetChartInfoContentSchema,
  GetChartInfoInputSchema,
  GetChartInfoInputType,
  GetChartInfoOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, get_chart_info_catalog } from './catalogs';
import { describeUpdateSupport } from '../../update/guards/form_data.guard';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const get_chart_info = ({ params, callback, ApiService }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'get_chart_info';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GetChartInfoOutputSchema,
    mapResponse: (result: GetChartInfoOutputType) => mapResponse(result, ApiService?.account),
  };

  return tool(
    async (args: GetChartInfoInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Inspect a known chart's metadata and configuration.
      Use it before 'update_chart' and whenever the user asks how a chart is built. Its '_update_support' says what 'update_chart' can change on this chart.
      form_data is in the dashboard manager's native format: a plain string in form_data.metrics is a saved metric name; report metric and column names exactly as returned, never a translated or glossary term.
      Do not use it to retrieve chart values; use 'get_chart_data' for data.
      `,
      schema: GetChartInfoInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapRequest = (args: GetChartInfoInputType) => {
  const argument = {
    name: 'get_chart_info',
    arguments: {
      request: {
        identifier: args.chart_id,
      },
    },
  };
  return argument;
};

const mapResponse = async (result: GetChartInfoOutputType, account?: string) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching get_chart_info tool';

  const text = result.content[0].text;

  const containsError = text.toLowerCase().includes('not_found');
  if (containsError) return text + ' User may not have permissions to access the requested resource.';

  const output = GetChartInfoContentSchema.safeParse(JSON.parse(text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, get_chart_info_catalog);
  const formData = output.data.form_data;
  return {
    ...output.data,
    _semantics: { catalog },
    ...(formData && { _update_support: describeUpdateSupport(formData, { owners: output.data.owners, account }) }),
  };
};
export default { func: get_chart_info, name: 'get_chart_info' };
