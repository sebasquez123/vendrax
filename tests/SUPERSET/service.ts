import { readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { TOOL_PREFIX } from '~/knowledge/SUPERSET/00_server/00_server';
import { terminal } from '../core/terminal';
import type { Catalog, Group, RunRecord, TestService } from '../core/types';
import { GROUPS } from './circuits/no-productive';
import { PRODUCTIVE_GROUPS } from './circuits/productive';
import { BASE_CHARTS, type BaseChartKind, baseChartName } from './fixtures';
import { auditGroups } from './harness/audit';
import { type Circuit, cleanupScope, type RunLedger, runCircuit } from './harness/circuit';
import { checkSandbox, findBaseCharts, readSettings } from './harness/preflight';
import { type SupersetRuntime, supersetRuntime } from './harness/runtime';
import { type ChartSnapshot, removeCharts, restoreChart } from './harness/superset';

const CATALOGS: Catalog[] = [
  { id: 'circuits', label: 'Circuitos', groups: GROUPS },
  { id: 'productive', label: 'Pruebas productivas', groups: PRODUCTIVE_GROUPS },
];

const TOOLS_ROOT = join(__dirname, '..', '..', 'src', 'modules', 'tools', 'infrastructure', 'tools', 'superset');

/**
 * Carpetas de herramientas Superset
 * Carpeta de cada herramienta Superset (la que contiene su tool.ts), por nombre corto, relativa a la carpeta de trabajo.
 */
const toolFolders = (): Map<string, string> => {
  const files = readdirSync(TOOLS_ROOT, { recursive: true }).map(String);
  const folders = files.filter((file) => basename(file) === 'tool.ts').map((file) => dirname(file));
  return new Map(folders.map((folder) => [basename(folder), relative(process.cwd(), join(TOOLS_ROOT, folder)).split('\\').join('/')]));
};

/**
 * Limpieza de la corrida
 * Borra lo creado en la corrida, restaura los gráficos base cambiados y devuelve los ids que no pudo.
 */
const cleanUp = async (runtime: SupersetRuntime, ledger: RunLedger): Promise<number[]> => {
  const api = await runtime.api();
  const { left } = await removeCharts(api, [...ledger.created], cleanupScope(runtime, ledger));
  const notRestored: number[] = [];
  for (const snapshot of [...ledger.borrowed.values()] as ChartSnapshot[])
    await restoreChart(api, snapshot)
      .then(() => ledger.borrowed.delete(snapshot.chartId))
      .catch(() => notRestored.push(snapshot.chartId));
  if (left.length || notRestored.length)
    terminal.warn(
      `Quedaron sin limpiar: ${[...left.map((id) => `${id} (bórralo en el sandbox)`), ...notRestored.map((id) => `${id} (gráfico base: restáuralo)`)].join(', ')}`
    );
  return [...left, ...notRestored];
};

export const SUPERSET_SERVICE: TestService = {
  id: 'SUPERSET',
  label: 'SUPERSET · gestor de paneles',
  about:
    'el asistente crea, cambia y borra gráficos en un gestor de paneles (Superset) a pedido de usuarios de negocio; las opciones que un cambio toca y sus valores por defecto vienen en "opciones".',
  catalogs: CATALOGS,
  reportsDir: join(__dirname, 'reports'),

  describeCircuit: (circuit) => {
    const base = (circuit as Circuit).base;
    return base ? `requiere ${baseChartName(base)} del desarrollador` : undefined;
  },

  listNotes: (groups: Group[]) =>
    auditGroups(groups as Group<Circuit>[]).map(
      (finding) => `sin respaldo, no cuenta como falla: ${finding.circuit} › ${finding.step}: ${finding.detail}`
    ),

  open: async (runtime, groups) => {
    /**- 1. AJUSTES: sandbox y dashboard base opcional */
    const { variables, settings } = readSettings();
    terminal.variables(variables);
    if (!settings) throw new Error('Faltan ajustes de SUPERSET en el .env (docs/SUPERSET/SUPERSET_AGENT_TESTS.md).');

    /**- 2. GESTOR DE DASHBOARDS: conexión, sandbox y fixtures */
    const superset = await supersetRuntime(runtime, settings);
    const circuits = groups as Group<Circuit>[];
    const audit = auditGroups(circuits);
    if (audit.length) terminal.warn(`${audit.length} expectativa(s) sin respaldo en el guard o en el MCP: se reportan, no cuentan como falla`);
    const sandbox = await checkSandbox(
      superset,
      circuits.flatMap((group) => group.circuits)
    );

    /**- 3. GRÁFICOS BASE: solo los que piden los circuitos */
    const ledger: RunLedger = { created: new Set(), borrowed: new Map(), bases: { charts: {} } };
    const kinds = [
      ...new Set(circuits.flatMap((group) => group.circuits.flatMap((circuit) => (circuit.base ? [circuit.base] : [])))),
    ] as BaseChartKind[];
    if (kinds.length) {
      ledger.bases = await findBaseCharts(superset, sandbox, kinds);
      terminal.lines(
        kinds.map((kind) => {
          const found = ledger.bases.charts[kind];
          return `${BASE_CHARTS[kind].name}: ${found && 'chartId' in found ? `id ${found.chartId}` : 'falta (se omite su circuito)'}`;
        }),
        '    '
      );
    }

    return {
      target: `sandbox "${superset.dashboard.title}" (id ${superset.dashboard.id}) · ${[...sandbox.datasetIds.keys()].join(', ')}`,
      audit,
      runCircuit: (circuit, repetition, judge) => runCircuit(superset, circuit as Circuit, repetition, judge, ledger),
      close: async () => cleanUp(superset, ledger),
    };
  },

  whereToLook: (run: RunRecord) => {
    const turns = run.groups.flatMap((group) => group.circuits.flatMap((circuit) => circuit.steps.flatMap((step) => (step.turn ? [step.turn] : []))));
    const modes = [...new Set(turns.flatMap((turn) => (turn.context.mode ? [turn.context.mode] : [])))];
    const used = [
      ...new Set(turns.flatMap((turn) => turn.trace.flatMap((entry) => (entry.kind === 'call' ? [entry.tool.replace(TOOL_PREFIX, '')] : [])))),
    ];
    const folders = toolFolders();
    const code = (path: string) => '`' + path + '`';
    return [
      `**Cómo decide el agente:** lo común en ${code('src/knowledge/SUPERSET/general/')} (01_playbook, 02_reply_shapes, 08_tool_policy…) y lo de cada modo en ${modes.map((mode) => code(`src/knowledge/SUPERSET/general/${mode}/`)).join(', ')}.`,
      `**Llamadas "no ejecutada" (NOT EXECUTED):** la política del turno (08_tool_policy del dominio y del modo) y ${code('src/modules/context/infrastructure/middlewares/policy/policy.middleware.ts')}.`,
      `**Cambios rechazados al guardar (NOT UPDATED):** qué se puede cambiar y cómo, en ${code('src/modules/tools/infrastructure/tools/superset/update/guards/')} (editable_controls.ts, form_data.guard.ts).`,
      ...(used.length ? [`**Herramientas usadas:** ${used.map((tool) => `${code(tool)} → ${code(folders.get(tool) ?? '?')}`).join(' · ')}`] : []),
      `**La prueba:** expectativas en ${code('tests/SUPERSET/circuits/')}; el juez en ${code('tests/core/judge.ts')}. Antes de corregir al agente por un paso fallido, confirma la capacidad en el guard o en el MCP.`,
    ];
  },
};
