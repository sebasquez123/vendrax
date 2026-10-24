import { AgentMiddleware, DynamicStructuredTool, DynamicTool } from 'langchain';
import { MessageContextType } from '~/modules/chat/domain/validator/message_input';
import { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';

export interface McpAgentWorkflowParams {
  context: MessageContextType[];
  newMessage: string;
  toolSet: DynamicStructuredTool[] | DynamicTool[] | ToolOutput[];
  agent?: string;
  prompt?: string;
  middleware?: AgentMiddleware[];
}

export interface McpRouterWorkflowParams {
  context: MessageContextType[];
  newMessage: string;
  agent?: string;
  prompt?: string;
}

export enum AgentEngines {
  GEMINI = 'gemini',
  OPENAI = 'openai',
}
