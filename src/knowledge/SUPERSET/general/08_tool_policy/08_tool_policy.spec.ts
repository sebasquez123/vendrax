import { describe, expect, it } from '@jest/globals';
import { checkToolCall } from './08_tool_policy';
import type { ToolCall, TurnFacts } from './interfaces';

const facts: TurnFacts = { selectedDashboardId: 12 };

describe('checkToolCall', () => {
  it('lets read tools, chart creation and chart changes run', () => {
    expect(checkToolCall({ tool: 'get_chart_info', args: { chart_id: 7 } }, facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall({ tool: 'generate_chart', args: { dataset_id: 123 } }, facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall({ tool: 'update_chart', args: { chart_id: 7, config: { chart_type: 'xy' } } }, facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall({ tool: 'update_chart', args: { chart_id: 7, changes: [{ key: 'legendOrientation', value: '"bottom"' }] } }, facts)).toEqual(
      {
        decision: 'allow',
      }
    );
  });

  it('takes a chart off, or deletes it, only on the selected dashboard', () => {
    const remove = (dashboard_id: number): ToolCall => ({ tool: 'delete_chart', args: { chart_id: 7, dashboard_id, permanent: false } });
    expect(checkToolCall(remove(12), facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall(remove(99), facts)).toMatchObject({ decision: 'block', status: 'error' });
  });

  it('renames or publishes only the selected dashboard', () => {
    const rename = (dashboard_id: number): ToolCall => ({ tool: 'update_dashboard', args: { dashboard_id, dashboard_title: 'Recaudo 2026' } });
    expect(checkToolCall(rename(12), facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall(rename(99), facts)).toMatchObject({ decision: 'block', status: 'error', message: expect.stringContaining('renamed') });
  });

  it('adds charts only to the selected dashboard', () => {
    const add = (dashboard_id: number): ToolCall => ({ tool: 'add_chart_to_existing_dashboard', args: { dashboard_id, chart_id: 7 } });
    expect(checkToolCall(add(12), facts)).toEqual({ decision: 'allow' });
    expect(checkToolCall(add(99), facts)).toMatchObject({ decision: 'block', status: 'error' });
  });

  it('adds charts to any dashboard when none is selected', () => {
    const add: ToolCall = { tool: 'add_chart_to_existing_dashboard', args: { dashboard_id: 99, chart_id: 7 } };
    expect(checkToolCall(add, { selectedDashboardId: undefined })).toEqual({ decision: 'allow' });
  });
});
