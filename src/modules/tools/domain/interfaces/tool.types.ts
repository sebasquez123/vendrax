import type { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { JwtToolParams, OauthToolParams, MCPToolParams } from './tool.interfaces';

export type ToolOutput = DynamicStructuredTool | DynamicTool;
export type JwtTools = { func: (toolParams: JwtToolParams) => ToolOutput; name: string };
export type OauthTools = { func: (toolParams: OauthToolParams) => ToolOutput; name: string };
export type MCPTools = { func: (toolParams: MCPToolParams) => ToolOutput; name: string };
export type ToolBatch = Record<string, JwtTools[] | OauthTools[] | MCPTools[]>;
