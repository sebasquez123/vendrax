import { createMiddleware, ToolInvocationError, ToolMessage } from 'langchain';
import { isGraphInterrupt } from '@langchain/langgraph';
import type { ToolPolicyDecision } from '~/knowledge/types';
import { toolFailureOf } from '~/modules/tools/infrastructure/tools/superset/shared/failure_controls';
import { LoggerService } from '~/shared/logging/main.logger';

const logger = new LoggerService('ToolPolicyMiddleware');

export interface DomainToolPolicy {
  toolNames: ReadonlySet<string>;
  prefix: string;
  limits?: Record<string, number>;
  evaluate?: (tool: string, args: Record<string, unknown>) => ToolPolicyDecision;
}

const signatureOf = (name: string, args: unknown): string => {
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, sorted(child)])
      );
    return value;
  };
  return `${name}:${JSON.stringify(sorted(args ?? {}))}`;
};

export const REPEATED_CALL_NOTICE = 'NOT EXECUTED: this exact call already ran in this turn. Use its earlier result instead of calling it again.';

export const budgetNotice = (tool: string): string =>
  `NOT EXECUTED: '${tool}' already ran as many times as allowed in one turn. Do not search again: answer with what you have, and if something is still unclear or does not exist, tell the user in plain words or ask them one concrete question.`;

/**
 * Middleware de política de herramientas
 * Verifica cada llamada antes de ejecutarla: no repite llamadas exitosas, aplica el presupuesto por turno y la política del dominio.
 */
export const buildToolPolicyMiddleware = (policies: DomainToolPolicy[]) => {
  const executed = new Set<string>();
  const calls = new Map<string, number>();

  return createMiddleware({
    name: 'DomainToolPolicyMiddleware',
    wrapToolCall: async (request, handler) => {
      const { name, id, args } = request.toolCall;
      const toolCallId = id ?? name;
      const notRun = (content: string, status: 'error' | 'success') => new ToolMessage({ content, tool_call_id: toolCallId, name, status });

      const signature = signatureOf(name, args);
      if (executed.has(signature)) {
        logger.warn(`Tool call '${name}' repeated with the same arguments; not run again`);
        return notRun(REPEATED_CALL_NOTICE, 'success');
      }

      const policy = policies.find((candidate) => candidate.toolNames.has(name));
      const tool = policy && name.startsWith(policy.prefix) ? name.slice(policy.prefix.length) : name;
      const budget = policy?.limits?.[tool];
      const used = calls.get(name) ?? 0;
      if (budget !== undefined && used >= budget) {
        logger.warn(`Tool call '${name}' over its turn budget (${budget}); not run`);
        return notRun(budgetNotice(tool), 'success');
      }

      const decision = policy?.evaluate?.(tool, (args ?? {}) as Record<string, unknown>);
      if (decision && !decision.allow) {
        logger.warn(`Tool call '${name}' not executed by domain policy`, { status: decision.status });
        return notRun(decision.message, decision.status === 'error' ? 'error' : 'success');
      }

      calls.set(name, used + 1);
      executed.add(signature);
      try {
        const result = await handler(request);
        if (ToolMessage.isInstance(result) && toolFailureOf(result)) executed.delete(signature);
        return result;
      } catch (error: unknown) {
        if (isGraphInterrupt(error) || (error instanceof Error && error.name === 'AbortError')) throw error;
        executed.delete(signature);
        logger.warn(`Tool call '${name}' failed`, { error: error instanceof Error ? error.message : String(error) });
        return new ToolMessage({
          content: error instanceof ToolInvocationError ? error.message : `${String(error)}\n Please fix your mistakes.`,
          tool_call_id: toolCallId,
          name,
          status: 'error',
        });
      }
    },
  });
};
