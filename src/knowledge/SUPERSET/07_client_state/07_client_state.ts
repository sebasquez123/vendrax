import { z } from 'zod';
import { describeIssues, InterfaceEvent, isRecord, parseEvents } from '~/modules/context/domain/client_state';
import type { StateContract } from '../../types';
import type { ClientState, Read, StateBlockInput } from './interfaces';

export const STATE: StateContract<ClientState> = {
  stateContextKey: 'SUPERSET',
  parse: (entry) => readEntry(entry),
};

const readEntry = (entry: unknown): { state: ClientState; issues: string[] } => {
  if (entry === undefined || entry === null) return { state: { events: [] }, issues: [] };
  if (!isRecord(entry)) return { state: { events: [] }, issues: ['the entry is not an object'] };

  const domain = readDomain(entry['domain']);
  const dashboard = readSelectedDashboard(entry['location']);
  const { events, issues: eventIssues } = parseEvents(entry['events']);
  return {
    state: { domain: domain.value, selectedDashboard: dashboard.value, events },
    issues: [...domain.issues, ...dashboard.issues, ...eventIssues],
  };
};

const readDomain = (raw: unknown): Read<string> => {
  if (raw === undefined) return { issues: [] };
  const domain = typeof raw === 'string' ? raw.trim() : '';
  return domain ? { value: domain, issues: [] } : { issues: ['domain dropped: it must be a non-empty string'] };
};

const LocationSchema = z.object({
  id: z.coerce.number().int().positive(),
  uuid: z.string().optional(),
  dashboard_title: z.string().optional(),
});

/**
 * Lectura del dashboard seleccionado
 * Lee el dashboard seleccionado; sin 'id' significa que no hay ninguno seleccionado, y eso no es un error.
 */
const readSelectedDashboard = (raw: unknown): Read<NonNullable<ClientState['selectedDashboard']>> => {
  if (raw === undefined || raw === null) return { issues: [] };
  if (!isRecord(raw)) return { issues: ['location dropped: it is not an object'] };
  if (raw['id'] === undefined || raw['id'] === null) return { issues: [] };
  const parsed = LocationSchema.safeParse(raw);
  if (!parsed.success) return { issues: [`location dropped: ${describeIssues(parsed.error)}`] };
  return { value: { id: parsed.data.id, uuid: parsed.data.uuid, title: parsed.data.dashboard_title }, issues: [] };
};

const SHOWN_EVENTS = 5;

/**
 * Bloque de estado actual
 * Renderiza el bloque de estado actual: el dashboard seleccionado y los eventos recientes.
 */
export const renderStateBlock = ({ state }: StateBlockInput): string => {
  const { selectedDashboard, events } = state;
  const lines = [
    selectedDashboard
      ? `Selected dashboard: "${selectedDashboard.title ?? 'untitled'}" (id ${selectedDashboard.id}). Changes apply only to this dashboard.`
      : "No dashboard is selected. When a request needs one, find it with 'list_dashboards' by the name the user gives; ask only when several or none match.",
  ];

  const recent = events.slice(-SHOWN_EVENTS);
  if (recent.length) {
    lines.push('', 'Recent events reported by the interface, oldest first (trust them over your own assumptions):');
    for (const event of recent) {
      const data = describeEventData(event.data);
      lines.push(`- ${event.date} · ${event.tool} · ${event.status}${data ? ` · ${data}` : ''}`);
    }
    lines.push(
      'A failed event means that change did not happen (it failed in the interface): when the user comes back to it, continue from what was already decided instead of starting over.'
    );
  }

  return lines.join('\n');
};

/**
 * Descripción de datos del evento
 * Describe los campos simples del evento; las listas, como los charts de un dashboard, se omiten.
 */
const describeEventData = (data: InterfaceEvent['data']): string =>
  Object.entries(data ?? {})
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => `${key} ${JSON.stringify(value)}`)
    .join(', ');
