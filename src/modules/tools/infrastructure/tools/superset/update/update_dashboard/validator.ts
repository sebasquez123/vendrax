import { z } from 'zod';

export const UpdateDashboardInputSchema = z
  .object({
    dashboard_id: z.number().describe("ID of the selected dashboard, as returned by 'get_dashboard_info' or 'list_dashboards'."),
    dashboard_title: z
      .string()
      .optional()
      .describe('New title, without any "[METBOT - ...]" prefix (it is added automatically). Omit it to keep the current title.'),
    published: z.boolean().optional().describe('true: publish the dashboard. false: set it back to draft. Omit it to keep its current state.'),
  })
  .superRefine((args, ctx) => {
    if (args.dashboard_title === undefined && args.published === undefined)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dashboard_title'], message: "Send 'dashboard_title', 'published' or both." });
  });

export type UpdateDashboardInputType = z.infer<typeof UpdateDashboardInputSchema>;
