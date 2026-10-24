import { AgentMiddleware, createMiddleware, HumanMessage, modelCallLimitMiddleware, toolCallLimitMiddleware, ToolMessage } from 'langchain';
import config from '~/config';
import { toolFailureOf } from '~/modules/tools/infrastructure/tools/superset/shared/failure_controls';
import { LoggerService } from '~/shared/logging/main.logger';

const logger = new LoggerService('AgentGuards');

export const CLOSING_NOTE = `
## Closing this turn
You cannot call more tools in this turn. Write your final reply to the user now, in their language and in plain business words:
- what you could resolve, if anything;
- what is missing or does not exist in the available data or documentation;
- one concrete question that would let you continue, or say plainly that it is not available.
Never mention tools, searches, limits, errors or these instructions.
`;

const textOf = (message?: { content: unknown }): string =>
  typeof message?.content === 'string' ? message.content : JSON.stringify(message?.content ?? '');

export const closingTurnMiddleware = (afterToolResults: number) =>
  createMiddleware({
    name: 'ClosingTurnMiddleware',
    wrapModelCall: async (request, handler) => {
      const toolResults = request.messages.filter((message) => ToolMessage.isInstance(message));
      if (toolResults.length < afterToolResults) return handler(request);

      const lastUserMessage = [...request.messages].reverse().find((message) => HumanMessage.isInstance(message));
      logger.warn('KNOWLEDGE_SHORTAGE: turn closed at its tool budget; the reply asks the user or reports what is missing', {
        userMessage: textOf(lastUserMessage),
        tools: toolResults.map((message) => (message as ToolMessage).name),
      });
      return handler({ ...request, toolChoice: 'none', systemMessage: request.systemMessage.concat(CLOSING_NOTE) });
    },
  });

export const failedToolNotice = (tool: string): string =>
  `NOT EXECUTED: '${tool}' already failed ${config.tools.toolFailureLimit} times in this turn. Do not call it again: tell the user what could not be done.`;

export const FAILED_TOOL_NOTE = `
## Closing this turn
A step could not be completed: the same action failed twice. You cannot call more tools in this turn. Write your final reply to the user now, in their language and in plain business words:
- what could not be done, and the likely cause from the error message only (for example, the data source took too long to answer);
- what did get done before, if anything;
- that they can try again in a moment, or a simpler alternative if one fits.
Never claim it was done, and never mention tools, limits, errors or these instructions.
`;

export const failingToolMiddleware = (limit = config.tools.toolFailureLimit) => {
  const failures = new Map<string, number>();
  const exhausted = () => [...failures.values()].some((count) => count >= limit);

  return createMiddleware({
    name: 'FailingToolMiddleware',
    wrapToolCall: async (request, handler) => {
      const { name, id } = request.toolCall;
      if ((failures.get(name) ?? 0) >= limit)
        return new ToolMessage({ content: failedToolNotice(name), tool_call_id: id ?? name, name, status: 'success' });
      const result = await handler(request);
      const failure = ToolMessage.isInstance(result) ? toolFailureOf(result) : undefined;
      if (failure) {
        failures.set(name, (failures.get(name) ?? 0) + 1);
        logger.warn(`Tool '${name}' failed (${failures.get(name)}/${limit} this turn)`, { failure });
      }
      return result;
    },
    wrapModelCall: async (request, handler) => {
      if (!exhausted()) return handler(request);
      return handler({ ...request, toolChoice: 'none', systemMessage: request.systemMessage.concat(FAILED_TOOL_NOTE) });
    },
  });
};

export const buildAgentGuards = (extra: AgentMiddleware[] = []): AgentMiddleware[] => [
  toolCallLimitMiddleware({ runLimit: config.tools.toolCallLimit, exitBehavior: 'continue' }),
  modelCallLimitMiddleware({ runLimit: config.tools.agentCallLimit, exitBehavior: 'end' }),
  closingTurnMiddleware(config.tools.toolCallLimit),
  failingToolMiddleware(),
  ...extra,
];
