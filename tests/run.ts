import './core/config';
import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';
import { running, runService, Shown } from './core/runner';
import { chooseInteractively, closeMenu, terminal } from './core/terminal';
import type { Catalog, Choice, Group, TestService } from './core/types';
import { PAY_SERVICE } from './PAY/service';
import { SUPERSET_SERVICE } from './SUPERSET/service';

const SERVICES: TestService[] = [SUPERSET_SERVICE, PAY_SERVICE];

const USAGE = 'Uso: npm run test:agent [-- --service <SUPERSET|PAY> [--catalog <id>] [grupo …] [--circuit <id>[,<id>…]] [--repeat <n>] [--list]]';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Elección por argumentos
 * Convierte los argumentos escritos en la elección, para ejecuciones sin menú.
 */
const chooseFromArgs = (args: string[]): Choice => {
  let serviceId: string | undefined;
  let catalogId: string | undefined;
  const groupNames: string[] = [];
  const circuitIds: string[] = [];
  let repeat = 1;
  let list = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '--service' || arg === '-s') serviceId = args[++index]?.toUpperCase();
    else if (arg === '--catalog') catalogId = args[++index];
    else if (arg === '--productive') catalogId = 'productive';
    else if (arg === '--list') list = true;
    else if (arg === '--circuit' || arg === '-c')
      circuitIds.push(
        ...(args[++index] ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      );
    else if (arg === '--repeat' || arg === '-r') repeat = Number(args[++index]);
    else if (arg.startsWith('-')) throw new Error(`opción desconocida: ${arg}. ${USAGE}`);
    else groupNames.push(arg);
  }
  const service = SERVICES.find((candidate) => candidate.id === serviceId);
  if (!service)
    throw new Error(`servicio ${serviceId ? `desconocido: ${serviceId}` : 'sin elegir'} (hay: ${SERVICES.map((s) => s.id).join(', ')}). ${USAGE}`);
  const catalog = catalogId ? service.catalogs.find((candidate) => candidate.id === catalogId) : service.catalogs[0];
  if (!catalog) throw new Error(`catálogo desconocido: ${catalogId} (hay: ${service.catalogs.map((c) => c.id).join(', ')})`);
  if (list) return { kind: 'list', service, catalog };
  if (!Number.isInteger(repeat) || repeat < 1) throw new Error('--repeat necesita un número entero desde 1');

  const ids = catalog.groups.flatMap((group) => group.circuits.map((circuit) => circuit.id));
  const unknownGroups = groupNames.filter((name) => !catalog.groups.some((group) => group.name === name));
  if (unknownGroups.length) throw new Error(`grupo desconocido: ${unknownGroups.join(', ')} (hay: ${catalog.groups.map((g) => g.name).join(', ')})`);
  const unknownCircuits = circuitIds.filter((id) => !ids.includes(id));
  if (unknownCircuits.length) throw new Error(`circuito desconocido: ${unknownCircuits.join(', ')} (hay: ${ids.join(', ')})`);
  const groups: Group[] = catalog.groups
    .filter((group) => !groupNames.length || groupNames.includes(group.name))
    .map((group) => ({ ...group, circuits: group.circuits.filter((circuit) => !circuitIds.length || circuitIds.includes(circuit.id)) }))
    .filter((group) => group.circuits.length);
  if (!groups.length) throw new Error('ninguno de esos circuitos está en los grupos pedidos');
  return { kind: 'run', service, catalog, groups, circuitIds, repeat };
};

const showList = (service: TestService, catalog: Catalog): void => {
  terminal.title(`${service.label} · ${catalog.label}`);
  const notes = service.listNotes?.(catalog.groups) ?? [];
  if (notes.length) terminal.lines(notes, '  ! ');
  for (const group of catalog.groups) {
    terminal.title(group.name);
    const width = Math.max(...group.circuits.map((circuit) => circuit.id.length));
    terminal.lines(
      group.circuits.map((circuit) => {
        const note = service.describeCircuit?.(circuit);
        return `${circuit.id.padEnd(width)}  ${circuit.name} (${circuit.steps.length} pasos)${note ? ` · ${note}` : ''}`;
      })
    );
  }
};

const main = async (): Promise<number> => {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    terminal.note(USAGE);
    return 0;
  }
  if (!args.length && !process.stdin.isTTY) {
    terminal.fail(`Sin terminal interactiva para el menú: elige con argumentos. ${USAGE}`);
    return 1;
  }
  const choice = args.length ? chooseFromArgs(args) : await chooseInteractively(SERVICES).finally(closeMenu);
  if (choice.kind === 'quit') return 0;
  if (choice.kind === 'list') {
    showList(choice.service, choice.catalog);
    return 0;
  }
  return runService(choice);
};

const TRACES_WAIT_MS = 15_000;

/**
 * Salida diferida
 * Sale tras enviar las trazas a LangSmith y vaciar la terminal, para no perder la ruta del reporte.
 */
const exit = async (code: number): Promise<void> => {
  await Promise.race([awaitAllCallbacks(), new Promise((resolve) => setTimeout(resolve, TRACES_WAIT_MS))]);
  process.stdout.write('', () => process.exit(code));
};

process.once('SIGINT', () => {
  terminal.warn('Interrumpido: limpiando lo que dejó la corrida…');
  const cleanup = running.session ? running.session.close() : Promise.resolve([]);
  void cleanup
    .catch(() => [])
    .then(() => running.runtime?.close())
    .catch(() => undefined)
    .finally(() => void exit(130));
});

main()
  .then(exit)
  .catch((error: unknown) => {
    if (!(error instanceof Shown)) terminal.fail(messageOf(error));
    return exit(1);
  });
