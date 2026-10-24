import { describe, expect, it, jest } from '@jest/globals';
import type { ApiClient } from '~/modules/api/application/interfaces/port.interface';
import { ApiForbiddenError, ApiPreconditionFailedError, DomainErrorCodes as e } from '~/modules/api/domain/errors';
import { delete_chart } from './tool';

/**
 * Preparación de pruebas de borrado
 * Cliente REST que registra las llamadas y los eventos de interfaz que emite la herramienta.
 */
const setup = ({ deleteFails, removeFails }: { deleteFails?: e; removeFails?: e } = {}) => {
  const calls: string[] = [];
  const Api: ApiClient = {
    account: 'MET_BOT_PAY',
    getChart: async () => {
      throw new Error('not used');
    },
    updateChart: async () => undefined,
    deleteChart: async (chartId) => {
      calls.push(`delete ${chartId}`);
      if (deleteFails) throw new ApiForbiddenError('refused', deleteFails);
    },
    removeChartFromDashboard: async (dashboardId, chartId) => {
      calls.push(`remove ${chartId} from ${dashboardId}`);
      if (removeFails) throw new ApiPreconditionFailedError('refused', removeFails);
    },
    updateDashboard: async () => {
      throw new Error('not used');
    },
    getDashboard: async () => {
      throw new Error('not used');
    },
  };
  const onCustomEvent = jest.fn();
  const tool = delete_chart({
    params: { body: { serverName: 'superset_mcp' }, langChainClient: {} as never, headers: {} },
    callback: async () => 'not used',
    ApiService: Api,
    onCustomEvent,
  });
  return { tool, calls, onCustomEvent };
};

const ask = (permanent: boolean) => ({ chart_id: 3510, chart_title: 'Recaudo mensual', dashboard_id: 91, permanent });

describe('delete_chart', () => {
  it('with permanent false, only takes the chart off the selected dashboard, and still tells the interface', async () => {
    const { tool, calls, onCustomEvent } = setup();
    const result = await tool.invoke(ask(false));
    expect(calls).toEqual(['remove 3510 from 91']);
    expect(result).toMatchObject({ done: 'removed_from_dashboard', chart: { id: 3510 } });
    expect(onCustomEvent).toHaveBeenCalledWith(
      { chart_id: 3510, chart_title: 'Recaudo mensual', dashboard_id: 91, permanent: false },
      'rendering',
      'delete_chart',
      'SuperSet'
    );
  });

  it('with permanent true, deletes the chart and then cleans its place on the dashboard', async () => {
    const { tool, calls, onCustomEvent } = setup();
    const result = await tool.invoke(ask(true));
    expect(calls).toEqual(['delete 3510', 'remove 3510 from 91']);
    expect(result).toMatchObject({ done: 'deleted' });
    expect(onCustomEvent).toHaveBeenCalledTimes(1);
  });

  it('changes nothing and sends no event when the chart cannot be deleted', async () => {
    const { tool, calls, onCustomEvent } = setup({ deleteFails: e.NOT_OWNER_ERROR });
    const result = await tool.invoke(ask(true));
    expect(result).toEqual(expect.stringContaining('NOT DONE'));
    expect(calls).toEqual(['delete 3510']);
    expect(onCustomEvent).not.toHaveBeenCalled();
  });

  it('refuses to take the chart off a dashboard that keeps charts outside its saved layout', async () => {
    const { tool, onCustomEvent } = setup({ removeFails: e.UNSAVED_LAYOUT_ERROR });
    expect(await tool.invoke(ask(false))).toEqual(expect.stringContaining('save it once'));
    expect(onCustomEvent).not.toHaveBeenCalled();
  });

  it('reports a deleted chart whose empty place could not be cleaned', async () => {
    const { tool, onCustomEvent } = setup({ removeFails: e.UNSAVED_LAYOUT_ERROR });
    const result = await tool.invoke(ask(true));
    expect(result).toMatchObject({ done: 'deleted', notice: expect.stringContaining('empty place') });
    expect(onCustomEvent).toHaveBeenCalledTimes(1);
  });
});
