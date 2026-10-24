import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { executorPortInterface } from '../interfaces/port.interface';
import { DomainErrorCodes as e, ToolInternalError, ToolOutputFormatError } from '../../domain/errors';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { MCPExeParams } from '../../domain/interfaces/tool.interfaces';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { AdminService } from '~/modules/admin/application/admin.service';
import config from '~/config';
@Injectable()
export class McpAdapterService implements executorPortInterface<MCPExeParams> {
  private logger = new LoggerService(McpAdapterService.name);
  constructor(
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly adminService: AdminService
  ) {}

  public RunExecutor = async ({ args, serverName, toolName, langChainClient, toolResponseConfig }: MCPExeParams): Promise<any> => {
    try {
      const startedAt = Date.now();
      this.logger.trace(`Calling tool: ${toolName}`, args);
      const client = await langChainClient.getClientByName(serverName);
      if (!client) throw new ToolInternalError(`Client not found for this server: ${serverName}`, e.CLIENT_ERROR);
      const response = await client.callTool({ name: toolName, arguments: args }, undefined, { timeout: config.tools.toolTimeoutMs });

      const result = toolResponseConfig.schema.safeParse(response);
      if (!result.success) throw new ToolOutputFormatError(`Tool Schema response invalid: ${result.error.message}`, e.CALLBACK_OUTPUT_ERROR);

      const text = firstContentText(result.data);
      if (text && !isJson(text)) {
        this.logger.warn(`Tool [${serverName} - ${toolName}] returned a non-JSON body`, { text });
        return `Error from ${String(args['name'] ?? toolName)}: ${text}`;
      }

      const output = toolResponseConfig.mapResponse
        ? await toolResponseConfig.mapResponse(result.data, args, this.authOrchestratorService, this.adminService)
        : result.data;
      this.logger.debug(`Tool [${serverName} - ${String(args['name'] ?? toolName)}] done in ${Date.now() - startedAt}ms`);
      return output;
    } catch (_error: unknown) {
      if (_error instanceof DomainError) {
        this.logger.error(_error.message, _error.httpStatus ?? 500, _error.detail, _error?.stack, _error.code);
        return `Error occurred while executing the tool. ${_error.message}`;
      } else {
        const error = _error instanceof Error ? _error : new Error('Unknown Error on tool execution');
        this.logger.error(error.message, 500);
        return `Error occurred while executing the tool. ${error.message}`;
      }
    }
  };
}

const firstContentText = (data: unknown): string | undefined => {
  const content = (data as { content?: { text?: unknown }[] } | null)?.content;
  const text = Array.isArray(content) ? content[0]?.text : undefined;
  return typeof text === 'string' ? text : undefined;
};

const isJson = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
