import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { MCPToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import type { SavedDashboard } from '~/modules/api/application/interfaces/port.interface';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { explainApiError } from '../../shared/failure_controls';
import { withDomainPrefix } from '../../shared/domain_prefix';
import { UpdateDashboardInputSchema, UpdateDashboardInputType } from './validator';

const NOT_OWNER =
  'this dashboard belongs to other users, so it cannot be renamed or published from here; its owners can do it in the dashboard manager.';

const notDone = (reason: string) => `NOT DONE: ${reason} Tell the user plainly; never report it as done.`;

export const update_dashboard = ({ params, ApiService, onCustomEvent }: MCPToolParams): DynamicStructuredTool => {
  const real_tool_Name = 'update_dashboard';
  const { domain } = params;

  return tool(
    async ({ dashboard_id, dashboard_title, published }: UpdateDashboardInputType) => {
      if (!ApiService) return notDone('renaming or publishing dashboards is not available here.');

      /**- 1. GUARDAR: solo lo que cambia */
      const title = dashboard_title === undefined ? undefined : withDomainPrefix(dashboard_title, domain);
      let saved: SavedDashboard;
      try {
        saved = await ApiService.updateDashboard(dashboard_id, { title, published });
      } catch (error) {
        return notDone(explainApiError(error, NOT_OWNER));
      }

      /**- 2. INFORMAR: evento con el dashboard guardado */
      onCustomEvent?.(
        { dashboard_id: saved.id, dashboard_new_title: saved.title, published: saved.published },
        'rendering',
        'update_dashboard',
        'SuperSet'
      );
      return { updated: true, dashboard: { id: saved.id, title: saved.title, published: saved.published } };
    },
    {
      name: `${TOOL_PREFIX}${real_tool_Name}`,
      description: `
      Rename the selected dashboard or change its publication state. Send only what changes: 'dashboard_title' to rename it, 'published' to publish it (true) or set it back to draft (false).
      It cannot create, delete or move charts, nor change the dashboard's layout.
      The result is the dashboard as saved; the interface refreshes the view by itself. A result starting with 'NOT DONE' says why nothing changed: relay it, never retry the same call.
      `,
      schema: UpdateDashboardInputSchema,
      responseFormat: 'content',
    }
  );
};

export default { func: update_dashboard, name: 'update_dashboard' };
