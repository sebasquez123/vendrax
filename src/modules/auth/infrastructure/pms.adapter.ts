import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  GetConsentScreenAdapterParams,
  AuthPortInterface,
  RefreshedTokens,
  RefreshAuthAdapterParams,
  UpsertAuthAdapterParams,
  VerifyAuthAdapterParams,
} from '../application/interfaces/port.interface';
import { AuthAdapterBadGatewayError, AuthAdapterDataNoFoundError, DomainErrorCodes as e } from '../domain/errors';
import { ClientServerEntity, OauthEntity, UserEntity } from '~/entities';
import { decryptValue, encryptValue } from '~/shared/services/crypto/crypto';
@Injectable()
export class PmsAuthAdapterService implements AuthPortInterface {
  private logger = new LoggerService(PmsAuthAdapterService.name);
  private readonly oauthRepository;
  private readonly userRepository;
  private readonly clientServerRepository;
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.oauthRepository = this.dataSource.getRepository(OauthEntity);
    this.userRepository = this.dataSource.getRepository(UserEntity);
    this.clientServerRepository = this.dataSource.getRepository(ClientServerEntity);
  }

  public async checkHealth(baseUrl: string): Promise<boolean> {
    this.logger.trace(`Checking PMS Adapter health...`);
    try {
      const webHealthCheck = await fetch(`${baseUrl}/health_checks/default`, {
        method: 'GET',
      });
      if (!webHealthCheck.ok) return false;
      const dbHealthCheck = await fetch(`${baseUrl}/health_checks/database`, {
        method: 'GET',
      });
      if (!dbHealthCheck.ok) return false;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Uncaught error for Health check';
      this.logger.error(`Error checking out health of PMS: ${errorMessage}`);
      return false;
    }
  }

  public getConsentScreen({ userId, serverId, clientId, serverName, client, redirectUrl, url }: GetConsentScreenAdapterParams): string {
    if (!userId || !serverId || !clientId) return 'Error: Missing user identity. Please encourage user to log-in the app platform again.';
    const queryParams = new URLSearchParams({
      response_type: 'code',
      scope: 'api_v3',
      client_id: client,
      redirect_uri: redirectUrl,
      state: `${userId}.${serverId}.${clientId}`,
    }).toString();

    const authorizationUrl = `${url}${queryParams}`;

    return `Encourage user to log in the platform server: ${serverName}. This is the authorization url: ${authorizationUrl}`;
  }

  public async upsertOauth({ code, userId, clientId, server }: UpsertAuthAdapterParams): Promise<void> {
    const auth = server.serverAuth.oauthApiAuth;
    const secret = auth.clientSecret;
    const decryptedSecret = decryptValue(secret, 'PMS client secret');
    const verifyObject = {
      code,
      endpoint: auth.refreshEndpoint,
      baseUrl: server.url,
      clientId: auth.client,
      clientSecret: decryptedSecret,
      redirectUri: auth.redirectUrl,
    };
    const response = await this.verifyOauthCode(verifyObject);

    const { access_token, refresh_token } = response;

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
    const encryptedAccessToken = encryptValue(access_token);
    const encryptedRefreshToken = encryptValue(refresh_token);
    await this.oauthRepository.upsert(
      {
        userId: user.id,
        clientServerId: clientServer?.id,
        refreshToken: encryptedRefreshToken,
        accessToken: encryptedAccessToken,
      },
      ['userId', 'clientServerId']
    );

    this.logger.debug(`Token stored successfully for userId: ${userId} and serverId: ${server.id}`);
  }

  private async verifyOauthCode({ code, endpoint, baseUrl, clientId, clientSecret, redirectUri }: VerifyAuthAdapterParams): Promise<RefreshedTokens> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!response.ok) throw new AuthAdapterBadGatewayError(`Error verifying PMS Code`, e.VERIFY_CODE_ERROR);

    const postData = (await response.json()) as RefreshedTokens;
    return postData;
  }

  public async refreshOauthToken({
    userId,
    serverId,
    clientId,
    refreshEndpoint,
    refreshToken,
    client,
    secret,
    baseUrl,
  }: RefreshAuthAdapterParams): Promise<void> {
    const decryptedSecret = decryptValue(secret, 'PMS client secret');
    const decryptedRefreshToken = decryptValue(refreshToken, 'PMS refresh token');
    const response = await fetch(`${baseUrl}${refreshEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
        client_id: client,
        client_secret: decryptedSecret,
      }),
    });

    if (!response.ok)
      throw new AuthAdapterBadGatewayError(`Refresh PMS Token Error`, e.TOKEN_REFRESH_ERROR, {
        status: response.status,
      });

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };
    const clientServer = await this.clientServerRepository.findOneBy({ clientId, serverId });

    if (!clientServer || !clientServer.id)
      throw new AuthAdapterDataNoFoundError('Error getting client-server relation while refreshing PMS token', e.SERVERCLIENT_NO_FOUND_ERROR, {
        userId,
        clientId,
      });
    const encryptedAccessToken = encryptValue(data.access_token);
    const encryptedRefreshToken = encryptValue(data.refresh_token);
    await this.oauthRepository.update(
      { userId: userId, clientServerId: clientServer.id },
      { refreshToken: encryptedRefreshToken, accessToken: encryptedAccessToken }
    );
    this.logger.debug(`OAuth token refreshed successfully for userId: ${userId} and serverId: ${serverId}... trying original request again`);
  }
}
