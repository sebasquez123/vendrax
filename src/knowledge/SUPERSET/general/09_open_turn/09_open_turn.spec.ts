import { describe, expect, it } from '@jest/globals';
import type { SocketContext } from '~/shared/context/types/context.types';
import { openTurn } from './09_open_turn';
import type { ClientState } from '../../07_client_state/interfaces';

const socket = (): SocketContext => ({
  traceId: 't',
  connection: null,
  user: { userId: 'u', userName: null, userEmail: null, birthDate: null, utc: null, language: null },
  client: { appClientId: 'c', scopes: null, botName: null },
  i18n: null,
});

const state = (events: ClientState['events'] = [], domain?: string): ClientState => ({
  domain,
  selectedDashboard: { id: 12, title: 'Recaudo' },
  events,
});

describe('openTurn', () => {
  it('lets any chart change run, and adds charts only to the selected dashboard', () => {
    const turn = openTurn({ state: state(), previousMessageCount: 4, now: new Date(), socket: socket() });
    expect(turn.evaluateToolCall!('update_chart', { chart_id: 50, config: { chart_type: 'xy' } })).toEqual({ allow: true });
    expect(turn.evaluateToolCall!('add_chart_to_existing_dashboard', { dashboard_id: 12, chart_id: 50 })).toEqual({ allow: true });
    expect(turn.evaluateToolCall!('add_chart_to_existing_dashboard', { dashboard_id: 99, chart_id: 50 })).toMatchObject({
      allow: false,
      status: 'error',
    });
  });

  it('shows the selected dashboard and recent outcomes', () => {
    const turn = openTurn({
      state: state([{ date: 'd', status: 'completed', tool: 'generate_chart', data: { chart_id: 3, chart_name: 'Recargas' } }]),
      previousMessageCount: 2,
      now: new Date('2026-10-07T03:00:00Z'),
      socket: socket(),
    });
    expect(turn.statePrompt).toContain('Selected dashboard: "Recaudo" (id 12)');
    expect(turn.statePrompt).toContain('generate_chart · completed · chart_id 3, chart_name "Recargas"');
  });

  it("hands the client's domain to the dashboard tools, and nothing when there is none", () => {
    const withDomain = openTurn({ state: state([], 'PAY'), previousMessageCount: 0, now: new Date(), socket: socket() });
    expect(withDomain.stateContextToolParams?.domain).toEqual({ contain: 'PAY' });
    const without = openTurn({ state: state(), previousMessageCount: 0, now: new Date(), socket: socket() });
    expect(without.stateContextToolParams?.domain).toBeUndefined();
  });
});
