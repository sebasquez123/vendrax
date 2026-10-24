import { describe, expect, it, jest } from '@jest/globals';
import type { ApiClient, DashboardChange } from '~/modules/api/application/interfaces/port.interface';
import { ApiForbiddenError, DomainErrorCodes as e } from '~/modules/api/domain/errors';
import { update_dashboard } from './tool';

/**
 * Cliente REST de prueba
 * Cliente REST que guarda lo recibido en el dashboard 91 ('PAY - SITME', publicado) y registra los eventos emitidos.
 */
const setup = (fails?: e) => {
  const updateDashboard = jest.fn(async (dashboardId: number, change: DashboardChange) => {
    if (fails) throw new ApiForbiddenError('refused', fails);
    return { id: dashboardId, title: change.title ?? 'PAY - SITME', published: change.published ?? true, colorScheme: '' };
  });
  const unused = async () => {
    throw new Error('not used');
  };
  const Api: ApiClient = {
    account: 'MET_BOT_PAY',
    getChart: unused,
    updateChart: unused,
    deleteChart: unused,
    removeChartFromDashboard: unused,
    updateDashboard,
    getDashboard: unused,
  };
  const onCustomEvent = jest.fn();
  const tool = update_dashboard({
    params: { body: { serverName: 'superset_mcp' }, langChainClient: {} as never, headers: {}, domain: { contain: 'PAY' } },
    callback: async () => 'not used',
    ApiService: Api,
    onCustomEvent,
  });
  return { tool, updateDashboard, onCustomEvent };
};

describe('update_dashboard', () => {
  it('sends only what changes, and reports the dashboard as saved to the agent and the interface', async () => {
    const { tool, updateDashboard, onCustomEvent } = setup();
    const result = await tool.invoke({ dashboard_id: 91, published: false });
    expect(updateDashboard).toHaveBeenCalledWith(91, { title: undefined, published: false });
    expect(result).toEqual({ updated: true, dashboard: { id: 91, title: 'PAY - SITME', published: false } });
    expect(onCustomEvent).toHaveBeenCalledWith(
      { dashboard_id: 91, dashboard_new_title: 'PAY - SITME', published: false },
      'rendering',
      'update_dashboard',
      'SuperSet'
    );
  });

  it('gives a new title the domain prefix, once', async () => {
    const { tool, updateDashboard } = setup();
    await tool.invoke({ dashboard_id: 91, dashboard_title: '[METBOT - PAY] Recaudo 2026' });
    expect(updateDashboard).toHaveBeenCalledWith(91, { title: '[METBOT - PAY] Recaudo 2026', published: undefined });
  });

  it('changes nothing and sends no event when the dashboard belongs to other users', async () => {
    const { tool, onCustomEvent } = setup(e.NOT_OWNER_ERROR);
    expect(await tool.invoke({ dashboard_id: 91, published: true })).toEqual(expect.stringContaining('NOT DONE'));
    expect(onCustomEvent).not.toHaveBeenCalled();
  });
});
