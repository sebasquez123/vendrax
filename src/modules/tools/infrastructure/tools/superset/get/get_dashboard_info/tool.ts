import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GetDashboardInfoOutputSchema,
  GetDashboardInfoContentSchema,
  GetDashboardInfoInputSchema,
  GetDashboardInfoInputType,
  GetDashboardInfoOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, get_dashboard_info_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
export const get_dashboard_info = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'get_dashboard_info';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GetDashboardInfoOutputSchema,
    mapResponse: (result: GetDashboardInfoOutputType) => mapResponse(result),
  };

  return tool(
    async (args: GetDashboardInfoInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Get metadata, chart membership, filters, and status for one dashboard.
      Use it for dashboard questions. Prefer the selected dashboard's ID or UUID already in context.
      This tool is read-only.
      `,
      schema: GetDashboardInfoInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapRequest = (args: GetDashboardInfoInputType) => {
  const argument = {
    name: 'get_dashboard_info',
    arguments: {
      request: {
        identifier: args.dashboard_id,
      },
    },
  };
  return argument;
};
const mapResponse = async (result: GetDashboardInfoOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching get_dashboard_info tool';

  const text = result.content[0].text;

  const containsError = text.toLowerCase().includes('not_found');
  if (containsError) return text + ' User may not have permissions to access the requested resource.';

  const output = GetDashboardInfoContentSchema.safeParse(JSON.parse(text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, get_dashboard_info_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: get_dashboard_info, name: 'get_dashboard_info' };
