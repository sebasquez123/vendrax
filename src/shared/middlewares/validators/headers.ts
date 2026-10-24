import z from 'zod';

export const connectionHeaderSchema = z.object({
  appClientId: z.string('appClientId is required'),
  userId: z.string('userId is required'),
  scopes: z.string('scopes is required'),
  subdomains: z.string('subdomains is required'),
  modes: z.string('modes is required'),
  jwt: z.string().optional(),
});

export type connectionHeaderType = z.infer<typeof connectionHeaderSchema>;
