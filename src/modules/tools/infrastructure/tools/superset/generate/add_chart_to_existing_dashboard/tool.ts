import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import {
  AddChartToExistingDashboardOutputSchema,
  AddChartToExistingDashboardContentSchema,
  AddChartToExistingDashboardInputSchema,
  AddChartToExistingDashboardInputType,
  AddChartToExistingDashboardOutputType,
} from './validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { collectSemantics } from '~/shared/helpers/semantics.collector';
import { activeFields, add_chart_to_existing_dashboard_catalog } from './catalogs';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const add_chart_to_existing_dashboard = ({ params, onCustomEvent, callback }: MCPToolParams): DynamicStructuredTool => {
  const { body, langChainClient } = params;

  const real_tool_Name = 'add_chart_to_existing_dashboard';
  const toolName = 'call_tool';
  const toolResponseConfig = {
    schema: AddChartToExistingDashboardOutputSchema,
    mapResponse: (result: AddChartToExistingDashboardOutputType, sent?: SentRequest) => mapResponse(result, sent?.arguments?.request, onCustomEvent),
  };

  return tool(
    async (args: AddChartToExistingDashboardInputType) => {
      const argument = mapRequest(args);
      return callback({ args: argument, serverName: body.serverName, toolName, langChainClient, toolResponseConfig });
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Add one already-saved chart (built with 'generate_chart' and save_chart: true) to the selected dashboard.
      Required: 'dashboard_id' and one 'chart_id'; this tool adds a single chart per call, it does not accept a list of chart IDs.
      A response with permission_denied: true means the current user lacks edit rights on that dashboard; report this to the user instead of retrying.
      After success, retain the returned position; the interface refreshes the dashboard view by itself. Do not add charts to another dashboard.
      `,
      schema: AddChartToExistingDashboardInputSchema,
      responseFormat: 'content',
    }
  );
};
type SentRequest = { arguments?: { request?: AddChartToExistingDashboardInputType } };

const mapRequest = (args: AddChartToExistingDashboardInputType) => {
  const argument = {
    name: 'add_chart_to_existing_dashboard',
    arguments: {
      request: {
        ...args,
      },
    },
  };
  return argument;
};

const mapResponse = async (
  result: AddChartToExistingDashboardOutputType,
  input?: AddChartToExistingDashboardInputType,
  onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void
) => {
  if (result.content[0]?.text === '' || !result.content[0]?.text) return 'Error reaching add_chart_to_existing_dashboard tool';
  const output = AddChartToExistingDashboardContentSchema.safeParse(JSON.parse(result.content[0].text));
  if (!output.success) {
    const issues = formatZodErrorMessages(output);
    return `Error: ${issues}`;
  }
  const added = output.data.dashboard && !output.data.permission_denied && !output.data.error;
  if (added) {
    onCustomEvent?.(
      {
        dashboard_id: input?.dashboard_id,
        chart_id: input?.chart_id,
        dashboard_title: output.data.dashboard?.dashboard_title,
        charts: output.data.dashboard?.charts?.map((c) => ({ slice_name: c.slice_name, id: c.id })),
      },
      'rendering',
      'add_chart_to_existing_dashboard',
      'SuperSet'
    );
  }
  const catalog = collectSemantics(output.data, activeFields, add_chart_to_existing_dashboard_catalog);
  const enrichedData = { ...output.data, _semantics: { catalog } };
  return enrichedData;
};
export default { func: add_chart_to_existing_dashboard, name: 'add_chart_to_existing_dashboard' };
