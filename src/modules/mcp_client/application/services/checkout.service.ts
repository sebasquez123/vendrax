import { Injectable } from '@nestjs/common';

import { GenericMCPClient } from '../../infrastructure';
import { LoggerService } from '~/shared/logging/main.logger';
import { MCPClientInterface } from '../interfaces/mcp_generic_client';
import { DomainErrorCodes as e, ToolCallingError } from '../../domain/errors';
import { CallMcpServerType, GetMcpToolsType } from '../../domain/validator';

/**
 * Servicio de checkout MCP
 * Gestiona el checkout de clientes MCP: inicializa un cliente, llama herramientas y lista las disponibles usando GenericMCPClient.
 */
@Injectable()
export class McpClientCheckout {
  private logger = new LoggerService(McpClientCheckout.name);
  constructor() {}
  private async mcpInitialization(serverName: string, url: string, authorization?: string): Promise<MCPClientInterface> {
    const client: MCPClientInterface = new GenericMCPClient(serverName, url, authorization);
    await client.connectToServer();
    return client;
  }

  async callTool({ serverName, url, toolName, toolArgs }: CallMcpServerType, authorization?: string): Promise<Record<string, unknown>> {
    this.logger.debug(`Checking MCP server ${serverName} at ${url} for tool '${toolName}'`);
    const client = await this.mcpInitialization(serverName, url, authorization);

    const toolResponse: string | Record<string, unknown> | Record<string, unknown>[] = await client.callTool(toolName, toolArgs);
    client.setUpTransportEvents();
    if (toolResponse === null || toolResponse === undefined) throw new ToolCallingError(`Tool ${toolName} retrieval failed`, e.TOOL_CALLING_ERROR);
    await client.closeConnection();
    return toolResponse;
  }

  async getAvailableTools({ serverName, url, split }: GetMcpToolsType, authorization: string): Promise<Record<string, unknown>[]> {
    this.logger.debug(`Foraging available tools from MCP server ${serverName} at ${url}...`);

    const client = await this.mcpInitialization(serverName, url, authorization);
    const details: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }[] = [];
    const toolData = await client.getTools(split ?? 2);
    for (const tool of toolData) {
      const name = tool['name'] as string;
      const description = tool['description'] as string;
      const inputSchema = tool['inputSchema'] as Record<string, unknown>;

      details.push({ name, description, inputSchema });
    }
    client.setUpTransportEvents();
    if (details.length === 0)
      throw new ToolCallingError(`No tools available or server ${serverName} failed to convey tool information`, e.TOOL_RETRIEVAL_ERROR);
    await client.closeConnection();
    return details;
  }
}
