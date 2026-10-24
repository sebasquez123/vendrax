import { describeControl, EDITABLE_CONTROLS, familyOf } from '~/modules/tools/infrastructure/tools/superset/update/guards/editable_controls';
import { changedKeys, clipMiddle, isDefaultWrite, show } from '../harness/checks';
import { describeTrace } from '../../core/report';
import type { StepEvidence, StepRecord, Turn } from '../../core/types';
import type { Params } from '../harness/superset';

const HISTORY_REPLY_CHARS = 300;

const flat = (text: string): string => text.replace(/\s+/g, ' ').trim();

export const historyOf = (previous: StepRecord[]): string[] =>
  previous.map((step) =>
    step.kind === 'break'
      ? `[${step.index}] ${step.label} · fuera de la conversación, la prueba dañó el gráfico en Superset: ${step.detail}`
      : step.kind === 'prepare'
        ? `[${step.index}] ${step.label} · fuera de la conversación, la prueba configuró el gráfico en Superset como uno de producción (ajustes que el asistente no crea): ${step.detail}`
        : `[${step.index}] ${step.label} · usuario: "${step.message}" · asistente: "${clipMiddle(flat(step.turn?.reply ?? ''), HISTORY_REPLY_CHARS)}" · verificado: ${step.ok ? '✓' : '✗'} ${step.detail}`
  );

/**
 * Claves enviadas a update_chart
 * Claves que el agente envió a 'update_chart' en este turno.
 */
const sentKeys = (turn: Turn): string[] =>
  turn.trace.flatMap((entry) => {
    if (entry.kind !== 'call' || !entry.tool.endsWith('update_chart')) return [];
    const changes = (entry.args as { changes?: { key?: unknown }[] } | undefined)?.changes ?? [];
    return changes.flatMap((change) => (typeof change?.key === 'string' ? [change.key] : []));
  });

/**
 * Significado de ajustes por tipo
 * Qué significa cada ajuste en el tipo de este gráfico, para las claves esperadas, enviadas o guardadas en el paso.
 */
const supersetOptionsOf = (keys: string[], params?: Params): string[] => {
  const vizType = params?.['viz_type'];
  const controls = typeof vizType === 'string' ? EDITABLE_CONTROLS[familyOf(vizType) ?? ''] : undefined;
  if (!controls || typeof vizType !== 'string') return [];
  return [...new Set(keys)].flatMap((key) => (controls[key] ? [`${key}: ${describeControl(controls[key], vizType)}`] : []));
};

export const stepEvidence = ({
  message,
  expected,
  turn,
  verified,
  detail,
  before,
  after,
  expectedKeys,
  previous,
  observations = [],
  uncertain,
}: {
  message: string;
  expected: string;
  turn: Turn;
  verified: boolean;
  detail: string;
  before?: Params;
  after?: Params;
  expectedKeys: string[];
  previous: StepRecord[];
  observations?: string[];
  uncertain?: string;
}): StepEvidence => {
  const saved = before && after ? changedKeys(before, after) : [];
  const diff = saved.map(
    (key) =>
      `${key}: ${show(before?.[key], 60)} → ${show(after?.[key], 60)}${before && after && isDefaultWrite(key, before, after) ? ' (valor por defecto de Superset: no cambia lo que se ve)' : ''}`
  );
  return {
    historial: historyOf(previous),
    mensaje_usuario: message,
    esperado: expected,
    respuesta_asistente: turn.reply || '(vacía)',
    recorrido_del_turno: describeTrace(turn.trace),
    eventos: turn.events.map((event) => `${event.action} ${show(event.object, 300)}`),
    verificacion: {
      cumple: verified,
      detalle: [detail, ...diff].join('; '),
      ...(observations.length && { observaciones: observations }),
      ...(uncertain && { sin_respaldo: uncertain }),
    },
    opciones: supersetOptionsOf([...expectedKeys, ...sentKeys(turn), ...saved], after ?? before),
  };
};
