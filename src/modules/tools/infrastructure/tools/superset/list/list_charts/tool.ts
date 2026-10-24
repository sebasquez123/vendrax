import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { ListChartsOutputSchema, ListChartsContentSchema, ListChartsInputSchema, ListChartsInputType, ListChartsOutputType } from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, list_charts_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
export const list_charts = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient, domain } = params;
  const instruct = domain;
  const real_tool_Name = 'list_charts';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: ListChartsOutputSchema,
    mapResponse: (result: ListChartsOutputType) => mapResponse(result),
  };

  return tool(
    async (args: ListChartsInputType) => {
      const argument = mapRequest(args, instruct);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Find existing charts by name, type, or metadata, and return chart IDs for later inspection or modification.
      Use filters with the exact keys 'col', 'opr', and 'value'. Prefer the current dashboard's chart IDs when already available.
      Do not use this tool to retrieve detailed configuration or data.
      `,
      schema: ListChartsInputSchema,
      responseFormat: 'content',
    }
  );
};
const mapRequest = (args: ListChartsInputType, _instruct?: { contain: string }) => {
  if (args.filters) {
    args.filters = args.filters.map((filter) => ({
      ...filter,
      value: typeof filter.value === 'string' && (filter.value.trim() === "''" || filter.value.trim() === '""') ? '' : filter.value,
    }));
  }
  const argument = {
    name: 'list_charts',
    arguments: {
      request: {
        ...args,
      },
    },
  };
  return argument;
};
const mapResponse = async (result: ListChartsOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching list_charts tool';
  const output = ListChartsContentSchema.safeParse(JSON.parse(result.content[0].text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, list_charts_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };

  return enrichedData;
};
export default { func: list_charts, name: 'list_charts' };
