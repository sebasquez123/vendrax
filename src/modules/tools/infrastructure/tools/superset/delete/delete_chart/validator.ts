import { z } from 'zod';

export const DeleteChartInputSchema = z.object({
  chart_id: z.number().describe("Chart ID, as returned by 'get_dashboard_info', 'list_charts' or 'get_chart_info'."),
  chart_title: z.string().describe('Chart title, as the dashboard shows it.'),
  dashboard_id: z.number().describe('ID of the selected dashboard: the one the chart is taken off.'),
  permanent: z
    .boolean()
    .describe(
      'false: take the chart off this dashboard only; the chart itself stays (other dashboards keep it and it can be added back). ' +
        'true: delete the chart itself for good, from every dashboard; it cannot be undone. True only when the user clearly asks to delete it for good.'
    ),
});

export type DeleteChartInputType = z.infer<typeof DeleteChartInputSchema>;
