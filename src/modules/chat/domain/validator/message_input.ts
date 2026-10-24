import { z } from 'zod';

export const MessageContextSchema = z.object({
  usertype: z.string({ message: 'usertype must be string' }),
  message: z.string({ message: 'message must be string' }),
});

export const stateContext = z.record(z.string(), z.unknown()).optional();

export const McpMessageSchema = z.object({
  context: z.array(MessageContextSchema, { message: 'context must be array' }),
  newMessage: z.string({ message: 'newMessage must be string' }).min(1, { message: 'newMessage cannot be empty' }),
  agent: z.string({ message: 'agent must be a string' }).optional(),
  mode: z.string({ message: 'mode must be a string' }).optional(),
  stateContext: stateContext,
});

export type McpMessageType = z.infer<typeof McpMessageSchema>;
export type MessageContextType = z.infer<typeof MessageContextSchema>;
export type StateContextType = z.infer<typeof stateContext>;

export const iframeChatSchema = z.object({
  appClientId: z.string({ message: 'appClientId must be a string' }),
  userId: z.string({ message: 'userId must be a string' }),
  scopes: z.string({ message: 'scopes must be a string' }),
  subdomains: z.string({ message: 'subdomains must be a string' }),
  modes: z.string({ message: 'modes must be a string' }),
  jwt: z.string({ message: 'jwt must be a string' }),
});

export type iframeChatType = z.infer<typeof iframeChatSchema>;
