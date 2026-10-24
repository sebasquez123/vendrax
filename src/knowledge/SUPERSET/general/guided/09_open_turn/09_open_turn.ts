import type { DomainTurn, TurnInput } from '../../../../types';
import type { ClientState } from '../../../07_client_state/interfaces';
import { openTurn as openSharedTurn } from '../../09_open_turn/09_open_turn';
import { checkReviewShown } from '../08_tool_policy/08_tool_policy';

/**
 * Apertura de turno guiada
 * Turno compartido de 'general' con la regla del modo 'guided' verificada primero.
 */
export const openTurn = (input: TurnInput<ClientState>): DomainTurn => {
  const shared = openSharedTurn(input);
  return {
    ...shared,
    evaluateToolCall: (tool, args) => {
      const verdict = checkReviewShown({ tool, args }, { previousMessageCount: input.previousMessageCount });
      if (verdict.decision === 'block') return { allow: false, message: verdict.message, status: verdict.status };
      return shared.evaluateToolCall ? shared.evaluateToolCall(tool, args) : { allow: true };
    },
  };
};
