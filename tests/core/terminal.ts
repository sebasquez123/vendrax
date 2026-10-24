import { createInterface, emitKeypressEvents, type Interface } from 'node:readline';
import kleur from 'kleur';
import { describeAssessment } from './report';
import type { Assessment, Catalog, Choice, CircuitInfo, Group, TestService, VariableCheck } from './types';

const interactive = process.stdout.isTTY === true;
const write = (text: string): void => void process.stdout.write(text);
const line = (text = ''): void => write(`${text}\n`);
const CLEAR_LINE = '\r\x1b[2K';
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export type Mark = 'ok' | 'fail' | 'info';
const MARKS: Record<Mark, string> = { ok: kleur.green('✓'), fail: kleur.red('✗'), info: kleur.dim('·') };

/**
 * Línea de tarea en curso
 * Abre una línea para una tarea en ejecución; la función devuelta la cierra con el resultado.
 */
const running = (prefix: string): ((mark: Mark, result: string) => void) => {
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 1000);
  let frame = 0;
  const timer = interactive
    ? setInterval(() => write(`${CLEAR_LINE}${prefix}${kleur.cyan(FRAMES[frame++ % FRAMES.length]!)} ${kleur.dim(`${seconds()} s`)}`), 120)
    : undefined;
  return (mark, result) => {
    if (timer) clearInterval(timer);
    if (interactive) write(CLEAR_LINE);
    line(`${prefix}${MARKS[mark]} ${result} ${kleur.dim(`(${seconds()} s)`)}`);
  };
};

/**
 * Parte del juez
 * Genera la parte del juez en la línea de un paso; amarilla si el paso falló pero cumplió.
 */
const judged = (assessment: Assessment | undefined, stepFailed: boolean): string => {
  if (!assessment) return '';
  const text = describeAssessment(assessment, stepFailed);
  const color =
    'error' in assessment
      ? kleur.dim
      : assessment.verdict === 'no cumple'
        ? kleur.red
        : assessment.verdict === 'parcial' || stepFailed
          ? kleur.yellow
          : kleur.green;
  return ` · ${color(text)}`;
};

export const terminal = {
  title: (text: string): void => line(`\n${kleur.bold(text)}`),
  note: (text: string): void => line(kleur.dim(text)),
  warn: (text: string): void => line(kleur.yellow(`! ${text}`)),
  fail: (text: string): void => line(kleur.red(`✗ ${text}`)),
  lines: (lines: string[], indent = '  '): void => lines.forEach((text) => line(`${indent}${text}`)),

  variables: (checks: VariableCheck[]): void => {
    const width = Math.max(...checks.map((check) => check.variable.length));
    for (const check of checks) {
      const name = check.variable.padEnd(width);
      if (check.state === 'set') line(`  ${MARKS.ok} ${name}`);
      else if (check.state === 'unset') line(`  ${MARKS.info} ${name}  ${kleur.dim(`sin definir (${check.note})`)}`);
      else line(`  ${MARKS.fail} ${name}  ${kleur.red(check.state === 'missing' ? 'falta' : `inválida: ${check.note}`)}`);
    }
  },

  task: (label: string): ((mark: Mark, result: string) => void) => running(`  ${label}  `),

  group: (name: string, circuits: number, repeat: number): void =>
    line(`\n${kleur.bold().cyan(`▶ ${name}`)} ${kleur.dim(`· ${circuits} circuito(s)${repeat > 1 ? ` × ${repeat} repeticiones` : ''}`)}`),

  circuit: (name: string, position: string): void => line(`\n  ${kleur.bold(name)} ${kleur.dim(position)}`),

  step: (index: number, total: number, label: string, width: number) => {
    const close = running(`    [${index}/${total}] ${label.padEnd(width)}  `);
    return (mark: Mark, result: string, assessment?: Assessment): void => close(mark, `${result}${judged(assessment, mark === 'fail')}`);
  },
};

let piped: Interface | undefined;
const pending: string[] = [];
const waiting: ((line: string) => void)[] = [];
const pipedLine = (): Promise<string> => {
  if (!piped) {
    piped = createInterface({ input: process.stdin });
    piped.on('line', (next) => (waiting.shift() ?? ((value: string) => pending.push(value)))(next));
    piped.on('close', () => waiting.splice(0).forEach((resolve) => resolve('')));
  }
  return pending.length ? Promise.resolve(pending.shift()!) : new Promise((resolve) => waiting.push(resolve));
};

/**
 * Cierre del menú
 * Permite que el proceso termine una vez finalizado el menú.
 */
export const closeMenu = (): void => {
  piped?.close();
  piped = undefined;
};

const askLine = async (question: string): Promise<string> => {
  if (!process.stdin.isTTY) {
    write(question);
    return (await pipedLine()).trim();
  }
  return new Promise((resolve) => {
    const reader = createInterface({ input: process.stdin, output: process.stdout });
    reader.question(question, (answer) => {
      reader.close();
      resolve(answer.trim());
    });
  });
};

/**
 * Selección de una tecla
 * Lee una tecla entre 'keys', con 'q' o Esc para salir.
 */
const askKey = async (keys: string[]): Promise<string> => {
  if (!process.stdin.isTTY) return (await askLine('> ')).toLowerCase();
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    const onKey = (text: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') process.exit(130);
      const pressed = key.name === 'escape' ? 'q' : (text ?? '').toLowerCase();
      if (!keys.includes(pressed) && pressed !== 'q') return;
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      write(`${pressed}\n`);
      resolve(pressed);
    };
    process.stdin.on('keypress', onKey);
  });
};

/**
 * Menú corto
 * Muestra un menú breve con una tecla por opción.
 */
const pick = async <T>(title: string, options: { label: string; value: T; hint?: string }[]): Promise<T | undefined> => {
  write(`\n${kleur.bold(title)}\n`);
  options.forEach((option, index) =>
    write(`  ${kleur.cyan(String(index + 1))}  ${option.label}${option.hint ? kleur.dim(`  ${option.hint}`) : ''}\n`)
  );
  write(`  ${kleur.cyan('q')}  salir\n`);
  const key = await askKey(options.map((_, index) => String(index + 1)));
  return key === 'q' ? undefined : options[Number(key) - 1]?.value;
};

/**
 * Selección múltiple
 * Pide una lista de números o ids separados por comas, confirmada con Enter.
 */
const pickMany = async <T>(title: string, items: T[], label: (item: T) => string, id: (item: T) => string): Promise<T[]> => {
  write(`\n${kleur.bold(title)}\n`);
  items.forEach((item, index) => write(`  ${kleur.cyan(String(index + 1).padStart(2))}  ${label(item)}\n`));
  const answer = await askLine(kleur.dim('Números o ids, separados por comas (Enter vacío = volver): '));
  return answer
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => {
      const found = /^\d+$/.test(token) ? items[Number(token) - 1] : items.find((item) => id(item) === token);
      if (!found) write(kleur.yellow(`  ! "${token}" no está en la lista; se ignora\n`));
      return found ? [found] : [];
    });
};

const countCircuits = (groups: Group[]): number => groups.reduce((sum, group) => sum + group.circuits.length, 0);

/**
 * Elección interactiva
 * Guía la elección en orden: servicio, catálogo, qué ejecutar y repeticiones.
 */
export const chooseInteractively = async (services: TestService[]): Promise<Choice> => {
  const service = await pick(
    'Servicio',
    services.map((option) => ({ label: option.label, value: option }))
  );
  if (!service) return { kind: 'quit' };

  const catalog: Catalog | undefined =
    service.catalogs.length === 1
      ? service.catalogs[0]
      : await pick(
          `${service.label} · catálogo`,
          service.catalogs.map((option) => ({ label: option.label, value: option, hint: `${countCircuits(option.groups)} circuitos` }))
        );
  if (!catalog) return { kind: 'quit' };

  for (;;) {
    const action = await pick(`${service.label} · ${catalog.label} · qué correr`, [
      { label: 'Todo', value: 'all' as const, hint: `${countCircuits(catalog.groups)} circuitos` },
      { label: 'Elegir grupos', value: 'groups' as const },
      { label: 'Elegir circuitos', value: 'circuits' as const },
      { label: 'Listar, sin correr nada', value: 'list' as const },
    ]);
    if (!action) return { kind: 'quit' };
    if (action === 'list') return { kind: 'list', service, catalog };

    let groups: Group[] = catalog.groups;
    let circuitIds: string[] = [];
    if (action === 'groups') {
      groups = await pickMany(
        'Grupos',
        catalog.groups,
        (group) => `${group.name} ${kleur.dim(`(${group.circuits.length} circuitos)`)}`,
        (group) => group.name
      );
      if (!groups.length) continue;
    }
    if (action === 'circuits') {
      const note = (circuit: CircuitInfo) => service.describeCircuit?.(circuit);
      const chosen = await pickMany(
        'Circuitos',
        catalog.groups.flatMap((group) => group.circuits),
        (circuit) => `${circuit.id.padEnd(14)} ${circuit.name}${note(circuit) ? kleur.dim(` · ${note(circuit)}`) : ''}`,
        (circuit) => circuit.id
      );
      if (!chosen.length) continue;
      groups = catalog.groups
        .map((group) => ({ ...group, circuits: group.circuits.filter((circuit) => chosen.includes(circuit)) }))
        .filter((group) => group.circuits.length);
      circuitIds = chosen.map((circuit) => circuit.id);
    }
    const times = Number((await askLine(kleur.dim('Repeticiones (Enter = 1): '))) || '1');
    return { kind: 'run', service, catalog, groups, circuitIds, repeat: Number.isInteger(times) && times > 0 ? times : 1 };
  }
};
