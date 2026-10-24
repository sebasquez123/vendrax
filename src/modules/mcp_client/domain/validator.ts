import { z } from 'zod';

export const CallMcpServerSchema = z.object({
  serverName: z.string({ message: 'serverName must be string' }).min(1, { message: 'serverName cannot be empty' }),
  url: z.string({ message: 'url must be string' }).min(1, { message: 'url cannot be empty' }),
  toolName: z.string({ message: 'toolName must be string' }).min(1, { message: 'toolName cannot be empty' }),
  toolArgs: z.record(z.string(), z.any(), {
    message: 'toolArgs must be an object with string keys and any values',
  }),
  split: z.number({ message: 'split must be a number' }).optional(),
  authorization: z.string({ message: 'authorization must be a number' }).optional(),
});

export const GetMcpToolsSchema = z.object({
  serverName: z.string({ message: 'serverName must be string' }).min(1, { message: 'serverName cannot be empty' }),
  url: z.string({ message: 'url must be string' }).min(1, { message: 'url cannot be empty' }),
  split: z.number({ message: 'split must be a number' }).optional(),
  authorization: z.string({ message: 'authorization must be a number' }).optional(),
});

export type CallMcpServerType = z.infer<typeof CallMcpServerSchema>;
export type GetMcpToolsType = z.infer<typeof GetMcpToolsSchema>;
