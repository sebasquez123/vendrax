import { describe, expect, it } from '@jest/globals';
import { parseEvents, readServerState } from '../client_state';

describe('readServerState', () => {
  it('hands each server only its own entry, as it came', () => {
    const SUPERSET = { domain: 'PAY', location: { id: 12 } };
    expect(readServerState({ SUPERSET, PAY: { x: 1 } }, 'SUPERSET')).toBe(SUPERSET);
    expect(readServerState({ SUPERSET }, 'PAY')).toBeUndefined();
    expect(readServerState(undefined, 'SUPERSET')).toBeUndefined();
  });
});

describe('parseEvents', () => {
  it('keeps valid events in order and reports the invalid ones', () => {
    const { events, issues } = parseEvents([
      { date: 'd1', status: 'completed', tool: 'generate_chart', data: { chart_id: 5 } },
      { date: 'd2', status: 'unknown', tool: 'generate_chart' },
      { date: 'd3', status: 'failed', tool: 'delete_chart' },
      { date: 'd4', status: 'rejected', tool: 'delete_chart' },
    ]);
    expect(events.map((event) => event.date)).toEqual(['d1', 'd3']);
    expect(issues).toEqual([expect.stringContaining('event 1 dropped'), expect.stringContaining('event 3 dropped')]);
  });

  it('treats missing events as none and a non-array as an issue', () => {
    expect(parseEvents(undefined)).toEqual({ events: [], issues: [] });
    expect(parseEvents('x').issues).toEqual(['events is not an array']);
  });
});
