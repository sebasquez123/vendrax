import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GetDatasetInfoOutputSchema,
  GetDatasetInfoContentSchema,
  GetDatasetInfoInputSchema,
  GetDatasetInfoInputType,
  GetDatasetInfoOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, get_dataset_info_catalog } from './catalogs';
import { DATASET_COLUMN_GLOSSARIES } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const get_dataset_info = ({ params, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'get_dataset_info';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GetDatasetInfoOutputSchema,
    mapResponse: (result: GetDatasetInfoOutputType) => mapResponse(result),
  };

  return tool(
    async (args: GetDatasetInfoInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Inspect one dataset's columns, data types and saved metrics.
      Use it when the data catalog in your instructions does not list that dataset's columns and metrics, or when you need a detail the catalog leaves out (e.g. a column description). Use only returned column and metric names; never infer them.
      `,
      schema: GetDatasetInfoInputSchema,
      responseFormat: 'content',
    }
  );
};
const mapRequest = (args: GetDatasetInfoInputType) => {
  const argument = {
    name: 'get_dataset_info',
    arguments: {
      request: {
        identifier: args.dataset_id,
      },
    },
  };
  return argument;
};
const mapResponse = async (result: GetDatasetInfoOutputType) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching get_dataset_info tool';

  const text = result.content[0].text;

  const containsError = text.toLowerCase().includes('not_found');
  if (containsError) return text + ' User may not have permissions to access the requested resource.';

  const output = GetDatasetInfoContentSchema.safeParse(JSON.parse(text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, get_dataset_info_catalog);
  if (catalog && catalog['column_name']?.values) {
    catalog['column_name'].values = DATASET_COLUMN_GLOSSARIES[output.data.table_name ?? ''] ?? {};
  }
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: get_dataset_info, name: 'get_dataset_info' };
