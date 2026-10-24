import get_dashboard_info from './get/get_dashboard_info/tool';
import get_chart_info from './get/get_chart_info/tool';
import get_dataset_info from './get/get_dataset_info/tool';
import get_chart_data from './get/get_chart_data/tool';
import get_chart_type_schema from './get/get_chart_type_schema/tool';
import list_charts from './list/list_charts/tool';
import list_dashboards from './list/list_dashboards/tool';
import list_datasets from './list/list_datasets/tool';
import generate_chart from './generate/generate_chart/tool';
import add_chart_to_existing_dashboard from './generate/add_chart_to_existing_dashboard/tool';
import update_chart from './update/update_chart/tool';
import delete_chart from './delete/delete_chart/tool';
import update_dashboard from './update/update_dashboard/tool';
import make_suggestions from './triggers/make_suggestions/tool';
import make_image from './triggers/make_image/tool';

export const superset = [
  list_dashboards,
  list_datasets,
  list_charts,
  get_dashboard_info,
  get_chart_info,
  get_dataset_info,
  get_chart_data,
  get_chart_type_schema,
  generate_chart,
  add_chart_to_existing_dashboard,
  update_chart,
  update_dashboard,
  delete_chart,
  make_suggestions,
  make_image,
];
