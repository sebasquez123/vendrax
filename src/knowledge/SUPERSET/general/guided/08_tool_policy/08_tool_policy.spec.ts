import { describe, expect, it } from '@jest/globals';
import { checkReviewShown } from './08_tool_policy';

const first = { previousMessageCount: 0 };
const later = { previousMessageCount: 2 };

describe('checkReviewShown', () => {
  it('refuses every write in the first message of a conversation, where no review can have been shown', () => {
    const writes: [string, Record<string, unknown>][] = [
      ['generate_chart', { dataset_id: 1, save_chart: true }],
      ['update_chart', { chart_id: 7 }],
      ['add_chart_to_existing_dashboard', { dashboard_id: 12, chart_id: 7 }],
      ['delete_chart', { chart_id: 7 }],
      ['update_dashboard', { dashboard_id: 12 }],
    ];
    for (const [tool, args] of writes)
      expect({ tool, verdict: checkReviewShown({ tool, args }, first) }).toEqual({
        tool,
        verdict: { decision: 'block', status: 'notice', message: expect.stringContaining('review') },
      });
  });

  it('lets reads and an unsaved preview run in the first message', () => {
    expect(checkReviewShown({ tool: 'get_dataset_info', args: { dataset_id: 1 } }, first)).toEqual({ decision: 'allow' });
    expect(checkReviewShown({ tool: 'generate_chart', args: { dataset_id: 1, save_chart: false } }, first)).toEqual({ decision: 'allow' });
  });

  it('lets writes run once the conversation has earlier messages: the playbook asks for the review there', () => {
    expect(checkReviewShown({ tool: 'generate_chart', args: { dataset_id: 1, save_chart: true } }, later)).toEqual({ decision: 'allow' });
    expect(checkReviewShown({ tool: 'delete_chart', args: { chart_id: 7 } }, later)).toEqual({ decision: 'allow' });
  });
});
