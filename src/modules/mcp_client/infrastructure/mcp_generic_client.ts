import { URL } from 'url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LoggerService } from '~/shared/logging/main.logger';
import { ClientConnectionError, DomainErrorCodes as e, NoFoundActiveClientError, ToolCallingError } from '~/modules/mcp_client/domain/errors';
import { MCPClientInterface } from '~/modules/mcp_client/application/interfaces/mcp_generic_client';

/**
 * Cliente MCP genérico
 * Implementación genérica para interactuar con servidores MCP: encapsula la conexión, la llamada a herramientas y la capa de transporte.
 */
export class GenericMCPClient implements MCPClientInterface {
  private logger = new LoggerService(GenericMCPClient.name);
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isCompleted = false;

  constructor(serverName: string, serverUrl: string, authorization?: string) {
    this.initialize(serverName, serverUrl, authorization);
  }

  private initialize(serverName: string, serverUrl: string, authorization?: string) {
    this.logger.trace(`Initializing GenericMCPClient for server: ${serverName} at URL: ${serverUrl}`);
    this.client = new Client({ name: serverName, version: '1.0.0' });
    const url = new URL(serverUrl);
    this.transport = new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: {
          ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
        },
      },
    });
  }

  public async connectToServer() {
    try {
      this.logger.trace(`Connecting through GenericMCPClient`);
      if (this.client === null || this.transport === null) throw new NoFoundActiveClientError('Client not found', e.NO_FOUND_ACTIVE_CLIENT_ERROR);

      await this.client.connect(this.transport);
    } catch (error: unknown) {
      if (error instanceof NoFoundActiveClientError) throw error;
      const message = error instanceof Error ? error.message : 'Unexpected generic client error';
      throw new ClientConnectionError(message, e.GENERIC_CLIENT_CONNECTION_ERROR);
    }
  }

  public async callTool(toolName: string, argument: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.trace(`Calling tool ${toolName} from Generic Mcp client...`);
    try {
      if (this.client === null) throw new NoFoundActiveClientError('Client not found while calling tool', e.NO_FOUND_ACTIVE_CLIENT_ERROR);
      const result = await this.client.callTool({
        name: toolName,
        arguments: argument,
      });
      return result;
    } catch (error: unknown) {
      if (error instanceof NoFoundActiveClientError) throw error;
      const message = error instanceof Error ? error.message : 'Unexpected generic client error';
      throw new ToolCallingError(message, e.TOOL_CALLING_ERROR, {
        toolName,
        argument,
      });
    }
  }

  public async getTools(split: number): Promise<Record<string, unknown>[]> {
    this.logger.trace(`Getting tools from Generic Mcp client...`);
    if (this.client === null) throw new NoFoundActiveClientError('Client not found while getting tools', e.NO_FOUND_ACTIVE_CLIENT_ERROR);
    try {
      const { tools } = await this.client.listTools();
      const filtered = tools.slice(0, split);
      return filtered;
    } catch (error: unknown) {
      if (error instanceof NoFoundActiveClientError) throw error;
      const message = error instanceof Error ? error.message : 'Unexpected generic client error';
      throw new ToolCallingError(message, e.TOOL_RETRIEVAL_ERROR);
    }
  }

  public setUpTransportEvents() {
    if (this.transport === null || this.client === null) {
      this.logger.warn('transport is null. Returning...');
      return;
    }

    this.transport.onclose = () => {
      if (!this.isCompleted) {
        this.isCompleted = true;
      }
    };

    this.transport.onerror = (error) => {
      if (error.message.includes('HTTP STREAM disconnected'))
        this.logger.trace(`HTTP STREAM transport: Connection closed by server or client. ${error.message}`);
      this.closeConnection().catch((err) => {
        this.logger.error(`Error during closing: ${err instanceof Error ? err.message : String(err)}`);
      });
    };

    this.transport.onmessage = (message) => {
      this.logger.trace(`message received from server: ${message}`);
    };
  }

  async closeConnection() {
    if (this.transport) {
      await this.transport.close?.();
      this.transport = null;
    }
    await this.client?.close();
    this.client = null;
    this.isCompleted = true;
  }
}
