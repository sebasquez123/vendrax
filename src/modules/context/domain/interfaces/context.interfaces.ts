import type { DomainTurn, RegisteredPack, ToolPolicyDecision, VocabularyTarget } from '~/knowledge/types';
import type { StateContextToolParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import type { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';
import type { KnowledgeSearch } from '~/modules/tools/infrastructure/tools/rag/tool';
import type { ConnectionContext } from '~/shared/context/types/context.types';

export interface OpenedServer {
  connection: ConnectionContext;
  serverName: string;
  label: string;
  pack: RegisteredPack;
  turn: DomainTurn;
  toolNames: string[];
  knowledgeSearch?: KnowledgeSearch;
}

export interface OpenedTurn {
  servers: OpenedServer[];
  now: Date;
  stateContextToolParams: Partial<Record<string, StateContextToolParams>>;
}

export type PreloadPhase = 'catalog' | 'retrieval';

export interface PreloadTarget {
  connection: ConnectionContext;
  label: string;
  pack: RegisteredPack;
  tools: ToolOutput[];
  knowledgeSearch?: KnowledgeSearch;
}

export type PreloadedContext = Record<PreloadPhase, string | null>;

export interface RetrievedExcerpt {
  content?: string;
}

export type SectionPart = 'instructions' | 'knowledge' | 'data' | 'current state';

export interface VocabularyDrift {
  terms: string[];
  target: VocabularyTarget;
}

export interface VocabularyCheck {
  drifted: VocabularyDrift[];
  unseenSources: string[];
}

export interface IdentityPromptParams {
  botName?: string | null;
  userName?: string | null;
}

export interface DomainToolPolicy {
  toolNames: ReadonlySet<string>;
  prefix: string;
  limits?: Record<string, number>;
  evaluate?: (tool: string, args: Record<string, unknown>) => ToolPolicyDecision;
}
