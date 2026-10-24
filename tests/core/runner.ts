import { MODEL_VARIABLE, readHandshake, TEST_MODEL, TEST_PROVIDER_KEY } from './config';
import { Judge } from './judge';
import { describeCleanup, describeReliability, measureReliability, writeReports } from './report';
import { SocketRefusal, startRuntime } from './runtime';
import { terminal } from './terminal';
import type { CircuitRecord, GroupRecord, Runtime, Selection, ServiceSession } from './types';

/**
 * Corrida de pruebas
 * En orden: ajustes, conexión, preparación, circuitos, limpieza y reportes; sale con 0 si pasan todos los chequeos estrictos.
 */

/**
 * Error ya mostrado
 * Error que ya se mostró en la terminal: la corrida solo tiene que terminar.
 */
export class Shown extends Error {}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Tarea en su línea
 * Ejecuta 'work' en su propia línea; si falla, la línea indica el motivo y la ejecución termina.
 */
const task = async <T>(label: string, work: () => Promise<T>, done: (value: T) => string): Promise<T> => {
  const close = terminal.task(label);
  try {
    const value = await work();
    close('ok', done(value));
    return value;
  } catch (error) {
    close('fail', error instanceof SocketRefusal ? `el socket recibió mcp/Agent/error: ${error.message}` : messageOf(error));
    throw new Shown();
  }
};

export const running: { runtime?: Runtime; session?: ServiceSession } = {};

export const runService = async ({ service, catalog, groups, circuitIds, repeat }: Selection): Promise<number> => {
  terminal.title(`Pruebas del agente · ${service.label} · ${catalog.label}`);

  /**- 1. AJUSTES: modelo obligatorio y handshake tal cual */
  if (!TEST_MODEL) {
    terminal.fail(`Falta ${MODEL_VARIABLE} en el .env: el modelo del agente y del juez.`);
    return 1;
  }
  if (!process.env[TEST_PROVIDER_KEY]?.trim()) {
    terminal.fail(`Falta ${TEST_PROVIDER_KEY} en el .env: lo necesita el modelo ${TEST_MODEL}.`);
    return 1;
  }
  const handshake = readHandshake();
  terminal.lines([
    `Handshake: ${handshake.sent.join(', ') || 'ningún campo'}${handshake.missing.length ? ` · sin enviar: ${handshake.missing.join(', ')}` : ''}`,
  ]);
  const judge = new Judge(service.about);
  terminal.note(`  Modelo del agente y del juez: ${judge.modelName}`);

  /**- 2. CONEXIÓN: como cliente */
  const runtime = await task(
    'Conexión establecida',
    () => startRuntime(handshake.auth),
    (started) => `aceptada (modos: ${JSON.stringify((started.accepted['modes'] as { id?: string }[] | undefined)?.map((mode) => mode.id) ?? [])})`
  );
  running.runtime = runtime;
  try {
    /**- 3. PREPARACIÓN: del servicio */
    const session = await task(
      `Preparación de ${service.label}`,
      () => service.open(runtime, groups, catalog),
      (opened) => opened.target
    );
    running.session = session;

    /**- 4. CIRCUITOS: cada uno una conversación nueva */
    const records: { name: string; circuits: CircuitRecord[] }[] = [];
    for (const group of groups) {
      terminal.group(group.name, group.circuits.length, repeat);
      const circuits: CircuitRecord[] = [];
      for (let repetition = 1; repetition <= repeat; repetition++)
        for (const [index, circuit] of group.circuits.entries()) {
          terminal.circuit(
            circuit.name,
            `(${circuit.id} · ${index + 1}/${group.circuits.length}${repeat > 1 ? ` · repetición ${repetition}/${repeat}` : ''})`
          );
          circuits.push(await session.runCircuit(circuit, repetition, judge));
        }
      records.push({ name: group.name, circuits });
    }

    /**- 5. CIERRE: limpieza, fiabilidad, resumen del juez y reportes */
    const leftover = await session.close().catch(() => [-1]);
    running.session = undefined;
    const results: GroupRecord[] = records.map((record) => ({ ...record, reliability: measureReliability(record.circuits) }));
    const everything = results.flatMap((result) => result.circuits);
    const reliability = measureReliability(everything);

    terminal.title('Resultado');
    for (const result of results) {
      terminal.lines([result.name]);
      terminal.lines(describeReliability(result.reliability), '    ');
    }
    if (results.length > 1) {
      terminal.lines(['Total']);
      terminal.lines(describeReliability(reliability), '    ');
    }
    terminal.lines([describeCleanup(leftover)]);

    const summary = await task(
      'Resumen del juez',
      () =>
        judge.summarize({
          confiabilidad: describeReliability(reliability),
          pasos: results.flatMap((result) =>
            result.circuits.flatMap((circuit) =>
              circuit.steps
                .filter((step) => step.kind === 'ask')
                .map((step) => ({
                  grupo: result.name,
                  circuito: `${circuit.id} · ${circuit.name} (repetición ${circuit.repetition})`,
                  paso: `${step.index} · ${step.label}`,
                  mensaje: step.message,
                  verificado: step.ok,
                  detalle: step.detail,
                  valoracion: step.assessment,
                }))
            )
          ),
        }),
      () => 'listo'
    );
    terminal.lines(summary.split('\n'), '    ');

    const run = {
      date: new Date().toISOString(),
      service: service.label,
      catalog: catalog.label,
      target: session.target,
      model: judge.modelName,
      repeat,
      ...(circuitIds.length && { circuitIds }),
      reliability,
      summary,
      leftover,
      audit: session.audit ?? [],
      whereToLook: [] as string[],
      groups: results,
    };
    run.whereToLook = service.whereToLook(run);
    terminal.lines([`Reporte: ${writeReports(service.reportsDir, run)} (y uno por circuito, con su id)`, '']);
    return everything.some((circuit) => circuit.steps.some((step) => !step.ok && !step.uncertain)) ? 1 : 0;
  } finally {
    await runtime.close().catch(() => undefined);
    running.runtime = undefined;
  }
};
