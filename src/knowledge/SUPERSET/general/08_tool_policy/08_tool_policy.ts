/**
 * Política de herramientas compartida
 * Define los límites duros de las llamadas a herramientas, verificados antes de cada una, comunes a los modos de 'general'.
 */
import type { PolicyVerdict, ToolCall, TurnFacts } from './interfaces';

export const TOOL_LIMITS: Record<string, number> = {
  list_datasets: 2,
  list_charts: 2,
  list_dashboards: 2,
  get_chart_type_schema: 2,
  make_image: 1,
};

export const checkToolCall = ({ tool, args }: ToolCall, facts: TurnFacts): PolicyVerdict => {
  switch (tool) {
    case 'add_chart_to_existing_dashboard':
      return checkSelectedDashboard(args, facts, 'charts can only be added to the selected dashboard');
    case 'delete_chart':
      return checkSelectedDashboard(args, facts, 'charts can only be taken off or deleted from the selected dashboard');
    case 'update_dashboard':
      return checkSelectedDashboard(args, facts, 'only the selected dashboard can be renamed or published');
    default:
      return { decision: 'allow' };
  }
};

/**
 * Guarda del dashboard seleccionado
 * Restringe agregar, quitar o borrar charts y renombrar o publicar dashboards al seleccionado; sin selección, aplica a cualquiera.
 */
const checkSelectedDashboard = (args: Record<string, unknown>, { selectedDashboardId }: TurnFacts, rule: string): PolicyVerdict => {
  if (selectedDashboardId === undefined || positiveId(args['dashboard_id']) === selectedDashboardId) return { decision: 'allow' };
  return {
    decision: 'block',
    status: 'error',
    message: `NOT EXECUTED: ${rule} (id ${selectedDashboardId}). Do not retry with another dashboard; tell the user.`,
  };
};

const positiveId = (value: unknown): number | undefined => {
  const id = typeof value === 'string' ? Number(value) : value;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined;
};
