import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { Client } from 'node_modules/@langchain/mcp-adapters/dist/connection.cjs';
import { DynamicStructuredTool } from 'langchain';
import { ServerEntity } from '~/entities';

export interface LangchainMCPInterface {
  multiServer: MultiServerMCPClient | null;
  createClient(servers: ServerEntity[], headers: Record<string, any>): Promise<void>;
  closeClient(): Promise<void>;
  getTools(): Promise<DynamicStructuredTool[]>;
  getClientByName(name: string): Promise<Client | undefined>;
}
