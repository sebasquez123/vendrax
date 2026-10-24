import type { DomainTurn, TurnInput } from '../../../types';
import { renderStateBlock } from '../../07_client_state/07_client_state';
import type { ClientState } from '../../07_client_state/interfaces';
import { checkToolCall } from '../08_tool_policy/08_tool_policy';

/**
 * Apertura de turno compartida
 * Se ejecuta al inicio de cada turno y devuelve el bloque de estado, los parámetros de herramientas y las reglas.
 */
export const openTurn = ({ state }: TurnInput<ClientState>): DomainTurn => ({
  statePrompt: renderStateBlock({ state }),

  stateContextToolParams: {
    ...(state.domain && { domain: { contain: state.domain } }),
    ...(state.selectedDashboard?.id !== undefined && { selected_dashboard_id: state.selectedDashboard.id }),
  },

  evaluateToolCall: (tool, args) => {
    const verdict = checkToolCall({ tool, args }, { selectedDashboardId: state.selectedDashboard?.id });
    return verdict.decision === 'allow' ? { allow: true } : { allow: false, message: verdict.message, status: verdict.status };
  },
});
