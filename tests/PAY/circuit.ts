import type { Judge } from '../core/judge';
import { clipMiddle, describeTrace, show } from '../core/report';
import type { Conversation } from '../core/runtime';
import { terminal } from '../core/terminal';
import type { CircuitInfo, CircuitRecord, Group, StepEvidence, StepRecord, Turn } from '../core/types';

export const PAY_TOOL_PREFIX = 'Pay__';

export interface PayStep {
  kind: 'ask';
  label: string;
  message: string;
  expected: string;
  calls?: string[];
  asks?: boolean;
}

export interface PayCircuit extends CircuitInfo {
  steps: PayStep[];
}

export const ask = (label: string, message: string, expectation: Omit<PayStep, 'kind' | 'label' | 'message'>): PayStep => ({
  kind: 'ask',
  label,
  message,
  ...expectation,
});

export const group = (name: string, circuits: PayCircuit[]): Group<PayCircuit> => ({ name, circuits });

const NO_REPLY = 'No response from agent.';

const toolsOf = (turn: Turn): string[] => turn.trace.flatMap((entry) => (entry.kind === 'call' ? [entry.tool] : []));

const check = (step: PayStep, turn: Turn): { ok: boolean; detail: string; observations: string[] } => {
  if (turn.error) return { ok: false, detail: `el turno falló: ${turn.error}`, observations: [] };
  if (!turn.reply.trim() || turn.reply.trim() === NO_REPLY) return { ok: false, detail: 'el agente no respondió', observations: [] };
  const called = toolsOf(turn);
  const outside = [...new Set(called.filter((tool) => !tool.startsWith(PAY_TOOL_PREFIX)))];
  const observations = [
    ...(step.calls ?? []).filter((tool) => !called.includes(`${PAY_TOOL_PREFIX}${tool}`)).map((tool) => `no llamó a ${PAY_TOOL_PREFIX}${tool}`),
    ...(step.asks && !turn.reply.includes('?') ? ['no hizo ninguna pregunta'] : []),
  ];
  if (outside.length) return { ok: false, detail: `salió de PAY: llamó a ${outside.join(', ')}`, observations };
  return { ok: true, detail: called.length ? `respondió (${[...new Set(called)].join(', ')})` : 'respondió sin herramientas', observations };
};

const historyOf = (previous: StepRecord[]): string[] =>
  previous.map(
    (step) => `[${step.index}] usuario: "${step.message}" · asistente: "${clipMiddle((step.turn?.reply ?? '').replace(/\s+/g, ' '), 300)}"`
  );

/**
 * Circuito de PAY
 * Ejecuta un circuito como una conversación nueva sobre PAY.
 */
export const runPayCircuit = async (conversation: Conversation, circuit: PayCircuit, repetition: number, judge: Judge): Promise<CircuitRecord> => {
  const record: CircuitRecord = { id: circuit.id, name: circuit.name, repetition, steps: [] };
  const width = Math.max(...circuit.steps.map((step) => step.label.length));
  for (const [position, step] of circuit.steps.entries()) {
    const index = position + 1;
    const close = terminal.step(index, circuit.steps.length, step.label, width);
    const turn = await conversation.ask(step.message);
    const result = check(step, turn);
    const evidence: StepEvidence = {
      historial: historyOf(record.steps),
      mensaje_usuario: step.message,
      esperado: step.expected,
      respuesta_asistente: turn.reply || '(vacía)',
      recorrido_del_turno: describeTrace(turn.trace),
      eventos: turn.events.map((event) => `${event.action} ${show(event.object, 300)}`),
      verificacion: { cumple: result.ok, detalle: result.detail, ...(result.observations.length && { observaciones: result.observations }) },
    };
    const assessment = await judge.assessStep(evidence);
    const stepRecord: StepRecord = {
      index,
      label: step.label,
      kind: 'ask',
      message: step.message,
      expected: step.expected,
      ok: result.ok,
      detail: result.detail,
      diff: [],
      turn,
      assessment,
      ...(result.observations.length && { observations: result.observations }),
    };
    record.steps.push(stepRecord);
    close(result.ok ? 'ok' : 'fail', result.detail, assessment);
    if (result.observations.length) terminal.note(`        observación (no es falla): ${result.observations.join('; ')}`);
  }
  return record;
};
