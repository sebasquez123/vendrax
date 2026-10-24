import { z } from 'zod';

export const GetUserListInputSchema = z.object({
  offset: z.number().optional(),
  pageSize: z.number().optional(),
});

export const GetUserListOutputSchema = z.object({
  total: z.number(),
  count: z.number(),
  _embedded: z.object({
    elements: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      })
    ),
  }),
});

export type GetUserListInputType = z.infer<typeof GetUserListInputSchema>;
