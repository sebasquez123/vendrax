/**
 * Política de herramientas guiada
 * Rechaza toda escritura en el primer mensaje de la conversación, porque aún no pudo mostrarse una revisión.
 */
import type { PolicyVerdict, ToolCall } from '../../08_tool_policy/interfaces';
import type { ReviewFacts } from './interfaces';

const WRITES: Record<string, (args: Record<string, unknown>) => boolean> = {
  generate_chart: (args) => args['save_chart'] !== false,
  update_chart: () => true,
  add_chart_to_existing_dashboard: () => true,
  delete_chart: () => true,
  update_dashboard: () => true,
};

export const checkReviewShown = ({ tool, args }: ToolCall, { previousMessageCount }: ReviewFacts): PolicyVerdict => {
  if (previousMessageCount > 0 || !WRITES[tool]?.(args)) return { decision: 'allow' };
  return {
    decision: 'block',
    status: 'notice',
    message:
      'NOT EXECUTED: in this mode nothing is created, changed or deleted before the user accepts a review in an earlier message. ' +
      'Do not retry this call this turn: write the review now (what will be created, changed or deleted, and the assumptions you made) and ask the user to accept it.',
  };
};
