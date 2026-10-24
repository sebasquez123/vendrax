import { z } from 'zod';

const FilterSchema = z.object({
  field: z.enum(['project', 'assigned_to', 'author', 'status', 'type']),
  operator: z.enum(['=', '!', '~', '!~', '*', '!*']),
  values: z.array(z.string()),
});

export const GetWorkPackagesInputSchema = z.object({
  offset: z.number().optional(),
  pageSize: z.number().optional(),
  filters: z.array(FilterSchema).optional(),
  sortBy: z
    .array(
      z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']),
      })
    )
    .optional(),
  groupBy: z.string().optional(),
});

const WorkPackageElementsScheme = z.object({
  id: z.number(),
  subject: z.string().nullable().optional(),
  spentTime: z.string().nullable().optional(),
  laborCosts: z.string().nullable().optional(),
  remainingTime: z.string().nullable().optional(),

  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedTime: z.string().nullable().optional(),

  percentageDone: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
  description: z.object({
    format: z.string().optional(),
    raw: z.string().optional(),
    html: z.string().optional(),
  }),
});

export const GetWorkPackagesOutputSchema = z.object({
  total: z.number(),
  count: z.number(),
  _embedded: z.object({
    elements: z.array(WorkPackageElementsScheme),
  }),
});

export type GetWorkPackagesInputType = z.infer<typeof GetWorkPackagesInputSchema>;
