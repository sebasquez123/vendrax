export interface ApiPortInterface {
  getChart?(params: GetChartAdapterParams): Promise<SavedChart>;
  updateChart?(params: UpdateChartAdapterParams): Promise<void>;
  deleteChart?(params: DeleteChartAdapterParams): Promise<void>;
  removeChartFromDashboard?(params: RemoveChartAdapterParams): Promise<void>;
  updateDashboard?(params: UpdateDashboardAdapterParams): Promise<SavedDashboard>;
  getDashboard?(params: GetDashboardAdapterParams): Promise<SavedDashboard>;
}

export enum ApiCapabilities {
  getChart = 'getChart',
  updateChart = 'updateChart',
  deleteChart = 'deleteChart',
  removeChartFromDashboard = 'removeChartFromDashboard',
  updateDashboard = 'updateDashboard',
  getDashboard = 'getDashboard',
}

export interface ApiTarget {
  baseUrl: string;
  accessToken: string;
}

export interface GetChartAdapterParams extends ApiTarget {
  chartId: number;
}

export interface UpdateChartAdapterParams extends ApiTarget {
  chartId: number;
  change: ChartChange;
}

export interface DeleteChartAdapterParams extends ApiTarget {
  chartId: number;
}

export interface RemoveChartAdapterParams extends ApiTarget {
  dashboardId: number;
  chartId: number;
}

export interface GetDashboardAdapterParams extends ApiTarget {
  dashboardId: number;
}

export interface UpdateDashboardAdapterParams extends ApiTarget {
  dashboardId: number;
  change: DashboardChange;
}

export interface DashboardChange {
  title?: string;
  published?: boolean;
}

export interface SavedDashboard {
  id: number;
  title: string;
  published: boolean;
  colorScheme: string;
}

export interface SavedChart {
  id: number;
  sliceName: string;
  vizType: string;
  description: string | null;
  datasetId: number | null;
  dashboardIds: number[];
  params: Record<string, unknown>;
}

export interface ChartChange {
  params?: Record<string, unknown>;
  sliceName?: string;
  description?: string;
  resetQueryContext?: boolean;
}

export interface ApiClient {
  account: string;
  getChart(chartId: number): Promise<SavedChart>;
  updateChart(chartId: number, change: ChartChange): Promise<void>;
  deleteChart(chartId: number): Promise<void>;
  removeChartFromDashboard(dashboardId: number, chartId: number): Promise<void>;
  updateDashboard(dashboardId: number, change: DashboardChange): Promise<SavedDashboard>;
  getDashboard(dashboardId: number): Promise<SavedDashboard>;
}
