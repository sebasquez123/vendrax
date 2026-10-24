import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  ListDashboardOutputSchema,
  ListDashboardOutputType,
  ListDashboardContentSchema,
  ListDashboardsInputType,
  ListDashboardsInputSchema,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, list_dashboards_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const list_dashboards = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient, domain } = params;
  const instruct = domain;
  const real_tool_Name = 'list_dashboards';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: ListDashboardOutputSchema,
    mapResponse: (result: ListDashboardOutputType) => {
      if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching list_dashboards tool';
      const output = ListDashboardContentSchema.safeParse(JSON.parse(result.content[0].text));
      if (!output.success) {
        const issues = formatZodErrorMessages(output);
        return `Error reaching list_dashboards tool: ${issues}`;
      }
      const catalog = collectSemantics(output.data, activeFields, list_dashboards_catalog);
      const enrichedData = { ...output.data, _semantics: { catalog } };
      return enrichedData;
    },
  };

  return tool(
    async (args: ListDashboardsInputType) => {
      const argument = mapRequest(args, instruct);

      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Search existing dashboards for read-only information or to resolve a dashboard named by the user.
      Use 'search' for title discovery, or filters with the exact keys 'col', 'opr', and 'value'. Use 'get_dashboard_info' after identifying a dashboard that needs detail.
      Do not use this tool to change the selected dashboard or create one.
      `,
      schema: ListDashboardsInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapRequest = (args: ListDashboardsInputType, _instruct?: { contain: string }) => {
  if (args.filters) {
    args.filters = args.filters.map((filter) => ({
      ...filter,
      value: typeof filter.value === 'string' && (filter.value.trim() === "''" || filter.value.trim() === '""') ? '' : filter.value,
    }));
  }
  const argument = {
    name: 'list_dashboards',
    arguments: {
      request: {
        ...args,
      },
    },
  };
  return argument;
};

export default { func: list_dashboards, name: 'list_dashboards' };
