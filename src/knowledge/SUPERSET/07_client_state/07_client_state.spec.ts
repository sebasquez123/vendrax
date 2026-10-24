import { describe, expect, it } from '@jest/globals';
import { renderStateBlock, STATE } from './07_client_state';

describe('07_client_state', () => {
  it("reads its own entry 'stateContext.SUPERSET': domain, selected dashboard and events", () => {
    const { state, issues } = STATE.parse({
      domain: 'PAY',
      location: { id: 12, uuid: 'abc', dashboard_title: 'Recaudo' },
      events: [{ date: '2026-10-08', status: 'completed', tool: 'generate_chart', data: { chart_id: 5 } }],
    });
    expect(STATE.stateContextKey).toBe('SUPERSET');
    expect(state.domain).toBe('PAY');
    expect(state.selectedDashboard).toEqual({ id: 12, uuid: 'abc', title: 'Recaudo' });
    expect(state.events).toHaveLength(1);
    expect(issues).toEqual([]);
  });

  it('accepts a numeric id sent as a string, and never invents a dashboard without id', () => {
    expect(STATE.parse({ location: { id: '12' } }).state.selectedDashboard?.id).toBe(12);
    expect(STATE.parse({ location: { dashboard_title: 'Sin id' } }).state.selectedDashboard).toBeUndefined();
    expect(STATE.parse({ location: {} }).issues).toEqual([]);
  });

  it('treats a missing entry as no domain, no dashboard and no events', () => {
    expect(STATE.parse(undefined)).toEqual({ state: { events: [] }, issues: [] });
  });

  it('drops only the invalid pieces and reports them', () => {
    const { state, issues } = STATE.parse({
      domain: 7,
      location: { id: 'not-a-number' },
      events: [
        { date: 'd', status: 'completed', tool: 'generate_chart' },
        { date: 'd', status: 'unknown', tool: 'generate_chart' },
      ],
    });
    expect(state.domain).toBeUndefined();
    expect(state.selectedDashboard).toBeUndefined();
    expect(state.events).toHaveLength(1);
    expect(issues).toHaveLength(3);
  });

  it('renders what it read', () => {
    const text = renderStateBlock({ state: { selectedDashboard: { id: 12, title: 'Recaudo' }, events: [] } });
    expect(text).toContain('Selected dashboard: "Recaudo" (id 12)');
  });
});
