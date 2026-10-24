import { Controller, Post, Body, Get, Headers } from '@nestjs/common';
import { DomainErrorCodes } from '../domain/errors';
import { ApiOperation, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { McpClientCheckout } from '../application/services/checkout.service';
import { CallMcpServerSchema, type CallMcpServerType, GetMcpToolsSchema, type GetMcpToolsType } from '../domain/validator';
import { formatZodErrorMessages } from '~/shared/helpers/zod.formatter';
import { InvalidMcpPayloadError } from '../domain/errors';
@ApiTags('mcp-module')
@Controller('mcp/tools')
export class McpClientController {
  constructor(private readonly mcpClientService: McpClientCheckout) {}
  @Post('call')
  @ApiOperation({ summary: 'Call MCP server with a tool' })
  @ApiBody({ type: typeof CallMcpServerSchema, description: 'Call MCP server request' })
  @ApiResponse({ status: 201, description: 'MCP server response successfully' })
  @ApiResponse({ status: 404, description: 'MCP client not found' })
  @ApiResponse({ status: 502, description: 'MCP tool retrieval failed' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - MCP client connection error',
  })
  async callToolMcpServer(@Body() body: CallMcpServerType, @Headers('Authorization') authorization: string): Promise<Record<string, unknown>> {
    const validated = CallMcpServerSchema.safeParse({ ...body, authorization });
    if (!validated.success)
      throw new InvalidMcpPayloadError('Payload Type validation failure', DomainErrorCodes.INVALID_MCP_PAYLOAD_ERROR, {
        issues: formatZodErrorMessages(validated),
      });
    return await this.mcpClientService.callTool(body, authorization);
  }

  @Get('get')
  @ApiOperation({ summary: 'Get available tools from any MCP server' })
  @ApiBody({ type: typeof GetMcpToolsSchema, description: 'Get available tools request' })
  @ApiResponse({ status: 201, description: 'MCP server tools retrieved successfully' })
  @ApiResponse({ status: 404, description: 'MCP client not found' })
  @ApiResponse({ status: 502, description: 'MCP tool retrieval failed' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - MCP client connection error',
  })
  async getToolsMcpServer(@Body() body: GetMcpToolsType, @Headers('Authorization') authorization: string) {
    const validated = GetMcpToolsSchema.safeParse({ ...body, authorization });
    if (!validated.success)
      throw new InvalidMcpPayloadError('Payload Type validation failure', DomainErrorCodes.INVALID_MCP_PAYLOAD_ERROR, {
        issues: formatZodErrorMessages(validated),
      });
    return await this.mcpClientService.getAvailableTools(body, authorization);
  }
}
