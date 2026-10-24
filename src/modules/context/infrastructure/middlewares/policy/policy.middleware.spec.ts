import { describe, expect, it, jest } from '@jest/globals';
import { ToolMessage } from 'langchain';
import type { DomainToolPolicy } from '~/modules/context/domain/interfaces/context.interfaces';
import { budgetNotice, buildToolPolicyMiddleware, REPEATED_CALL_NOTICE } from './policy.middleware';

type Handler = (request: unknown) => Promise<unknown>;
type WrapToolCall = (request: unknown, handler: Handler) => Promise<ToolMessage>;
type Evaluate = NonNullable<DomainToolPolicy['evaluate']>;

const request = (name: string, args: Record<string, unknown> = {}) => ({
  toolCall: { name, id: 'call-1', args },
  tool: undefined,
  state: {},
  runtime: {},
});

const SUPERSET_TOOLS = new Set([
  'Panels__update_chart',
  'Panels__generate_chart',
  'Panels__list_charts',
  'Panels__search_knowledge',
  'Panels__get_chart_info',
]);

const wrapOf = (evaluate: Evaluate, limits?: Record<string, number>): WrapToolCall =>
  (buildToolPolicyMiddleware([{ toolNames: SUPERSET_TOOLS, prefix: 'Panels__', evaluate, limits }]) as unknown as { wrapToolCall: WrapToolCall })
    .wrapToolCall;

const allow: Evaluate = () => ({ allow: true });
const ran = () => jest.fn<Handler>().mockResolvedValue(new ToolMessage({ content: 'ok', tool_call_id: 'call-1' }));

describe('buildToolPolicyMiddleware', () => {
  it('answers a blocked call with the policy message without running the tool', async () => {
    const handler = jest.fn<Handler>();
    const wrap = wrapOf(() => ({ allow: false, message: 'NOT EXECUTED: ask the user first', status: 'notice' }));
    const result = await wrap(request('Panels__update_chart', { chart_id: 7 }), handler);
    expect(handler).not.toHaveBeenCalled();
    expect(result.content).toBe('NOT EXECUTED: ask the user first');
    expect(result.status).toBe('success');
  });

  it('passes the short tool name and the arguments to the policy', async () => {
    const evaluate = jest.fn<Evaluate>(allow);
    const handler = ran();
    await wrapOf(evaluate)(request('Panels__update_chart', { chart_id: 7 }), handler);
    expect(evaluate).toHaveBeenCalledWith('update_chart', { chart_id: 7 });
    expect(handler).toHaveBeenCalled();
  });

  it('leaves tools of other domains to run untouched', async () => {
    const evaluate = jest.fn<Evaluate>(allow);
    const handler = ran();
    await wrapOf(evaluate)(request('Google__search_gmail_messages'), handler);
    expect(evaluate).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  it('turns a tool error into a message for the model instead of ending the turn', async () => {
    const handler = jest.fn<Handler>().mockRejectedValue(new Error('Received tool input did not match expected schema'));
    const result = await wrapOf(allow)(request('Panels__generate_chart'), handler);
    expect(result.status).toBe('error');
    expect(result.content).toContain('did not match expected schema');
  });

  it('still propagates an aborted run', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const handler = jest.fn<Handler>().mockRejectedValue(abort);
    await expect(wrapOf(allow)(request('Panels__generate_chart'), handler)).rejects.toBe(abort);
  });

  it('does not run the exact same call twice in one turn, whatever the key order', async () => {
    const wrap = wrapOf(allow);
    const handler = ran();
    await wrap(request('Panels__list_charts', { page: 1, search: 'recaudo' }), handler);
    const again = await wrap(request('Panels__list_charts', { search: 'recaudo', page: 1 }), handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(again.content).toBe(REPEATED_CALL_NOTICE);
  });

  it('stops a search over its turn budget with a message to answer or ask instead', async () => {
    const wrap = wrapOf(allow, { search_knowledge: 2 });
    const handler = ran();
    await wrap(request('Panels__search_knowledge', { query: 'ventas' }), handler);
    await wrap(request('Panels__search_knowledge', { query: 'total ventas' }), handler);
    const third = await wrap(request('Panels__search_knowledge', { query: 'qué son ventas' }), handler);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(third.content).toBe(budgetNotice('search_knowledge'));
  });

  it('lets a failed call be retried', async () => {
    const wrap = wrapOf(allow);
    const handler = jest
      .fn<Handler>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(new ToolMessage({ content: 'ok', tool_call_id: 'call-1' }));
    await wrap(request('Panels__get_chart_info', { chart_id: 7 }), handler);
    const retried = await wrap(request('Panels__get_chart_info', { chart_id: 7 }), handler);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(retried.content).toBe('ok');
  });

  it('lets a call the server answered as failed be retried as it was', async () => {
    const wrap = wrapOf(allow);
    const handler = jest
      .fn<Handler>()
      .mockResolvedValueOnce(new ToolMessage({ content: '{"success":false,"error":{"message":"query timed out"}}', tool_call_id: 'call-1' }))
      .mockResolvedValueOnce(new ToolMessage({ content: 'Error occurred while executing the tool. Request timed out', tool_call_id: 'call-1' }))
      .mockResolvedValue(new ToolMessage({ content: '{"success":true}', tool_call_id: 'call-1' }));
    for (let attempt = 0; attempt < 3; attempt++) await wrap(request('Panels__generate_chart', { chart_name: 'x' }), handler);
    expect(handler).toHaveBeenCalledTimes(3);
    const repeated = await wrap(request('Panels__generate_chart', { chart_name: 'x' }), handler);
    expect(repeated.content).toBe(REPEATED_CALL_NOTICE);
  });

  it('applies a server policy by tool ownership, also to tools without a prefix', async () => {
    const evaluate = jest.fn<Evaluate>(allow);
    const wrap = (
      buildToolPolicyMiddleware([{ toolNames: new Set(['get_persons']), prefix: '', evaluate, limits: { get_persons: 1 } }]) as unknown as {
        wrapToolCall: WrapToolCall;
      }
    ).wrapToolCall;
    const handler = ran();
    await wrap(request('get_persons', { page: 1 }), handler);
    const second = await wrap(request('get_persons', { page: 2 }), handler);
    expect(evaluate).toHaveBeenCalledWith('get_persons', { page: 1 });
    expect(second.content).toBe(budgetNotice('get_persons'));
  });
});
