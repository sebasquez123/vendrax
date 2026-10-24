import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  GenerateChartOutputSchema,
  GenerateChartContentSchema,
  GenerateChartInputSchema,
  GenerateChartInputType,
  GenerateChartOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, generate_chart_catalog } from './catalogs';
import { withDomainPrefix } from '../../shared/domain_prefix';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { describeSavedData } from '../../shared/fix_compatible_names';
import { fixCompatibleNames } from '../../shared/fix_compatible_names';
import type { ApiClient } from '~/modules/api/application/interfaces/port.interface';

export const generate_chart = ({ params, onCustomEvent, callback, ApiService }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient, domain } = params;
  const real_tool_Name = 'generate_chart';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: GenerateChartOutputSchema,
    mapResponse: (result: GenerateChartOutputType, sent?: SentRequest) => mapResponse(result, sent?.arguments?.request, onCustomEvent, ApiService),
  };

  return tool(
    async (args: GenerateChartInputType) => {
      const argument = mapRequest(args, domain);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Create a chart from a dataset. Supported chart_type values: xy, table, pie, big_number, handlebars.
      Use only column and metric names that exist in the dataset, as listed in the data catalog of your instructions or returned by 'get_dataset_info'; never invent one. Call 'get_chart_type_schema' when the fields a chart_type needs are uncertain.
      Set 'save_chart: true' to keep the chart (required to add it to a dashboard); false only for a disposable preview.
      'filters' compare a column with fixed values only: a relative date range (e.g. the last 30 days) cannot be set here. Create the chart, then set the range with 'update_chart' ('adhoc_filters') in the same turn.
      Describe the chart from the 'saved_data' of the result (metrics, axis, grouping, filters), never from what you sent.
      After saving, add it to the selected dashboard with 'add_chart_to_existing_dashboard' and the returned chart id. The interface refreshes the dashboard view by itself.
      `,
      schema: GenerateChartInputSchema,
      responseFormat: 'content',
    }
  );
};

type SentRequest = { arguments?: { request?: GenerateChartInputType } };

const mapRequest = (args: GenerateChartInputType, domain?: { contain: string }) => {
  if (domain) args.chart_name = withDomainPrefix(args.chart_name, domain);
  const argument = {
    name: 'generate_chart',
    arguments: {
      request: {
        ...args,
      },
    },
  };
  return argument;
};
const mapResponse = async (
  result: GenerateChartOutputType,
  input?: GenerateChartInputType,
  onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void,
  Api?: ApiClient
) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching generate_chart tool';
  const output = GenerateChartContentSchema.safeParse(JSON.parse(result.content[0].text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const catalog = collectSemantics(output.data, activeFields, generate_chart_catalog);
  const chartId = output.data.chart?.id;
  const saved = chartId && output.data.success !== false;
  const savedData = saved ? await fixCompatibleNames(Api, chartId) : undefined;
  if (saved) {
    onCustomEvent?.(
      {
        dataset_id: input?.dataset_id,
        chart_name: input?.chart_name,
        viz_type: output.data.chart?.viz_type,
        chart_id: chartId,
      },
      'rendering',
      'generate_chart',
      'SuperSet'
    );
  }
  const formData = output.data.chart?.form_data ?? output.data.form_data;
  const description = savedData ?? (formData ? describeSavedData(formData) : undefined);
  const enrichedData = { ...(description && { saved_data: description }), ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: generate_chart, name: 'generate_chart' };
