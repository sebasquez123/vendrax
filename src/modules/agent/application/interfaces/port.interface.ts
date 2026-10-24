import { AgentMiddleware, DynamicStructuredTool, DynamicTool } from 'langchain';
import { MessageContextType } from '~/modules/chat/domain/validator/message_input';
import { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';

export interface MCPAgentPortInterface {
  RunInference(params: StreamInferAdapterParams): Promise<void>;
  RunCompletion(params: CompletionAdapterParams): Promise<string>;
  McpHealthCheck(model_name: string): Promise<boolean>;
}

export interface CompletionAdapterParams {
  systemPrompt: string;
  input: string;
  model_name: string;
}

export interface StreamInferAdapterParams {
  context: MessageContextType[];
  newMessage: string;
  tools: DynamicStructuredTool[] | DynamicTool[] | ToolOutput[];
  systemPrompt: string;
  model_name: string;
  middleware?: AgentMiddleware[];
  onMessageChunk?: (chunk: string) => void;
  onThinkingChunk?: (thinking: string) => void;
  onContextInit?: (type: string, content: string) => void;
  onToolCall?: (toolName: string, args: string) => void;
  onFinalUsage?: (usage?: TokenUsage, metadata?: McpScore) => void;
  onCustomEvent?: (object: Record<string, unknown>, type: string, action: string, source: string) => void;
  signal?: AbortSignal;
}

export type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export interface McpScore {
  model?: string;
  model_provider?: string;
  created_at?: Date;
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  model_weight?: string;
}
