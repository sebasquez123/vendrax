/**
 * Tipos de la política
 * Define los tipos de la política 08: una llamada, los hechos del turno que usan las reglas y su veredicto.
 */

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface TurnFacts {
  selectedDashboardId?: number;
}

export type PolicyVerdict = { decision: 'allow' } | { decision: 'block'; status: 'error' | 'notice'; message: string };
