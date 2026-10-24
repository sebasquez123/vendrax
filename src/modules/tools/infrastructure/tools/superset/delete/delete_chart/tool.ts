import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { explainApiError } from '../../shared/failure_controls';
import { DeleteChartInputSchema, DeleteChartInputType } from './validator';

const NOT_CHART_OWNER = 'this chart belongs to other users, so it cannot be deleted from here; it can still be taken off this dashboard.';
const NOT_DASHBOARD_OWNER =
  'this dashboard belongs to other users, so its charts cannot be taken off from here; its owners can do it in the dashboard manager.';

const notDone = (reason: string) => `NOT DONE: ${reason} Tell the user plainly; never report it as done.`;

/**
 * Quitar o eliminar un gráfico
 * Quita un gráfico del dashboard seleccionado o, con 'permanent', lo elimina definitivamente mediante la API REST del servidor.
 */
export const delete_chart = ({ ApiService, onCustomEvent }: MCPToolParams): DynamicStructuredTool => {
  const real_tool_Name = 'delete_chart';

  return tool(
    async ({ chart_id, chart_title, dashboard_id, permanent }: DeleteChartInputType) => {
      if (!ApiService) return notDone('removing or deleting charts is not available here.');

      /**- 1. BORRAR: solo con 'permanent', solo propietarios */
      if (permanent) {
        try {
          await ApiService.deleteChart(chart_id);
        } catch (error) {
          return notDone(explainApiError(error, NOT_CHART_OWNER));
        }
      }

      /**- 2. QUITAR: el lugar en el dashboard seleccionado */
      let emptyPlace: string | undefined;
      try {
        await ApiService.removeChartFromDashboard(dashboard_id, chart_id);
      } catch (error) {
        if (!permanent) return notDone(explainApiError(error, NOT_DASHBOARD_OWNER));
        emptyPlace = explainApiError(error, NOT_DASHBOARD_OWNER);
      }

      /**- 3. REPORTAR: el evento a la interfaz */
      onCustomEvent?.({ chart_id, chart_title, dashboard_id, permanent }, 'rendering', 'delete_chart', 'SuperSet');
      return {
        done: permanent ? 'deleted' : 'removed_from_dashboard',
        chart: { id: chart_id, title: chart_title },
        dashboard_id,
        note: permanent
          ? 'The chart no longer exists, in any dashboard; this cannot be undone.'
          : 'The chart still exists: other dashboards keep it, and it can be added back to this one.',
        ...(emptyPlace && { notice: `The chart was deleted, but its empty place stays on this dashboard: ${emptyPlace}` }),
      };
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Take one chart off the selected dashboard, or delete it for good. Identify exactly one chart first (the selected dashboard's charts, with 'get_dashboard_info').
      - permanent: false → the chart only leaves this dashboard; it still exists, other dashboards keep it and it can be added back. Use it when the user wants it off this dashboard, and whenever it is not clear that they want it gone for good.
      - permanent: true → the chart itself is deleted, from every dashboard, and it cannot be undone. Only when the user clearly asks to delete the chart for good. Only its owners can delete it.
      The interface refreshes the dashboard by itself. A result starting with 'NOT DONE' says why nothing changed: relay it, never retry the same call.
      `,
      schema: DeleteChartInputSchema,
      responseFormat: 'content',
    }
  );
};

export default { func: delete_chart, name: 'delete_chart' };
