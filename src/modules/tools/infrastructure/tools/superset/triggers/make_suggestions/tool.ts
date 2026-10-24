import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { MakeSuggestionsInputSchema, MakeSuggestionsInputType } from './validator';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';

export const make_suggestions = ({ onCustomEvent }: MCPToolParams): DynamicStructuredTool => {
  const real_tool_Name = 'make_suggestions';

  return tool(
    async (args: MakeSuggestionsInputType) => {
      const argument = args || {};
      return await mapResponse(argument, onCustomEvent);
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
        Show the user 1-3 concrete options they can pick directly (for example: chart types to try, metrics to choose, or whether to add the saved chart to the dashboard).
        Each option must be something you can do next with your own tools. Never suggest refreshing or viewing the dashboard: the interface already shows every change by itself.
        Call it only where your reply shapes say to, not after every tool call. This only shows the options in the interface; it does not execute any action itself.
      `,
      schema: MakeSuggestionsInputSchema,
      responseFormat: 'content',
    }
  );
};

const mapResponse = async (
  result: MakeSuggestionsInputType,
  onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void
) => {
  onCustomEvent?.(
    {
      suggestions: result.suggestions,
    },
    'rendering',
    'make_suggestions',
    'SuperSet'
  );
  return '**Evento enviado al frontend exitosamente**';
};
export default { func: make_suggestions, name: 'make_suggestions' };
