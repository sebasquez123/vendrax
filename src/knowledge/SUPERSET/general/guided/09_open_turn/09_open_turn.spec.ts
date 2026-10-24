import { describe, expect, it } from '@jest/globals';
import type { ClientState } from '../../../07_client_state/interfaces';
import { openTurn as openSharedTurn } from '../../09_open_turn/09_open_turn';
import { openTurn } from './09_open_turn';

const state: ClientState = { domain: 'PAY', selectedDashboard: { id: 12, title: 'Recaudo' }, events: [] };
const input = (previousMessageCount: number) => ({ state, previousMessageCount, now: new Date('2026-10-14T00:00:00Z') });

describe('openTurn (guided)', () => {
  it("is the shared turn of 'general' with the same state block and tool params", () => {
    const guided = openTurn(input(3));
    const shared = openSharedTurn(input(3));
    expect(guided.statePrompt).toBe(shared.statePrompt);
    expect(guided.stateContextToolParams).toEqual(shared.stateContextToolParams);
  });

  it('asks for the review first in the first message of a conversation', () => {
    expect(openTurn(input(0)).evaluateToolCall!('generate_chart', { save_chart: true })).toMatchObject({ allow: false, status: 'notice' });
    expect(openTurn(input(0)).evaluateToolCall!('delete_chart', { chart_id: 7 })).toMatchObject({ allow: false, status: 'notice' });
  });

  it('keeps the shared rules: a chart is added only to the selected dashboard', () => {
    const turn = openTurn(input(3));
    expect(turn.evaluateToolCall!('add_chart_to_existing_dashboard', { dashboard_id: 12, chart_id: 7 })).toEqual({ allow: true });
    expect(turn.evaluateToolCall!('add_chart_to_existing_dashboard', { dashboard_id: 99, chart_id: 7 })).toMatchObject({
      allow: false,
      status: 'error',
    });
  });
});
