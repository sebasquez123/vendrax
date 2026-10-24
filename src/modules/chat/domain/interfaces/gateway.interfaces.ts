import type { ModeOption } from '~/knowledge/types';

export enum ChatEvents {
  PROVIDER = 'mcp/Agent/providers',
  ASK = 'mcp/Agent/ask',
  STOP = 'mcp/Agent/stop',
  CONTEXT = 'mcp/Agent/context',
  TOOLS = 'mcp/Agent/tools',
  CHUNK = 'mcp/Agent/chunk',
  THINKING = 'mcp/Agent/thinking',
  END = 'mcp/Agent/total',
  ERROR = 'mcp/Agent/error',
  CUSTOM = 'mcp/Agent/custom',
  SUMMARIZED = 'mcp/Agent/summarized',
}

export interface ConnectionEvent {
  session: string;
  providers: string[];
  modes: ModeOption[];
  connection: string | undefined;
}

export interface ConversationSummarizedEvent {
  summary: string;
  summarizedMessages: { from: number; to: number };
  remainingMessages: number;
  model: string;
  createdAt: string;
}

export enum ChatStatus {
  START = 'start',
  PROGRESS = 'progress',
  END = 'end',
}
