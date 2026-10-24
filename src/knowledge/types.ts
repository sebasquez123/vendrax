import type { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import type { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';
import type { StateContextToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import type { SocketContext } from '~/shared/context/types/context.types';

export interface ServerIdentity {
  serverName: `${ServerAdapters}`;
  domain: string;
  label: string;
  toolPrefix: string;
}

export interface VocabularyTarget {
  kind: string;
  name: string;
  source: string;
  meaning: string;
}

export interface VocabularyEntry {
  terms: string[];
  refersTo: VocabularyTarget[];
  note?: string;
}

export interface GlossaryEntry {
  business_hint: string;
  aliases: string[];
}

export type Glossary = Record<string, GlossaryEntry>;

export interface KnowledgeTopic {
  title: string;
  covers: string;
  documentLocation: string;
  status: 'available' | 'planned';
  subdomains?: readonly string[];
}

export interface KnowledgeBase {
  namespace: string;
  searchTool: string;
  topics: KnowledgeTopic[];
  preload?: { enabled: boolean; maxExcerpts?: number };
}

export interface CatalogInventory {
  namesBySource: ReadonlyMap<string, Record<string, string[]>>;
  visibleSources?: readonly string[];
  listedSources?: readonly string[];
}

export interface CatalogResult {
  prompt: string;
  inventory?: CatalogInventory;
}

export interface CatalogSource {
  build: (tools: ToolOutput[]) => Promise<CatalogResult | null>;
}

export interface StateContract<TState> {
  stateContextKey: string;
  parse: (entry: unknown) => { state: TState; issues: string[] };
}

export type ToolPolicyDecision = { allow: true } | { allow: false; message: string; status: 'error' | 'notice' };

export interface TurnInput<TState = undefined> {
  state: TState;
  previousMessageCount: number;
  now: Date;
  socket?: SocketContext;
}

export interface DomainTurn {
  statePrompt?: string;
  stateContextToolParams?: StateContextToolParams;
  evaluateToolCall?: (tool: string, args: Record<string, unknown>) => ToolPolicyDecision;
}

export interface DomainPack<TState = undefined> {
  server: ServerIdentity;
  playbook: string;
  replyShapes?: string;
  vocabulary?: VocabularyEntry[];
  knowledgeBase?: KnowledgeBase;
  catalog?: CatalogSource;
  state?: StateContract<TState>;
  toolCallLimits?: Record<string, number>;
  includedTools?: readonly string[];
  excludedTools?: readonly string[];
  openTurn?: (input: TurnInput<TState>) => DomainTurn;
  mode?: ModeInfo;
}

export interface ModeInfo {
  label: string;
  description: string;
}

export interface ModeOption extends ModeInfo {
  id: string;
}

export type TurnBase = Omit<TurnInput, 'state'>;

export interface RegisteredPack extends Omit<DomainPack, 'state' | 'openTurn'> {
  id: string;
  stateKey?: string;
  openTurn: (stateContext: Record<string, unknown> | undefined, base: TurnBase) => { turn: DomainTurn; issues: string[] };
}

export interface KnowledgeDomain {
  server: ServerIdentity;
  modesBySubdomain: Record<string, readonly string[]>;
  packFor(subdomains: readonly string[], mode?: string): RegisteredPack;
  packs: RegisteredPack[];
}
