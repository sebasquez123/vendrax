import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';

import {
  ApiSession,
  AuthenticateMcpAdapterParams,
  AuthPortInterface,
  GetApiSessionAdapterParams,
  RefreshAuthAdapterParams,
  UpsertAuthAdapterParams,
} from '../application/interfaces/port.interface';
import { McpClientCheckout } from '~/modules/mcp_client/application/services/checkout.service';
import { AuthAdapterBadGatewayError, AuthAdapterDataNoFoundError, AuthGatewayTimeoutError, DomainErrorCodes as e } from '../domain/errors';
import { OauthEntity, UserEntity, ClientServerEntity } from '~/entities';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { AdminService } from '~/modules/admin/application/admin.service';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { decryptValue, encryptValue } from '~/shared/services/crypto/crypto';
@Injectable()
export class SupersetAuthAdapterService implements AuthPortInterface {
  private logger = new LoggerService(SupersetAuthAdapterService.name);
  private readonly oauthRepository;
  private readonly userRepository;
  private readonly clientServerRepository;
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mcpClientCheckout: McpClientCheckout,
    private readonly adminService: AdminService
  ) {
    this.oauthRepository = this.dataSource.getRepository(OauthEntity);
    this.userRepository = this.dataSource.getRepository(UserEntity);
    this.clientServerRepository = this.dataSource.getRepository(ClientServerEntity);
  }

  public async checkHealth(baseUrl: string): Promise<boolean> {
    this.logger.trace(`Checking Superset Adapter health...`);
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
    });
    if (!response.ok) throw new AuthAdapterBadGatewayError(`Error checking SUPERSET health`, e.VERIFY_CODE_ERROR);
    return true;
  }

  public async authenticateMcp({ attempts = 0, ...data }: AuthenticateMcpAdapterParams): Promise<string> {
    this.logger.trace(`Checking out superset OAuth credentials...`);
    const serverName = 'superset';
    let storedRefreshToken: string | undefined;
    try {
      const userOauthRecord = await this.adminService.getOauthByUniques(data.clientId, data.serverId, data.userId);
      storedRefreshToken = userOauthRecord.refreshToken;
      const decryptAccessToken = decryptValue(userOauthRecord.accessToken, 'Superset access token');
      const health = await this.mcpClientCheckout.callTool(
        {
          serverName,
          url: `${data.baseUrl}${data.mcpEndpoint}`,
          toolName: 'call_tool',
          toolArgs: { name: 'health_check', arguments: {} },
        },
        decryptAccessToken || ''
      );
      const result = health as { content: { text: string }[]; isError: boolean };
      const object = JSON.parse(result.content[0]?.text || '') as { status: string };
      if (object.status === 'healthy' && !result.isError) return decryptAccessToken;
      throw new AuthAdapterBadGatewayError(`Superset health check failed`, e.VERIFY_CODE_ERROR);
    } catch (refreshError: unknown) {
      if (refreshError instanceof DomainError) {
        const status1 = refreshError.detail?.['status'] as number;
        this.logger.error(
          refreshError.message,
          refreshError.httpStatus ?? status1 ?? 500,
          refreshError.detail,
          refreshError?.stack,
          refreshError.code
        );
        if (attempts >= 1)
          throw new AuthGatewayTimeoutError(`The JWT went good but the gate got it rejected multiple attempts`, e.PLENTY_REFRESH_TRIES_ERROR);
        try {
          this.logger.debug(`Attempting to refresh Superset`);
          await this.refreshOauthToken({
            userId: data.userId,
            serverId: data.serverId,
            clientId: data.clientId,
            refreshEndpoint: data.refreshEndpoint,
            refreshToken: storedRefreshToken || '',
            baseUrl: data.baseUrl,
            client: '',
            secret: '',
          });
          return this.authenticateMcp({ ...data, attempts: attempts + 1 });
        } catch (loginError: unknown) {
          if (loginError instanceof DomainError) {
            const status2 = loginError instanceof DomainError ? (loginError.detail?.['status'] as number) : 500;
            this.logger.error(
              loginError instanceof DomainError ? loginError.message : 'Unknown loginError on superset auth',
              loginError instanceof DomainError ? (loginError.httpStatus ?? status2 ?? 500) : 500,
              loginError instanceof DomainError ? loginError.detail : undefined,
              loginError instanceof DomainError ? loginError?.stack : undefined,
              loginError instanceof DomainError ? loginError.code : undefined
            );
            this.logger.debug(`Attempting to login Superset`);
            try {
              const server = await this.adminService.getServerById(data.serverId);
              if (!server) throw new Error(`Server with id ${data.serverId} not found`);
              await this.upsertOauth({
                userId: data.userId,
                clientId: data.clientId,
                server,
                code: '',
              });
              return this.authenticateMcp({ ...data, attempts: attempts + 1 });
            } catch (loginInnerError: unknown) {
              if (loginInnerError instanceof DomainError) {
                const status3 = loginInnerError instanceof DomainError ? (loginInnerError.detail?.['status'] as number) : 500;
                this.logger.error(
                  loginInnerError instanceof DomainError ? loginInnerError.message : 'Unknown loginInnerError on superset auth',
                  loginInnerError instanceof DomainError ? (loginInnerError.httpStatus ?? status3 ?? 500) : 500,
                  loginInnerError instanceof DomainError ? loginInnerError.detail : undefined,
                  loginInnerError instanceof DomainError ? loginInnerError?.stack : undefined,
                  loginInnerError instanceof DomainError ? loginInnerError.code : undefined
                );
                throw new AuthAdapterBadGatewayError(`Superset login check failed`, e.VERIFY_CODE_ERROR);
              } else {
                const error = loginInnerError instanceof Error ? loginInnerError : new Error('Unknown Error on loginError on superset auth');
                this.logger.error(`Error checking out login of Superset: ${error.message}`, 500);
                throw error;
              }
            }
          } else {
            const error = loginError instanceof Error ? loginError : new Error('Unknown Error on loginError on superset auth');
            this.logger.error(`Error checking out login of Superset: ${error.message}`, 500);
            throw error;
          }
        }
      } else {
        const error = refreshError instanceof Error ? refreshError : new Error('Unknown Error on refreshError on superset auth');
        this.logger.error(`Error checking refresh of Superset: ${error.message}`, 500);
        throw error;
      }
    }
  }

  public async getApiSession({ baseUrl, accessToken }: GetApiSessionAdapterParams): Promise<ApiSession> {
    const response = await fetch(`${baseUrl}/api/v1/security/csrf_token/`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => ({}))) as { result?: string };
    if (!response.ok || !body.result)
      throw new AuthAdapterBadGatewayError(`Error getting Superset CSRF token`, e.CSRF_TOKEN_ERROR, { status: response.status });

    const cookie = response.headers
      .getSetCookie()
      .map((setCookie) => setCookie.split(';')[0])
      .join('; ');
    if (!cookie) throw new AuthAdapterBadGatewayError(`Superset returned no session cookie with the CSRF token`, e.CSRF_TOKEN_ERROR);

    return { accessToken, csrfToken: body.result, cookie };
  }

  public async refreshOauthToken({ userId, serverId, clientId, refreshEndpoint, refreshToken, baseUrl }: RefreshAuthAdapterParams): Promise<void> {
    const decryptedRefreshToken = decryptValue(refreshToken, 'Superset refresh token');
    const response = await fetch(`${baseUrl}${refreshEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${decryptedRefreshToken}`,
      },
    });

    if (!response.ok)
      throw new AuthAdapterBadGatewayError(`Error getting Superset access token`, e.TOKEN_REFRESH_ERROR, {
        status: response.status,
      });

    const data = (await response.json()) as {
      access_token: string;
    };

    const clientServer = await this.clientServerRepository.findOneBy({ clientId, serverId });

    if (!clientServer || !clientServer.id)
      throw new AuthAdapterDataNoFoundError('Error getting client-server relation while refreshing PMS token', e.SERVERCLIENT_NO_FOUND_ERROR, {
        userId,
        clientId,
      });

    await this.oauthRepository.update({ userId: userId, clientServerId: clientServer.id }, { accessToken: encryptValue(data.access_token) });
    this.logger.debug(`OAuth token refreshed successfully for userId: ${userId} and serverId: ${serverId}... trying original request again`);
  }

  public async upsertOauth({ userId, clientId, server }: UpsertAuthAdapterParams): Promise<void> {
    const auth = server.serverAuth.oauthMcpAuth;
    const decryptedPassword = decryptValue(auth.password, 'Superset password');

    const response = await fetch(`${server.url}${auth.authEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: auth.username,
        password: decryptedPassword,
        provider: 'db',
        refresh: true,
      }),
    });

    if (!response.ok)
      throw new AuthAdapterBadGatewayError(`Error getting Superset access token`, e.TOKEN_REFRESH_ERROR, {
        status: response.status,
      });

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
    };

    const { access_token, refresh_token } = data;
    const encryptedAccessToken = encryptValue(access_token);
    const encryptedRefreshToken = encryptValue(refresh_token);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.id)
      throw new AuthAdapterDataNoFoundError('Error verifying user in PMS Oauth process', e.USER_NO_FOUND_ERROR, {
        userId,
        clientId,
      });
    const clientServer = await this.clientServerRepository.findOneBy({ clientId, serverId: server.id });

    if (!clientServer || !clientServer.id)
      throw new AuthAdapterDataNoFoundError('Error getting client-server relation in PMS adapter', e.SERVERCLIENT_NO_FOUND_ERROR, {
        userId,
        clientId,
      });
    const existingOauth = await this.oauthRepository.findOneBy({ userId: user.id, clientServerId: clientServer.id });
    if (existingOauth) {
      await this.oauthRepository.update(
        { userId: user.id, clientServerId: clientServer.id },
        { refreshToken: encryptedRefreshToken, accessToken: encryptedAccessToken }
      );
    } else {
      await this.oauthRepository.insert({
        userId: user.id,
        clientServerId: clientServer.id,
        refreshToken: encryptedRefreshToken,
        accessToken: encryptedAccessToken,
      });
    }

    this.logger.debug(`Token stored successfully for userId: ${userId} and serverId: ${server.id}`);
  }
}
