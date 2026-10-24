import { type BaseChartKind, baseChartName, type Production, productionSettings } from '../fixtures';
import { stepEvidence } from '../judge/evidence';
import type { Judge } from '../../core/judge';
import { diffLines, eventsOf, idOf, keysOf, show, unmet, visibleChanges, writesIn } from './checks';
import type { BaseCharts } from './preflight';
import type { Conversation } from '../../core/runtime';
import { terminal } from '../../core/terminal';
import type { CircuitRecord, StepRecord, Turn } from '../../core/types';
import type { Dashboard, SupersetRuntime } from './runtime';
import {
  type ChartSnapshot,
  chartExists,
  type CleanupScope,
  type Damage,
  damageChart,
  isOnDashboard,
  type Params,
  readChart,
  removeCharts,
  restoreChart,
  snapshotChart,
} from './superset';

export type Outcome = 'created' | 'applied' | 'not_applied' | 'asks' | 'removed' | 'deleted' | 'judged';

export interface AskStep {
  kind: 'ask';
  label: string;
  message: string;
  outcome: Outcome;
  changes?: Record<string, unknown>;
  observe?: Record<string, unknown>;
  allowAlso?: string[];
  unsupported?: { key: string; value?: unknown };
  uncertain?: string;
  expected: string;
}

export interface BreakStep {
  kind: 'break' | 'prepare';
  label: string;
  damage: Damage;
  production?: Production;
}

export type Step = AskStep | BreakStep;

export interface Circuit {
  id: string;
  name: string;
  mode?: 'advance' | 'guided';
  dataset: string;
  base?: BaseChartKind;
  steps: Step[];
}

export const ask = (label: string, message: string, expectation: Omit<AskStep, 'kind' | 'label' | 'message'>): AskStep => ({
  kind: 'ask',
  label,
  message,
  ...expectation,
});

export const breakChart = (label: string, damage: Damage): BreakStep => ({ kind: 'break', label, damage });

/**
 * Preparar gráfico como producción
 * Guarda ajustes que el agente no puede crear (fórmulas SQL, rango de fechas) para igualar un gráfico de producción.
 */
export const prepareChart = (label: string, production: Production): BreakStep => ({
  kind: 'prepare',
  label,
  damage: productionSettings(production),
  production,
});

export interface Group {
  name: string;
  circuits: Circuit[];
}

const OWN_CHART_OUTCOMES = ['created', 'removed', 'deleted'];

export const group = (name: string, circuits: Circuit[]): Group => {
  for (const circuit of circuits) {
    const step = circuit.base && circuit.steps.find((one) => one.kind === 'ask' && OWN_CHART_OUTCOMES.includes(one.outcome));
    if (step)
      throw new Error(`${circuit.id} › ${step.label}: a circuit on a base chart never creates it, takes it off its dashboard nor deletes it.`);
  }
  return { name, circuits };
};

interface CircuitState {
  dashboard: Dashboard;
  chartId?: number;
  created: Set<number>;
}

export interface RunLedger {
  created: Set<number>;
  borrowed: Map<number, ChartSnapshot>;
  bases: BaseCharts;
}

/**
 * Alcance de la limpieza
 * Define lo que la limpieza puede tocar: el sandbox y el dashboard base, nunca los gráficos base del ingeniero.
 */
export const cleanupScope = (runtime: SupersetRuntime, ledger: RunLedger): CleanupScope => ({
  dashboards: [runtime.dashboard.id, ...(ledger.bases.dashboard ? [ledger.bases.dashboard.id] : [])],
  keep: new Set(Object.values(ledger.bases.charts).flatMap((base) => (base && 'chartId' in base ? [base.chartId] : []))),
});

/**
 * Ejecución de un circuito
 * Ejecuta un circuito como una conversación nueva.
 */
export const runCircuit = async (
  runtime: SupersetRuntime,
  circuit: Circuit,
  repetition: number,
  judge: Judge,
  ledger: RunLedger
): Promise<CircuitRecord> => {
  const record: CircuitRecord = { id: circuit.id, name: circuit.name, repetition, steps: [] };
  const state: CircuitState = { dashboard: runtime.dashboard, created: new Set() };

  /**- 1. GRÁFICO BASE: el del ingeniero y su dashboard */
  let snapshot: ChartSnapshot | undefined;
  if (circuit.base) {
    const base = ledger.bases.charts[circuit.base];
    if (!base || 'missing' in base || !ledger.bases.dashboard) {
      record.skipped = `requiere ${baseChartName(circuit.base)}: ${base && 'missing' in base ? base.missing : 'no se buscó'}`;
      terminal.warn(`    omitido: ${record.skipped}`);
      return record;
    }
    snapshot = await snapshotChart(await runtime.api(), base.chartId);
    ledger.borrowed.set(base.chartId, snapshot);
    state.dashboard = ledger.bases.dashboard;
    state.chartId = base.chartId;
    terminal.note(`    sobre ${baseChartName(circuit.base)} (id ${base.chartId}) de "${state.dashboard.title}"; se restaura al terminar`);
  }

  /**- 2. PASOS: en orden, como una conversación */
  const conversation = runtime.conversation(circuit.mode ?? 'advance', state.dashboard);
  const width = Math.max(...circuit.steps.map((step) => step.label.length));
  try {
    for (const [position, step] of circuit.steps.entries()) {
      const index = position + 1;
      const close = terminal.step(index, circuit.steps.length, step.label, width);
      let result: StepRecord;
      try {
        result =
          step.kind === 'ask'
            ? await runAsk(runtime, conversation, step, state, judge, index, [...record.steps])
            : await runBreak(runtime, step, state, index);
      } catch (error) {
        result = {
          index,
          label: step.label,
          kind: step.kind,
          ok: false,
          detail: `error: ${error instanceof Error ? error.message : String(error)}`,
          diff: [],
        };
      }
      record.steps.push(result);
      for (const chartId of state.created) ledger.created.add(chartId);
      close(!result.ok ? (result.uncertain ? 'info' : 'fail') : step.kind === 'ask' ? 'ok' : 'info', result.detail, result.assessment);
      if (result.uncertain) terminal.note(`        sin respaldo, no cuenta: ${result.uncertain}`);
      if (result.observations?.length) terminal.note(`        observación (no es falla): ${result.observations.join('; ')}`);
      if (step.kind === 'ask' && step.outcome === 'created' && state.chartId === undefined) {
        terminal.note('    circuito detenido: no hay gráfico sobre el cual seguir');
        break;
      }
    }
  } finally {
    /**- 3. LIMPIEZA: restaurar base y borrar sobrantes */
    if (snapshot) {
      const restored = await runtime
        .api()
        .then((api) => restoreChart(api, snapshot))
        .then(() => true)
        .catch(() => false);
      if (restored) ledger.borrowed.delete(snapshot.chartId);
      const placed = await runtime
        .api()
        .then((api) => isOnDashboard(api, snapshot.chartId, state.dashboard.id))
        .catch(() => true);
      record.restored = restored && placed;
      if (!restored) terminal.warn(`    limpieza: no se pudo restaurar el gráfico base ${snapshot.chartId}; se reintenta al final`);
      if (!placed)
        terminal.warn(`    limpieza: el gráfico base ${snapshot.chartId} quedó fuera de "${state.dashboard.title}": vuelve a agregarlo en Superset`);
    }
    if (state.created.size) {
      const ids = [...state.created];
      record.cleanup = await runtime
        .api()
        .then((api) => removeCharts(api, ids, cleanupScope(runtime, ledger)))
        .catch(() => ({ removed: [], left: ids }));
      if (record.cleanup.removed.length)
        terminal.note(`    limpieza: la prueba borró el gráfico ${record.cleanup.removed.join(', ')}, que quedó del circuito`);
      if (record.cleanup.left.length)
        terminal.warn(`    limpieza: no se pudo borrar el gráfico ${record.cleanup.left.join(', ')}; se reintenta al final`);
    }
  }
  return record;
};

const runBreak = async (runtime: SupersetRuntime, step: BreakStep, state: CircuitState, index: number): Promise<StepRecord> => {
  const base = { index, label: step.label, kind: step.kind };
  const action = step.kind === 'prepare' ? 'preparar' : 'estropear';
  if (!state.chartId) return { ...base, ok: false, detail: `no hay gráfico que ${action}`, diff: [] };
  try {
    const api = await runtime.api();
    const before = await readChart(api, state.chartId);
    const damage = await damageChart(api, state.chartId, step.damage);
    const after = await readChart(api, state.chartId);
    const detail = Object.entries(damage)
      .map(([key, value]) => `${key}=${show(value, 40)}`)
      .join(', ');
    return { ...base, ok: true, detail, diff: diffLines(before, after) };
  } catch (error) {
    return { ...base, ok: false, detail: `no se pudo ${action}: ${error instanceof Error ? error.message : String(error)}`, diff: [] };
  }
};

const runAsk = async (
  runtime: SupersetRuntime,
  conversation: Conversation,
  step: AskStep,
  state: CircuitState,
  judge: Judge,
  index: number,
  previous: StepRecord[]
): Promise<StepRecord> => {
  const { message, expected } = step;
  const before = state.chartId ? await readChart(await runtime.api(), state.chartId).catch(() => undefined) : undefined;
  const turn = await conversation.ask(message);
  const createdNow = eventsOf(turn, 'generate_chart').flatMap((object) => idOf(object['chart_id']) ?? []);
  createdNow.forEach((chartId) => state.created.add(chartId));

  let check: Check;
  try {
    check = await verify(runtime, step, turn, state, before);
  } catch (error) {
    check = { ok: false, detail: `no se pudo verificar: ${error instanceof Error ? error.message : String(error)}` };
  }

  const replacement = step.outcome === 'created' ? undefined : createdNow.at(-1);
  if (replacement && replacement !== state.chartId) {
    const api = await runtime.api();
    if (await chartExists(api, replacement)) {
      check.detail += `; el agente hizo otro gráfico (id ${replacement}) en lugar de cambiar el ${state.chartId ?? '(ninguno)'}: los pasos siguientes siguen al nuevo`;
      state.chartId = replacement;
    }
  }
  const diff = before && check.after ? diffLines(before, check.after) : [];
  const observations = step.observe && check.after ? unmet(step.observe, check.after) : [];
  const assessment = await judge.assessStep(
    stepEvidence({
      message,
      expected,
      turn,
      verified: check.ok,
      detail: check.detail,
      before,
      after: check.after,
      expectedKeys: Object.keys({ ...step.changes, ...step.observe }).flatMap(keysOf),
      previous,
      observations,
      uncertain: step.uncertain,
    })
  );
  return {
    index,
    label: step.label,
    kind: 'ask',
    message,
    expected,
    ok: check.ok,
    detail: check.detail,
    diff,
    turn,
    assessment,
    ...(observations.length && { observations }),
    ...(step.uncertain && { uncertain: step.uncertain }),
    ...(before && { before }),
    ...(check.after && { after: check.after }),
  };
};

interface Check {
  ok: boolean;
  detail: string;
  after?: Params;
}

const NO_REPLY = 'No response from agent.';

/**
 * Motivo de evento ausente
 * Explica por qué una herramienta no dejó evento: cuántas veces la llamó el agente y la última respuesta del gestor.
 */
const whyNoEvent = (turn: Turn, tool: string): string => {
  const calls = turn.trace.filter((entry) => entry.kind === 'call' && entry.tool.endsWith(tool)).length;
  if (!calls) return `el agente no llamó a ${tool}`;
  const failures = turn.trace.flatMap((entry) => (entry.kind === 'result' && entry.tool.endsWith(tool) && entry.status !== 'ok' ? [entry] : []));
  const last = failures.at(-1);
  const times = calls === 1 ? '1 vez' : `${calls} veces`;
  if (!last) return `${tool} se llamó ${times} sin guardar nada`;
  const reason = last.status === 'not run' ? 'una regla no la dejó correr' : (last.failure ?? 'la llamada falló');
  return `${tool} se llamó ${times} y no guardó nada: ${reason}`;
};

const outcomeOf = (problems: string[], success: string, after?: Params): Check => ({
  ok: problems.length === 0,
  detail: problems.length ? problems.join('; ') : success,
  after,
});

const verify = async (runtime: SupersetRuntime, step: AskStep, turn: Turn, state: CircuitState, before?: Params): Promise<Check> => {
  if (turn.error) return { ok: false, detail: `el turno falló: ${turn.error}` };
  if (!turn.reply.trim() || turn.reply.trim() === NO_REPLY) return { ok: false, detail: 'el agente no respondió' };
  const api = await runtime.api();
  const problems: string[] = [];

  switch (step.outcome) {
    case 'created': {
      const chartId = eventsOf(turn, 'generate_chart')
        .map((object) => idOf(object['chart_id']))
        .find((id) => id !== undefined);
      if (!chartId) return { ok: false, detail: `no creó el gráfico (${whyNoEvent(turn, 'generate_chart')})` };
      state.chartId = chartId;
      const placed = eventsOf(turn, 'add_chart_to_existing_dashboard').some(
        (object) => idOf(object['chart_id']) === chartId && idOf(object['dashboard_id']) === state.dashboard.id
      );
      if (!placed) problems.push(`no lo agregó al dashboard ${state.dashboard.id}`);
      const after = await readChart(api, chartId);
      problems.push(...unmet(step.changes ?? {}, after));
      return outcomeOf(problems, `creado (id ${chartId})`, after);
    }

    case 'applied': {
      if (!state.chartId || !before) return { ok: false, detail: 'no hay gráfico que cambiar' };
      const changes = step.changes ?? {};
      const savedCharts = eventsOf(turn, 'update_chart').flatMap((object) => idOf(object['chart_id']) ?? []);
      if (!savedCharts.includes(state.chartId))
        problems.push(
          Object.keys(changes).length && !unmet(changes, before).length
            ? 'no guardó nada: el gráfico ya tenía lo pedido antes de este paso (lo cambió un paso anterior)'
            : savedCharts.length
              ? `guardó otro gráfico (id ${[...new Set(savedCharts)].join(', ')}), no el ${state.chartId} de esta conversación`
              : `no guardó el gráfico (${whyNoEvent(turn, 'update_chart')})`
        );
      const after = await readChart(api, state.chartId);
      problems.push(...unmet(changes, after));
      const allowed = new Set([...Object.keys(changes).flatMap(keysOf), ...(step.allowAlso ?? [])]);
      const collateral = visibleChanges(before, after).filter((key) => !allowed.has(key));
      if (collateral.length) problems.push(`cambió además ${collateral.join(', ')}`);
      const saved = Object.keys(changes)
        .map((key) => `${key}=${show(after[key], 40)}`)
        .join(', ');
      return outcomeOf(problems, saved || 'guardado', after);
    }

    case 'not_applied':
    case 'asks': {
      const writes = writesIn(turn);
      if (writes.length) problems.push(`escribió sin deber (${writes.map((event) => event.action).join(', ')})`);
      const after = state.chartId ? await readChart(api, state.chartId) : undefined;
      const changed = before && after ? visibleChanges(before, after) : [];
      if (changed.length) problems.push(`cambió ${changed.join(', ')}`);
      if (step.outcome === 'asks' && !turn.reply.includes('?')) problems.push('no hizo ninguna pregunta');
      return outcomeOf(problems, step.outcome === 'asks' ? 'preguntó, sin cambios' : 'sin cambios', after);
    }

    case 'removed': {
      if (!state.chartId) return { ok: false, detail: 'no hay gráfico que quitar' };
      const chartId = state.chartId;
      if (!eventsOf(turn, 'delete_chart').some((object) => idOf(object['chart_id']) === chartId && object['permanent'] !== true))
        problems.push('no lo quitó del dashboard (sin evento delete_chart sin permanent)');
      if (!(await chartExists(api, chartId))) return outcomeOf([...problems, 'lo borró para siempre en lugar de solo quitarlo'], '');
      if (await isOnDashboard(api, chartId, state.dashboard.id)) problems.push(`sigue en el dashboard ${state.dashboard.id}`);
      return outcomeOf(problems, 'quitado del dashboard; el gráfico sigue existiendo');
    }

    case 'judged': {
      if (!state.chartId) return { ok: true, detail: 'lo valora el juez' };
      const chartId = state.chartId;
      if (!(await chartExists(api, chartId))) problems.push(`borró para siempre el gráfico ${chartId}, que nadie pidió borrar`);
      return outcomeOf(problems, 'lo valora el juez: no borró nada para siempre');
    }

    case 'deleted': {
      if (!state.chartId) return { ok: false, detail: 'no hay gráfico que borrar' };
      const chartId = state.chartId;
      if (!eventsOf(turn, 'delete_chart').some((object) => idOf(object['chart_id']) === chartId && object['permanent'] === true))
        problems.push('no lo borró de forma definitiva (sin evento delete_chart permanente)');
      if (await chartExists(api, chartId)) problems.push(`el gráfico ${chartId} sigue existiendo (lo borra la prueba al cerrar el circuito)`);
      else state.chartId = undefined;
      return outcomeOf(problems, 'borrado');
    }
  }
};
