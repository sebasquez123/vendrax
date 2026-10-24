import { ServerEntity } from '~/entities';

export interface AuthPortInterface {
  checkHealth(baseUrl: string): Promise<boolean>;
  getConsentScreen?(params: GetConsentScreenAdapterParams): string;
  getUserProfile?(params: GetUserProfileParams): Promise<GetUserProfileResponse>;
  upsertOauth?(params: UpsertAuthAdapterParams): Promise<void>;
  refreshOauthToken?(params: RefreshAuthAdapterParams): Promise<void>;
  getJwt?(): { accessToken: string };
  authenticateMcp?(params: AuthenticateMcpAdapterParams): Promise<string>;
  getApiSession?(params: GetApiSessionAdapterParams): Promise<ApiSession>;
}

export enum AuthCapabilities {
  getConsentScreen = 'getConsentScreen',
  getUserProfile = 'getUserProfile',
  upsertOauth = 'upsertOauth',
  refreshOauthToken = 'refreshOauthToken',
  getJwt = 'getJwt',
  authenticateMcp = 'authenticateMcp',
  getApiSession = 'getApiSession',
}

export interface AuthenticateMcpAdapterParams {
  baseUrl: string;
  mcpEndpoint: string;
  refreshEndpoint: string;
  userId: string;
  serverId: string;
  clientId: string;
  attempts?: number;
}
export interface GetApiSessionAdapterParams {
  baseUrl: string;
  accessToken: string;
}

export interface ApiSession {
  accessToken: string;
  csrfToken: string;
  cookie: string;
}

export interface GetConsentScreenAdapterParams {
  userId: string;
  serverId: string;
  clientId: string;
  serverName: string;
  url: string;
  client: string;
  redirectUrl: string;
}

export interface UpsertAuthAdapterParams {
  code: string;
  userId: string;
  clientId: string;
  server: ServerEntity;
}

export interface VerifyAuthAdapterParams {
  code: string;
  endpoint: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface RefreshAuthAdapterParams {
  userId: string;
  serverId: string;
  clientId: string;
  refreshEndpoint: string;
  refreshToken: string;
  client: string;
  secret: string;
  baseUrl: string;
}

export interface GetUserProfileResponse {
  id: string;
  name?: string;
  userName?: string;
  email?: string;
  birthDate?: string;
  avatar?: string;
  status?: boolean;
}

export interface GetUserProfileParams {
  token: string;
  baseUrl: string;
}

export interface RefreshedTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}
