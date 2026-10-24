import { describe, expect, it, jest } from '@jest/globals';
import type { ApiClient, ChartChange, SavedChart } from '~/modules/api/application/interfaces/port.interface';
import { update_chart } from './tool';

const setup = (chart: SavedChart, dashboardColorScheme = '') => {
  const updateChart = jest.fn(async (_chartId: number, _change: ChartChange) => undefined);
  const Api: ApiClient = {
    account: 'MET_BOT_PAY',
    getChart: async () => chart,
    updateChart,
    deleteChart: async () => undefined,
    removeChartFromDashboard: async () => undefined,
    updateDashboard: async () => {
      throw new Error('not used');
    },
    getDashboard: async (dashboardId) => ({ id: dashboardId, title: 'PAY - SITME', published: true, colorScheme: dashboardColorScheme }),
  };
  const callback = jest.fn(async () => 'not used');
  const tool = update_chart({
    params: { body: { serverName: 'superset_mcp' }, langChainClient: {} as never, headers: {}, selected_dashboard_id: 12 },
    callback,
    ApiService: Api,
  });
  return { tool, updateChart, callback };
};

const PIVOT: SavedChart = {
  id: 9,
  sliceName: 'Ventas cruzadas',
  vizType: 'pivot_table_v2',
  description: null,
  datasetId: 1,
  dashboardIds: [12],
  params: { viz_type: 'pivot_table_v2', groupbyRows: ['PLACE'], metrics: ['Total validaciones'] },
};
const DONUT: SavedChart = {
  id: 10,
  sliceName: 'Validaciones por dispositivo',
  vizType: 'pie',
  description: null,
  datasetId: 1,
  dashboardIds: [12],
  params: { viz_type: 'pie', groupby: ['DEVICE_TYPE'], metric: 'Total validaciones', color_scheme: 'supersetColors', donut: true },
};

describe('update_chart (partial change through the REST API)', () => {
  it('saves a new title or description on any chart type, without touching its settings', async () => {
    const { tool, updateChart } = setup(PIVOT);
    const result = await tool.invoke({ chart_id: 9, chart_name: 'Ventas por zona', description: 'Ventas por zona y mes' });
    expect(result).toMatchObject({ updated: true, changed: { description: { before: null, after: 'Ventas por zona y mes' } } });
    expect(updateChart).toHaveBeenCalledWith(9, { sliceName: 'Ventas por zona', description: 'Ventas por zona y mes' });
  });

  it('still refuses a change of settings on a chart type that cannot be changed from here', async () => {
    const { tool, updateChart } = setup({ ...PIVOT, vizType: 'gauge_chart', params: { viz_type: 'gauge_chart' } });
    const result = await tool.invoke({ chart_id: 9, changes: [{ key: 'row_limit', value: '50' }] });
    expect(result).toEqual(expect.stringContaining('NOT UPDATED'));
    expect(updateChart).not.toHaveBeenCalled();
  });

  it('changes a setting of a chart type that cannot be rebuilt', async () => {
    const { tool, updateChart } = setup(PIVOT);
    const result = await tool.invoke({ chart_id: 9, changes: [{ key: 'rowTotals', value: 'true' }] });
    expect(result).toMatchObject({ updated: true, changed: { rowTotals: { before: null, after: true } } });
    expect(updateChart).toHaveBeenCalledWith(9, expect.objectContaining({ params: expect.objectContaining({ rowTotals: true }) }));
  });

  it('takes a number or true/false as it comes, the same as sent as JSON text', async () => {
    const asValues = setup(DONUT);
    const result = await asValues.tool.invoke({
      chart_id: 10,
      changes: [
        { key: 'innerRadius', value: 50 },
        { key: 'show_legend', value: false },
      ],
    });
    const asText = setup(DONUT);
    await asText.tool.invoke({
      chart_id: 10,
      changes: [
        { key: 'innerRadius', value: '50' },
        { key: 'show_legend', value: 'false' },
      ],
    });
    expect(result).toMatchObject({ updated: true, changed: { innerRadius: { after: 50 }, show_legend: { after: false } } });
    expect(asValues.updateChart.mock.calls[0]).toEqual(asText.updateChart.mock.calls[0]);
  });

  it('refuses a new palette on the open dashboard when that dashboard imposes its own, and saves it when it does not', async () => {
    const imposed = setup(DONUT, 'bnbColors');
    expect(await imposed.tool.invoke({ chart_id: 10, changes: [{ key: 'color_scheme', value: '"blueToGreen"' }] })).toEqual(
      expect.stringContaining('NOT UPDATED')
    );
    expect(imposed.updateChart).not.toHaveBeenCalled();

    const free = setup(DONUT);
    expect(await free.tool.invoke({ chart_id: 10, changes: [{ key: 'color_scheme', value: '"blueToGreen"' }] })).toMatchObject({ updated: true });
  });
});
