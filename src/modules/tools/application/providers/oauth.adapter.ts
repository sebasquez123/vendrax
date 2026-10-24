import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { executorPortInterface } from '../interfaces/port.interface';
import { DomainErrorCodes as e, ToolAttemptsError, ToolFetchError, ToolOutputFormatError } from '../../domain/errors';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { OauthExeParams } from '../../domain/interfaces/tool.interfaces';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { AdminService } from '~/modules/admin/application/admin.service';
import config from '~/config';
import { decryptValue } from '~/shared/services/crypto/crypto';

@Injectable()
export class OauthAdapterService implements executorPortInterface<OauthExeParams> {
  private logger = new LoggerService(OauthAdapterService.name);

  constructor(
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly adminService: AdminService
  ) {}

  public RunExecutor = async ({ serverContext, toolContext, attempts = 0 }: OauthExeParams): Promise<any> => {
    const { url, serverName, userId, serverId, clientId, client, baseUrl, refreshEndpoint, secret } = serverContext;
    const { args, toolName, httpMethod, toolResponseConfig } = toolContext;
    let refreshToken;
    try {
      const { default: fetch } = await import('node-fetch');
      this.logger.trace(`Calling tool: ${toolName} of ${serverName}`, args);
      const userOauthRecord = await this.adminService.getOauthByUniques(clientId, serverId, userId);
      const accessToken = decryptValue(userOauthRecord.accessToken, `${serverName} access token`);
      refreshToken = userOauthRecord.refreshToken;

      const params = Object.fromEntries(
        Object.entries(args?.params ?? {}).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)])
      );

      const headers = {
        'Content-Type': 'application/hal+json',
        Authorization: `Bearer ${accessToken}`,
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
          this.logger.debug(`Attempting to refresh OAuth for userId: ${userId}`);
          try {
            if (attempts > 2)
              throw new ToolAttemptsError(`The JWT went good but the gate got it rejected multiple attempts`, e.CALLBACK_ATTEMPTS_ERROR);
            await this.authOrchestratorService.refreshOauthToken(
              {
                userId,
                serverId,
                clientId,
                client,
                secret,
                refreshEndpoint,
                refreshToken: refreshToken || '',
                baseUrl,
              },
              serverName as ServerAdapters
            );
            return this.RunExecutor({ serverContext, toolContext, attempts: attempts + 1 });
          } catch (refreshError: unknown) {
            if (refreshError instanceof DomainError) {
              const RefreshStatus = refreshError.detail?.['status'] as number;
              this.logger.error(refreshError.message, RefreshStatus ?? 500, refreshError.detail, refreshError?.stack, refreshError.code);
              return `Error: Token couldn't be refreshed. Please encourage user to authenticate, identify and call the OAuth tool of the server: ${serverName} for user and help them, be supportive.`;
            } else {
              const error = _error instanceof Error ? _error : new Error('Unknown Error on tool execution');
              this.logger.error(error.message, 500);
              return `Error: Token couldn't be refreshed. Please encourage user to authenticate, identify and call the OAuth tool of the server: ${serverName} for user and help them, be supportive.`;
            }
          }
        } else {
          const error = _error instanceof Error ? _error : new Error('Unknown Error on tool execution');
          this.logger.error(error.message, 500);
          return `Error occurred while executing the tool. Explain friendly the cause of the error: ${error.message}`;
        }
      } else {
        const error = _error instanceof Error ? _error : new Error('Unknown Error on tool execution');
        this.logger.error(error.message, 500);
        return `Error occurred while executing the tool. Explain friendly the cause of the error: ${error.message}`;
      }
    }
  };
}
