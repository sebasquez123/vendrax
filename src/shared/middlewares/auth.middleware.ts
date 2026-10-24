import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import { AdminService } from '~/modules/admin/application/admin.service';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { IUserServerPermission, JwtApiToolType } from '~/modules/admin/domain/interfaces/authorization.interface';
import { AuthType, ServerType } from '~/entities';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { ConnectionContext } from '../context/types/context.types';
import {
  DomainErrorCodes as e,
  MiddlewareInternalServerError,
  MiddlewareNoApiFoundError,
  MiddlewarePayloadError,
  MiddlewareUnauthorizedError,
  MiddlewareUserNoActiveError,
} from './errors';
import { LoggerService } from '../logging/main.logger';
import { API_KEY_HEADER } from '~/shared/services/crypto/crypto';
import { toolsByServerLine } from '../logging/formatters';
import { Socket } from 'socket.io';
import { createTranslator } from '../services/i18n/config';
import { I18nService } from 'nestjs-i18n';
import { CacheService } from '~/modules/cache/application/cache.service';
import { ICachedContext } from '~/modules/cache/domain/interfaces/cached';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private logger = new LoggerService(WsAuthGuard.name);
  constructor(
    private readonly adminService: AdminService,
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly cacheService: CacheService,
    private readonly i18n: I18nService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.trace('Starting User Validation');
    const client = context.switchToWs().getClient<Socket>();
    const _userId = Number(client.handshake.auth['userId']);
    const _language = (client.handshake.auth['language'] as string | undefined) ?? null;
    const _utc = (client.handshake.auth['utc'] as string | undefined) ?? null;
    const _x_api_key = client.handshake.auth[API_KEY_HEADER] as string | undefined;
    const appContext = await this.cacheService.getKey<ICachedContext>(client.id);

    if (!appContext) throw new MiddlewareInternalServerError('Context seems not to be available', e.NO_CONTEXT_FOUND_ERROR);

    const clientId = appContext.client.appClientId!;
    const userId = appContext.user.userId;

    if (!_x_api_key) throw new MiddlewareUnauthorizedError(`Missing '${API_KEY_HEADER}' in the socket auth`, e.NO_API_KEY_ERROR);
    const keyClient = await this.adminService.getClientByApiKey(_x_api_key);
    if (!keyClient || keyClient.id !== clientId) throw new MiddlewareUnauthorizedError('Invalid API key', e.INVALID_API_KEY_ERROR);

    const { serverName, botName } = await this.adminService.getClientByClientId(clientId);

    const server = await this.adminService.getServerByServerName(serverName);

    if (server.serverAuth.serverType === ServerType.API && server.serverAuth.authType === AuthType.JWT) {
      const authorization = appContext?.connection?.find((connection) => connection.server.serverName === serverName)?.authSchema as
        JwtApiToolType | undefined;
      if (!authorization)
        throw new MiddlewareNoApiFoundError(
          'No client api connection found into scopes, make sure the client api is registered and scopes requested include it',
          e.NO_SOURCE_API_FOUND_ERROR
        );

      const { id, name, userName, email, birthDate, status } = await this.authOrchestratorService.getUserProfile(
        authorization.headers.token,
        server.url,
        serverName as ServerAdapters
      );

      if (!status) throw new MiddlewareUserNoActiveError(`User ${id} is not active`, e.USER_NO_ACTIVE_OR_LOCKED_ERROR);

      if (Number(id) !== _userId)
        throw new MiddlewarePayloadError(`User Id does not match with provided user Id`, e.PAYLOAD_FRAUD_ERROR, { id, userId });

      const payload = {
        userId: _userId,
        clientId,
        username: userName,
        email,
        name,
        status: true,
      };
      await this.adminService.upsertUser(payload, appContext.connection ?? []);
      const user = await this.adminService.getUserByUserIdClientId(_userId, clientId);

      const userContext = {
        userId: user!.id!,
        userEmail: email || '',
        userName: user?.username || '',
        birthDate: birthDate || '',
        language: _language || 'es',
        utc: _utc,
      };
      appContext.user = userContext;
      appContext.client.botName = botName;

      const server_permissions: IUserServerPermission[] = await this.adminService.getUserPermissions(user!.id);
      const requested = appContext?.connection ?? [];
      const denied = requested.filter((c) => !server_permissions.some((p) => c.server.serverName === p.name)).map((c) => c.server.serverName);
      if (denied.length)
        throw new MiddlewareUnauthorizedError(`This user has no permission on: ${denied.join(', ')}`, e.NO_USER_SERVER_PERMISSIONS_ERROR, {
          servers: denied,
        });
      const transformedScopes: ConnectionContext[] = requested.map((c) => {
        const permittedTools = server_permissions.find((t) => c.server.serverName === t.name);
        return {
          ...c,
          tools: c.tools.filter((ct) => permittedTools?.scopes.some((pt) => pt.name === ct.name)),
        };
      });

      const hasTools = transformedScopes.some((connection) => connection.tools.length > 0);

      if (!hasTools) throw new MiddlewareUnauthorizedError('No permitted tools available for this user', e.NO_USER_TOOL_PERMISSIONS_ERROR);

      this.logger.debug(
        `User permissions · user ${appContext.user.userId ?? '-'} · ${toolsByServerLine(transformedScopes.map((connection) => ({ server: connection.server.serverName, tools: connection.tools })))}`
      );
      appContext.connection = transformedScopes;
      appContext.i18n = createTranslator(this.i18n, _language);
      return true;
    }
    throw new MiddlewarePayloadError(
      'Unexpected alternative; A client must havea jwt - api server bound to connect',
      e.NO_USER_TOOL_PERMISSIONS_ERROR
    );
  }
}
