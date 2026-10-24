import { describe, expect, it, jest } from '@jest/globals';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from 'langchain';
import { CLOSING_NOTE, closingTurnMiddleware, FAILED_TOOL_NOTE, failedToolNotice, failingToolMiddleware } from './agent.guards';
import { toolFailureOf } from '~/modules/tools/infrastructure/tools/superset/shared/failure_controls';
import config from '~/config';

type Request = { messages: unknown[]; systemMessage: SystemMessage; toolChoice?: unknown };
type Handler = (request: Request) => Promise<unknown>;
type WrapModelCall = (request: Request, handler: Handler) => Promise<unknown>;

const wrap = (closing: number): WrapModelCall => (closingTurnMiddleware(closing) as unknown as { wrapModelCall: WrapModelCall }).wrapModelCall;

const toolResult = (index: number) => new ToolMessage({ content: 'nothing found', tool_call_id: `call-${index}`, name: 'Panels__search_knowledge' });

const turn = (toolResults: number): Request => ({
  systemMessage: new SystemMessage('base prompt'),
  messages: [
    new HumanMessage('hola'),
    new AIMessage('¡Hola!'),
    new HumanMessage('gráfico de ventas por vendedor'),
    ...Array.from({ length: toolResults }, (_, index) => toolResult(index)),
  ],
});

describe('closingTurnMiddleware', () => {
  it('leaves the model its tools while the turn is under its tool budget', async () => {
    const handler = jest.fn<Handler>().mockResolvedValue('reply');
    const request = turn(7);
    await wrap(8)(request, handler);
    expect(handler).toHaveBeenCalledWith(request);
  });

  it('closes the turn at the budget: no more tools, and an instruction to answer the user now', async () => {
    const handler = jest.fn<Handler>().mockResolvedValue('reply');
    await wrap(8)(turn(8), handler);
    const sent = handler.mock.calls[0]![0];
    expect(sent.toolChoice).toBe('none');
    expect(sent.systemMessage.text).toContain('base prompt');
    expect(sent.systemMessage.text).toContain(CLOSING_NOTE.trim().split('\n')[0]);
  });
});

type WrapToolCall = (request: unknown, handler: (request: unknown) => Promise<unknown>) => Promise<ToolMessage>;

const failing = () =>
  failingToolMiddleware() as unknown as {
    wrapToolCall: WrapToolCall;
    wrapModelCall: WrapModelCall;
  };

const call = (name: string) => ({ toolCall: { name, id: 'call-1', args: {} }, tool: undefined, state: {}, runtime: {} });
const answer = (content: string) => new ToolMessage({ content, tool_call_id: 'call-1', name: 'Panels__generate_chart' });
const TIMEOUT = '{"chart":null,"success":false,"error":{"message":"Chart query failed to execute. The chart was not saved."}}';

describe('toolFailureOf', () => {
  it('reads a failure from a server answer, an executor error or an error status', () => {
    expect(toolFailureOf(answer(TIMEOUT))).toBe('Chart query failed to execute. The chart was not saved.');
    expect(toolFailureOf(answer('Error occurred while executing the tool. Request timed out'))).toContain('Request timed out');
    expect(toolFailureOf(new ToolMessage({ content: 'boom', tool_call_id: 'call-1', status: 'error' }))).toBe('boom');
  });

  it('does not count a normal answer, a policy notice or a refused change as a failure', () => {
    expect(toolFailureOf(answer('{"chart":{"id":7},"success":true}'))).toBeUndefined();
    expect(toolFailureOf(answer('**Evento enviado al frontend exitosamente**'))).toBeUndefined();
    expect(toolFailureOf(answer('NOT EXECUTED: this exact call already ran in this turn.'))).toBeUndefined();
    expect(toolFailureOf(answer("NOT UPDATED: the new value of 'x_axis' is not valid JSON"))).toBeUndefined();
    expect(
      toolFailureOf(
        new ToolMessage({
          content: "Error invoking tool 'Panels__update_chart' with error: Received tool input did not match expected schema",
          tool_call_id: 'call-1',
          status: 'error',
        })
      )
    ).toBeUndefined();
  });
});

describe('failingToolMiddleware', () => {
  it('runs a tool again after one failure, and stops it after the second', async () => {
    const guard = failing();
    const handler = jest.fn<(request: unknown) => Promise<unknown>>().mockResolvedValue(answer(TIMEOUT));
    for (let attempt = 0; attempt < config.tools.toolFailureLimit; attempt++) await guard.wrapToolCall(call('Panels__generate_chart'), handler);
    const third = await guard.wrapToolCall(call('Panels__generate_chart'), handler);
    expect(handler).toHaveBeenCalledTimes(config.tools.toolFailureLimit);
    expect(third.content).toBe(failedToolNotice('Panels__generate_chart'));
  });

  it('closes the turn once a tool failed twice: no more tools, and an instruction to say what could not be done', async () => {
    const guard = failing();
    const failed = jest.fn<(request: unknown) => Promise<unknown>>().mockResolvedValue(answer(TIMEOUT));
    const model = jest.fn<Handler>().mockResolvedValue('reply');

    await guard.wrapToolCall(call('Panels__generate_chart'), failed);
    await guard.wrapModelCall(turn(1), model);
    expect(model.mock.calls[0]![0].toolChoice).toBeUndefined();

    await guard.wrapToolCall(call('Panels__generate_chart'), failed);
    await guard.wrapModelCall(turn(2), model);
    const sent = model.mock.calls[1]![0];
    expect(sent.toolChoice).toBe('none');
    expect(sent.systemMessage.text).toContain(FAILED_TOOL_NOTE.trim().split('\n')[1]!);
  });

  it('counts failures by tool: another tool that works keeps running', async () => {
    const guard = failing();
    await guard.wrapToolCall(call('Panels__generate_chart'), jest.fn<(request: unknown) => Promise<unknown>>().mockResolvedValue(answer(TIMEOUT)));
    const ok = jest.fn<(request: unknown) => Promise<unknown>>().mockResolvedValue(answer('{"success":true}'));
    await guard.wrapToolCall(call('Panels__get_chart_info'), ok);
    await guard.wrapToolCall(call('Panels__get_chart_info'), ok);
    expect(ok).toHaveBeenCalledTimes(2);
  });
});
