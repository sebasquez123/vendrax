import { z } from 'zod';

export const AgentFeedbackSchema = z.object({
  appClientId: z.string({ message: 'appClientId must be a string' }).uuid({ message: 'appClientId must be a uuid' }),
  userId: z.coerce.number({ message: 'userId must be a number' }).int({ message: 'userId must be an integer' }),
  type: z.string({ message: 'type must be a string' }).trim().min(1, { message: 'type cannot be empty' }).max(100),
  comment: z.string({ message: 'comment must be a string' }).trim().max(5000).optional(),
  conversation: z
    .union([z.array(z.unknown()), z.record(z.string(), z.unknown())], { message: 'conversation must be a JSON array or object' })
    .optional(),
});

export type AgentFeedbackType = z.infer<typeof AgentFeedbackSchema>;
