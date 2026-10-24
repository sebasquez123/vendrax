import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { LoggerService } from '~/shared/logging/main.logger';
import { Client } from 'node_modules/@langchain/mcp-adapters/dist/connection.cjs';
import { Injectable } from '@nestjs/common';
import { LangchainMCPInterface } from '~/modules/mcp_client/application/interfaces/mcp_langchain_client';
import {
  ClientConnectionError,
  DomainErrorCodes as e,
  NoFoundActiveClientError,
  ToolCallingError,
  ClientRetrievalError,
} from '~/modules/mcp_client/domain/errors';
import { DynamicStructuredTool } from 'langchain';
import { ServerEntity } from '~/entities';

/**
 * Cliente MCP con LangChain
 * Clase núcleo que interactúa con varios servidores MCP mediante los adaptadores de LangChain, con interfaz de alto nivel.
 */
@Injectable()
export class LangchainMCPClient implements LangchainMCPInterface {
  public multiServer: MultiServerMCPClient | null = null;
  private logger = new LoggerService(LangchainMCPClient.name);
  public async createClient(servers: ServerEntity[], headers: Record<string, any>): Promise<void> {
    const serverList: Record<string, any> = {};
    servers.forEach((server) => {
      serverList[server.serverName] = {
        transport: server.transport,
        url: server.url,
        type: server.transport,
        headers: headers[server.serverName],
      };
    });

    try {
      const client = new MultiServerMCPClient({
        mcpServers: serverList,
        throwOnLoadError: true,
        prefixToolNameWithServerName: false,
        useStandardContentBlocks: true,
      });

      await client.initializeConnections();
      this.multiServer = client;
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected langchain error';
      throw new ClientConnectionError(message, e.LANGCHAIN_CLIENT_CONNECTION_ERROR, {
        servers: serverList,
      });
    }
  }

  public async getTools(): Promise<DynamicStructuredTool[]> {
    try {
      this.logger.trace(`Getting tools from langchain Mcp client...`);
      if (this.multiServer === null) throw new NoFoundActiveClientError('Client was not found while getting tools', e.NO_FOUND_ACTIVE_CLIENT_ERROR);
      const tools = await this.multiServer?.getTools();
      return tools;
    } catch (error: unknown) {
      if (error instanceof NoFoundActiveClientError) throw error;
      const message = error instanceof Error ? error.message : 'Unexpected generic client error';
      throw new ToolCallingError(message, e.TOOL_RETRIEVAL_ERROR);
    }
  }

  public async getClientByName(name: string): Promise<Client | undefined> {
    try {
      this.logger.trace(`Getting ${name} mcp client`);
      if (this.multiServer === null) throw new NoFoundActiveClientError('Client was not found while calling it', e.NO_FOUND_ACTIVE_CLIENT_ERROR);
      const client = await this.multiServer.getClient(name);
      return client;
    } catch (error: unknown) {
      if (error instanceof NoFoundActiveClientError) throw error;
      const message = error instanceof Error ? error.message : 'Unexpected generic client error';
      throw new ClientRetrievalError(message, e.CLIENT_RETRIEVAL_ERROR, { serverName: name });
    }
  }

  public async closeClient(): Promise<void> {
    if (this.multiServer) await this.multiServer.close();
    this.multiServer = null;
    this.logger.trace(`Langchain Mcp client closed`);
    return;
  }
}
