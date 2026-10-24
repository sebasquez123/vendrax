import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  ListDatasetsOutputSchema,
  ListDatasetsContentSchema,
  ListDatasetsInputSchema,
  ListDatasetsInputType,
  ListDatasetsOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, list_datasets_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
export const list_datasets = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'list_datasets';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: ListDatasetsOutputSchema,
    mapResponse: (result: ListDatasetsOutputType) => mapResponse(result),
  };

  return tool(
    async (args: ListDatasetsInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Search datasets by name or filter. Use it when the data catalog in your instructions does not list every dataset, or to find one by the user's own terms; when a search finds nothing, retry with two or three related terms (synonyms, partial words) before asking the user.
      Filters use 'col', 'opr' and 'value'.
      `,
      schema: ListDatasetsInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapRequest = (args: ListDatasetsInputType) => {
  if (args.filters) {
    args.filters = args.filters.map((filter) => ({
      ...filter,
      value: typeof filter.value === 'string' && (filter.value.trim() === "''" || filter.value.trim() === '""') ? '' : filter.value,
    }));
  }
  const argument = {
    name: 'list_datasets',
    arguments: {
      request: {
        ...args,
      },
    },
  };
  return argument;
};

const mapResponse = async (result: ListDatasetsOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching list_datasets tool';
  const output = ListDatasetsContentSchema.safeParse(JSON.parse(result.content[0].text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, list_datasets_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: list_datasets, name: 'list_datasets' };
