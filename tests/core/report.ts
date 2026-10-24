import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Assessment, CircuitRecord, CircuitReport, Reliability, RunRecord, StepRecord, TraceEntry } from './types';

/**
 * Confiabilidad y reportes
 * Cada corrida escribe en reports/ un reporte por circuito y su resumen (.md y .json), nunca el handshake ni tokens.
 */

/**
 * Valor en una línea
 * Muestra un valor en una sola línea, recortado a 'max' caracteres.
 */
export const show = (value: unknown, max = 80): string => {
  const text = value === undefined ? '(sin valor)' : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/**
 * Recorte por el medio
 * Recorta un texto largo por el medio, conservando su inicio y su final.
 */
export const clipMiddle = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const head = Math.ceil(max * 0.6);
  const tail = max - head;
  return `${text.slice(0, head)} […${text.length - max} caracteres…] ${text.slice(-tail)}`;
};

export const TRACE_LIMITS = { args: 300, result: 600 } as const;

const STATUS_LABEL: Record<Extract<TraceEntry, { kind: 'result' }>['status'], string> = {
  ok: 'ok',
  error: 'error',
  'not run': 'no ejecutada',
};

/**
 * Texto compacto recortado
 * Deja un texto en una línea y lo recorta por el medio a 'max' caracteres.
 */
const clip = (text: string, max: number): string => clipMiddle(text.replace(/\s+/g, ' ').trim(), max);

/**
 * Descripción de la traza
 * Describe las llamadas y resultados del turno, una línea cada uno y en orden.
 */
export const describeTrace = (trace: TraceEntry[], limits: { args: number; result: number } = TRACE_LIMITS): string[] =>
  trace.map((entry) =>
    entry.kind === 'call'
      ? `→ ${entry.tool} ${show(entry.args, limits.args)}`
      : entry.failure
        ? `← ${entry.tool} (${STATUS_LABEL[entry.status]}): ${entry.failure}`
        : `← ${entry.tool} (${STATUS_LABEL[entry.status]}): ${clip(entry.content, limits.result)}`
  );

const percent = (part: number, whole: number): number => (whole ? Math.round((part * 100) / whole) : 0);

export const measureReliability = (circuits: CircuitRecord[]): Reliability => {
  const asks = circuits.flatMap((circuit) => circuit.steps.filter((step) => step.kind === 'ask' && !step.uncertain));
  const scores = asks.flatMap((step) => (step.assessment && 'score' in step.assessment ? [step.assessment.score] : []));
  const resultsByStep = new Map<string, boolean[]>();
  for (const circuit of circuits)
    for (const step of circuit.steps.filter((candidate) => candidate.kind === 'ask' && !candidate.uncertain)) {
      const key = `${circuit.id}#${step.index}`;
      resultsByStep.set(key, [...(resultsByStep.get(key) ?? []), step.ok]);
    }
  const repeated = [...resultsByStep.values()].filter((results) => results.length > 1);
  return {
    verified: asks.filter((step) => step.ok).length,
    asked: asks.length,
    judged: scores.length,
    skipped: circuits.filter((circuit) => circuit.skipped).length,
    ...(scores.length && { judgeAverage: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) }),
    ...(repeated.length && { stable: repeated.filter((results) => results.every((ok) => ok === results[0])).length, compared: repeated.length }),
  };
};

export const describeReliability = (reliability: Reliability): string[] => [
  `Pasos verificados: ${reliability.verified}/${reliability.asked} (${percent(reliability.verified, reliability.asked)} %)`,
  `Juez: ${reliability.judgeAverage ?? '-'} % de promedio (${reliability.judged} pasos valorados)`,
  ...(reliability.compared
    ? [
        `Estabilidad: ${reliability.stable}/${reliability.compared} pasos con el mismo resultado en todas las repeticiones (${percent(reliability.stable ?? 0, reliability.compared)} %)`,
      ]
    : []),
  ...(reliability.skipped ? [`Circuitos omitidos: ${reliability.skipped} (falta un gráfico base del desarrollador; ver "Pasos a revisar")`] : []),
];

/**
 * Descripción del veredicto
 * Muestra puntaje y veredicto del juez, con su razón si no es 'cumple' o el paso falló.
 */
export const describeAssessment = (assessment?: Assessment, stepFailed = false): string => {
  if (!assessment) return '';
  if ('error' in assessment) return `juez no disponible (${assessment.error.slice(0, 80)})`;
  const withReason = stepFailed || assessment.verdict !== 'cumple';
  return `juez: ${assessment.verdict}${withReason ? `: ${assessment.reason}` : ''} ${assessment.score} % `;
};

export const describeCleanup = (leftover: number[]): string =>
  leftover.length
    ? `Limpieza: quedaron sin limpiar ${leftover.join(', ')} (el servicio dice qué hacer con cada uno en la terminal).`
    : 'Limpieza: no quedó nada de esta corrida por limpiar.';

export const RUN_REPORT = '_current_run';

/**
 * Escritura de reportes
 * Escribe el .md/.json de cada circuito y _current_run.md/.json, y devuelve la ruta del resumen.
 */
export const writeReports = (dir: string, run: RunRecord): string => {
  mkdirSync(dir, { recursive: true });
  const circuits = run.groups.flatMap((group) => group.circuits);
  for (const id of [...new Set(circuits.map((circuit) => circuit.id))]) {
    const records = circuits.filter((circuit) => circuit.id === id);
    const report: CircuitReport = {
      date: run.date,
      model: run.model,
      target: run.target,
      reliability: measureReliability(records),
      audit: run.audit.filter((finding) => finding.circuit === id),
      repetitions: records,
    };
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(report, null, 2));
    writeFileSync(join(dir, `${id}.md`), renderCircuit(report));
  }
  const summary = {
    ...run,
    groups: run.groups.map(({ name, reliability, circuits: records }) => ({
      name,
      reliability,
      circuits: records.map(({ id, name: title, repetition, skipped }) => ({ id, name: title, repetition, ...(skipped && { skipped }) })),
    })),
  };
  writeFileSync(join(dir, `${RUN_REPORT}.json`), JSON.stringify(summary, null, 2));
  writeFileSync(join(dir, `${RUN_REPORT}.md`), renderRun(run));
  return relative(process.cwd(), join(dir, `${RUN_REPORT}.md`));
};

const quote = (text: string): string =>
  text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

/**
 * Paso por revisar
 * Indica si un paso necesita revisión: falló, el juez no lo dio por cumplido o dejó observaciones.
 */
const toReview = (step: StepRecord): boolean =>
  !step.ok || !!step.observations?.length || (!!step.assessment && ('error' in step.assessment || step.assessment.verdict !== 'cumple'));

const markOf = (step: StepRecord): string => (step.uncertain ? '≈' : step.kind !== 'ask' ? '·' : step.ok ? '✓' : '✗');

/**
 * Celda del juez
 * Resume al juez en pocas palabras para una celda de tabla.
 */
const judgeCell = (assessment?: Assessment): string =>
  !assessment ? '' : 'error' in assessment ? 'no disponible' : `${assessment.score} % ${assessment.verdict}`;

const cell = (text: string, max: number): string => clip(text, max).replace(/\|/g, '\\|');

/**
 * Traza corta
 * Resume las llamadas de herramientas del turno: qué se llamó y cómo respondió; el detalle está en el .json.
 */
const shortTrace = (trace: TraceEntry[]): string[] => describeTrace(trace, { args: 160, result: 160 });

/**
 * Paso por revisar completo
 * Muestra un paso por revisar de forma completa pero breve.
 */
const renderReviewedStep = (step: StepRecord): string[] => {
  const lines = [`#### [${step.index}] ${step.label} — ${markOf(step)} ${step.detail}`, ''];
  if (step.message) lines.push(`- **Usuario:** ${step.message}`);
  if (step.expected) lines.push(`- **Esperado (hipótesis de la prueba):** ${step.expected}`);
  if (step.uncertain) lines.push(`- **Sin respaldo, no cuenta:** ${step.uncertain}`);
  if (step.observations?.length) lines.push(`- **Observaciones (no son falla):** ${step.observations.join('; ')}`);
  const assessment = step.assessment;
  if (assessment && 'score' in assessment)
    lines.push(
      `- **Juez:** ${assessment.score} % ${assessment.verdict}: ${assessment.reason}${assessment.improvement ? ` Mejora: ${assessment.improvement}` : ''}`
    );
  if (step.turn) {
    const trace = shortTrace(step.turn.trace);
    lines.push(`- **Herramientas:**${trace.length ? '' : ' ninguna'}`, ...trace.map((line, index) => `  ${index + 1}. ${line}`));
    if (step.diff.length) lines.push(`- **Guardado:** ${step.diff.map((line) => `\`${line}\``).join(' · ')}`);
    lines.push('- **Respuesta:**', '', quote(step.turn.reply || '(vacía)'));
  }
  return [...lines, ''];
};

const renderRepetition = (record: CircuitRecord, many: boolean): string[] => {
  const reviewed = record.steps.filter(toReview);
  return [
    ...(many ? [`## Repetición ${record.repetition}`, ''] : []),
    ...(record.skipped ? [`**Omitido:** ${record.skipped}.`, ''] : []),
    '| # | Paso | Resultado | Juez |',
    '| --- | --- | --- | --- |',
    ...record.steps.map(
      (step) =>
        `| ${step.index} | ${cell(step.label, 30)} | ${markOf(step)} ${cell(step.detail, 140)}${step.kind === 'prepare' ? ' _(la prueba lo preparó)_' : step.kind === 'break' ? ' _(la prueba lo dañó)_' : ''} | ${judgeCell(step.assessment)} |`
    ),
    '',
    ...(reviewed.length ? [`### A revisar`, '', ...reviewed.flatMap(renderReviewedStep)] : []),
    ...(record.cleanup?.removed.length ? [`Limpieza: la prueba borró el gráfico ${record.cleanup.removed.join(', ')}, que quedó del circuito.`] : []),
    ...(record.cleanup?.left.length ? [`Limpieza: **no se pudo borrar** el gráfico ${record.cleanup.left.join(', ')}.`] : []),
    ...(record.restored === true ? ['Limpieza: el gráfico base quedó como estaba.'] : []),
    ...(record.restored === false ? ['Limpieza: **no se pudo restaurar** el gráfico base; revísalo en Superset.'] : []),
    '',
  ];
};

const renderCircuit = (report: CircuitReport): string => {
  const first = report.repetitions[0]!;
  return [
    `# ${first.id} · ${first.name}`,
    '',
    `${report.date} · ${report.model} · ${report.target}`,
    '',
    ...describeReliability(report.reliability).map((line) => `- ${line}`),
    ...report.audit.map((finding) => `- Sin respaldo (${finding.step}): ${finding.detail}`),
    '',
    ...report.repetitions.flatMap((record) => renderRepetition(record, report.repetitions.length > 1)),
    `Detalle completo de cada turno (argumentos y resultados de cada herramienta, configuración antes y después): \`${first.id}.json\`.`,
    '',
  ].join('\n');
};

/**
 * Pasos por revisar
 * Lista en una línea cada paso fallido, no cumplido del todo según el juez o con observaciones.
 */
const renderToReview = (run: RunRecord): string[] => {
  const items = run.groups.flatMap((group) =>
    group.circuits.flatMap((circuit) => [
      ...(circuit.skipped ? [`- \`${circuit.id}\` **omitido:** ${circuit.skipped}`] : []),
      ...(circuit.restored === false ? [`- \`${circuit.id}\` **no se pudo restaurar su gráfico base**; revísalo en Superset`] : []),
      ...circuit.steps.filter(toReview).map((step) => {
        const judged = step.assessment ? ` · ${describeAssessment(step.assessment, !step.ok)}` : '';
        const observed = step.observations?.length ? ` · observaciones: ${step.observations.join('; ')}` : '';
        const repetition = run.repeat > 1 ? ` (repetición ${circuit.repetition})` : '';
        return `- \`${circuit.id}\`${repetition} [${step.index}] ${step.label}: ${markOf(step)} ${clip(step.detail, 220)}${observed}${judged}`;
      }),
    ])
  );
  return ['## Pasos a revisar', '', ...(items.length ? items : ['Ninguno: todos los pasos se verificaron y el juez los dio por cumplidos.']), ''];
};

const renderRun = (run: RunRecord): string => {
  const ids = [...new Set(run.groups.flatMap((group) => group.circuits.map((circuit) => circuit.id)))];
  return [
    `# Última corrida · ${run.service} · ${run.catalog} · ${run.groups.map((group) => group.name).join(', ')}`,
    '',
    `${run.date} · ${run.model} · ${run.target} · repeticiones: ${run.repeat}`,
    '',
    ...renderToReview(run),
    '## Confiabilidad',
    '',
    ...describeReliability(run.reliability).map((line) => `- ${line}`),
    `- ${describeCleanup(run.leftover)}`,
    '',
    ...(run.audit.length
      ? [
          '## Expectativas sin respaldo',
          '',
          'No tienen respaldo en la fuente de verdad del servicio: se reportan como observaciones y no cuentan en la confiabilidad.',
          '',
          ...run.audit.map((finding) => `- \`${finding.circuit}\` › ${finding.step}: ${finding.detail}`),
          '',
        ]
      : []),
    '## Resumen del juez',
    '',
    run.summary,
    '',
    '## Reportes por circuito',
    '',
    ids.map((id) => `[${id}](${id}.md)`).join(' · '),
    '',
    ...(run.whereToLook.length ? ['## Dónde mirar', '', ...run.whereToLook.map((line) => `- ${line}`), ''] : []),
  ].join('\n');
};
