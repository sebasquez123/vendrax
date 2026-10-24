import { z } from 'zod';
import type { StateContextType } from '~/modules/chat/domain/validator/message_input';

/**
 * Estado del cliente por servidor
 * El cliente envía una entrada por servidor en 'stateContext'; el motor no la interpreta y la entrega a su servidor.
 */
export const readServerState = (stateContext: StateContextType, key: string): unknown =>
  stateContext && Object.prototype.hasOwnProperty.call(stateContext, key) ? stateContext[key] : undefined;

export const InterfaceEventSchema = z.object({
  date: z.string(),
  status: z.enum(['completed', 'failed']),
  tool: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type InterfaceEvent = z.infer<typeof InterfaceEventSchema>;

export const parseEvents = (raw: unknown): { events: InterfaceEvent[]; issues: string[] } => {
  if (raw === undefined || raw === null) return { events: [], issues: [] };
  if (!Array.isArray(raw)) return { events: [], issues: ['events is not an array'] };
  const events: InterfaceEvent[] = [];
  const issues: string[] = [];
  raw.forEach((event, index) => {
    const parsed = InterfaceEventSchema.safeParse(event);
    if (parsed.success) events.push(parsed.data);
    else issues.push(`event ${index} dropped: ${describeIssues(parsed.error)}`);
  });
  return { events, issues };
};

export const describeIssues = (error: z.ZodError): string => error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ');

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
