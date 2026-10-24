import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { executorPortInterface } from '../interfaces/port.interface';
import { DomainErrorCodes as e, ToolFetchError, ToolOutputFormatError } from '../../domain/errors';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { JwtExeParams } from '../../domain/interfaces/tool.interfaces';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { AdminService } from '~/modules/admin/application/admin.service';
import config from '~/config';

@Injectable()
export class JwtAdapterService implements executorPortInterface<JwtExeParams> {
  private logger = new LoggerService(JwtAdapterService.name);
  constructor(
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly adminService: AdminService
  ) {}

  public RunExecutor = async ({ serverContext, toolContext }: JwtExeParams): Promise<any> => {
    const { url, serverName, token } = serverContext;
    const { args, toolName, httpMethod, toolResponseConfig } = toolContext;
    try {
      const { default: fetch } = await import('node-fetch');

      this.logger.trace(`Calling tool: ${toolName} of ${serverName}`, args);

      const params = Object.fromEntries(
        Object.entries(args?.params ?? {}).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)])
      );
      const headers = {
        'Content-Type': 'application/hal+json',
        Authorization: `Bearer ${token}`,
      };

      const urlParams = new URLSearchParams({ ...params }).toString();
      this.logger.trace(`Set up Url: ${url}${urlParams}`);
      const response = await fetch(`${url}${urlParams}`, {
        method: httpMethod,
        headers,
        ...(args?.body == undefined || null ? {} : args?.body),
        signal: AbortSignal.timeout(config.tools.toolTimeoutMs),
      });
      const body = await response.text();
      if (!response.ok)
        throw new ToolFetchError(`${toolName} has failed: ${body}. Continuing conversation...`, e.CALLBACK_FETCH_ERROR, {
          status: response.status,
        });
      const result = toolResponseConfig.schema.safeParse(JSON.parse(body));
      if (!result.success) throw new ToolOutputFormatError(`Tool Schema response invalid: ${result.error.message}`, e.CALLBACK_OUTPUT_ERROR);

      return toolResponseConfig.mapResponse
        ? toolResponseConfig.mapResponse(result.data, null, this.authOrchestratorService, this.adminService)
        : result.data;
    } catch (_error: unknown) {
      if (_error instanceof DomainError) {
        const status = _error.detail?.['status'] as number;
        this.logger.error(_error.message, _error.httpStatus ?? status ?? 500, _error.detail, _error?.stack, _error.code);
        if (status == 401) {
          return `User may not be authenticated. Encourage user to log in again the platform.`;
        } else if (status == 504) {
          return `The server might be down, Encourage user to try later`;
        }
        return `${_error.message} \n\n\n try to explain the cause`;
      } else {
        const error = _error instanceof Error ? _error : new Error('Unknown Error on tool execution');
        this.logger.error(error.message, 500);
        return `Error occurred while executing the tool. Explain friendly the cause of the error: ${error.message}`;
      }
    }
  };
}
