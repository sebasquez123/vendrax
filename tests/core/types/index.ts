import type { INestApplicationContext } from '@nestjs/common';
import type { InterfaceEvent } from '~/modules/context/domain/client_state';
import type { SocketContext } from '~/shared/context/types/context.types';
import type { Judge } from '../judge';
import type { Conversation } from '../runtime';

export interface VariableCheck {
  variable: string;
  state: 'set' | 'missing' | 'invalid' | 'unset';
  note?: string;
}

export interface SocketEvent {
  event: string;
  payload: Record<string, unknown>;
}

export interface Runtime {
  app: INestApplicationContext;
  context: SocketContext;
  accepted: Record<string, unknown>;
  conversation(options: ConversationOptions): Conversation;
  close(): Promise<void>;
}

export interface ConversationOptions {
  mode?: string;
  stateContext?: (events: InterfaceEvent[]) => Record<string, unknown>;
  target?: string;
}

export type TraceEntry =
  | { kind: 'call'; tool: string; args: unknown }
  | { kind: 'result'; tool: string; status: 'ok' | 'error' | 'not run'; content: string; failure?: string };

export interface Turn {
  message: string;
  context: { mode?: string; historyMessages: number; events: number; target?: string };
  reply: string;
  trace: TraceEntry[];
  events: { action: string; object: Record<string, unknown> }[];
  seconds: number;
  error?: string;
}

export type Verdict = 'cumple' | 'parcial' | 'no cumple';

export type Assessment = { score: number; verdict: Verdict; reason: string; improvement?: string } | { error: string };

export interface StepEvidence {
  historial: string[];
  mensaje_usuario: string;
  esperado: string;
  respuesta_asistente: string;
  recorrido_del_turno: string[];
  eventos: string[];
  verificacion: { cumple: boolean; detalle: string; observaciones?: string[]; sin_respaldo?: string };
  opciones?: string[];
}

export interface StepRecord {
  index: number;
  label: string;
  kind: 'ask' | 'break' | 'prepare';
  message?: string;
  expected?: string;
  ok: boolean;
  detail: string;
  diff: string[];
  observations?: string[];
  uncertain?: string;
  turn?: Turn;
  assessment?: Assessment;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface CircuitRecord {
  id: string;
  name: string;
  repetition: number;
  steps: StepRecord[];
  cleanup?: { removed: number[]; left: number[] };
  restored?: boolean;
  skipped?: string;
}

export interface Reliability {
  verified: number;
  asked: number;
  judgeAverage?: number;
  judged: number;
  stable?: number;
  compared?: number;
  skipped: number;
}

export interface GroupRecord {
  name: string;
  reliability: Reliability;
  circuits: CircuitRecord[];
}

export interface AuditFinding {
  circuit: string;
  step: string;
  detail: string;
}

export interface RunRecord {
  date: string;
  service: string;
  catalog: string;
  target: string;
  model: string;
  repeat: number;
  circuitIds?: string[];
  reliability: Reliability;
  summary: string;
  leftover: number[];
  audit: AuditFinding[];
  whereToLook: string[];
  groups: GroupRecord[];
}

export interface CircuitReport {
  date: string;
  model: string;
  target: string;
  reliability: Reliability;
  audit: AuditFinding[];
  repetitions: CircuitRecord[];
}

export interface CircuitInfo {
  id: string;
  name: string;
  steps: readonly unknown[];
}

export interface Group<C extends CircuitInfo = CircuitInfo> {
  name: string;
  circuits: C[];
}

export interface Catalog {
  id: string;
  label: string;
  groups: Group[];
}

export interface ServiceSession {
  target: string;
  audit?: AuditFinding[];
  runCircuit(circuit: CircuitInfo, repetition: number, judge: Judge): Promise<CircuitRecord>;
  close(): Promise<number[]>;
}

export interface TestService {
  id: string;
  label: string;
  about: string;
  catalogs: Catalog[];
  reportsDir: string;
  describeCircuit?(circuit: CircuitInfo): string | undefined;
  listNotes?(groups: Group[]): string[];
  open(runtime: Runtime, groups: Group[], catalog: Catalog): Promise<ServiceSession>;
  whereToLook(run: RunRecord): string[];
}

export interface Selection {
  service: TestService;
  catalog: Catalog;
  groups: Group[];
  circuitIds: string[];
  repeat: number;
}

export type Choice = ({ kind: 'run' } & Selection) | { kind: 'list'; service: TestService; catalog: Catalog } | { kind: 'quit' };
