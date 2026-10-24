import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { Pms, Pay, Superset } from '../infrastructure';
import {
  GetConsentScreenAdapterParams,
  AuthPortInterface,
  RefreshAuthAdapterParams,
  UpsertAuthAdapterParams,
  AuthCapabilities,
  GetUserProfileResponse,
  AuthenticateMcpAdapterParams,
  GetApiSessionAdapterParams,
  ApiSession,
} from './interfaces/port.interface';

import { AuthInternalError, AuthNoFoundError, DomainErrorCodes as e } from '../domain/errors';
import { ServerEntity } from '~/entities';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { AdminService } from '~/modules/admin/application/admin.service';

/**
 * Orquestador de autenticación
 * Accede a los recursos estándar que ofrecen los distintos proveedores o adaptadores de autenticación.
 */
@Injectable()
export class AuthOrchestratorService {
  private logger = new LoggerService(AuthOrchestratorService.name);
  private adapters: Map<string, AuthPortInterface> = new Map();
  constructor(
    private readonly adminService: AdminService,
    private readonly pms: Pms,
    private readonly pay: Pay,
    private readonly superset: Superset
  ) {}

  async onModuleInit(): Promise<void> {
    this.adapters.set(ServerAdapters.pms_api, this.pms);
    this.adapters.set(ServerAdapters.pay_api, this.pay);
    this.adapters.set(ServerAdapters.superset_mcp, this.superset);

    const loadedAdapters = Array.from(this.adapters.keys());
    const currentAdapter = this.adapters.get(loadedAdapters.at(0)!);

    if (!currentAdapter)
      throw new AuthInternalError(`No adapters loaded correctly. Check adapters' configuration.`, e.LOAD_ERROR, {
        adapters: loadedAdapters,
      });

    this.logger.info(`Auth Orchestrator initialized with adapters: ${loadedAdapters.join(', ')}`);
  }

  private selectAdapter(adapter: ServerAdapters): AuthPortInterface {
    let currentAdapter;
    if (this.adapters.has(adapter)) currentAdapter = this.adapters.get(adapter);
    if (currentAdapter) return currentAdapter;
    throw new AuthInternalError(`Error loading the chosen provider`, e.NO_AUTH_AVAILABLE_ERROR, {
      adapters: Array.from(this.adapters.keys()),
      adapter,
    });
  }

  private verifyAdapterCapability(adapter: AuthPortInterface, capability: AuthCapabilities): boolean {
    if (!adapter) return false;
    const skill = capability.toString();
    if (!(skill in adapter)) return false;
    return true;
  }

  public async getHealthCheck(url: string, adapter: ServerAdapters): Promise<boolean> {
    const currentAdapter = this.selectAdapter(adapter);
    return await currentAdapter.checkHealth(url);
  }

  public async getUserProfile(authorization: string, url: string, _adapter: ServerAdapters): Promise<GetUserProfileResponse> {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.getUserProfile))
      throw new AuthInternalError(`getUserProfile method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return await adapter.getUserProfile!({ token: authorization, baseUrl: url });
  }

  public getConsentScreen(params: GetConsentScreenAdapterParams, _adapter: ServerAdapters): string {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.getConsentScreen))
      throw new AuthInternalError(`getConsentScreen method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return adapter.getConsentScreen!({ ...params });
  }
  public async refreshOauthToken(params: RefreshAuthAdapterParams, _adapter: ServerAdapters): Promise<void> {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.refreshOauthToken))
      throw new AuthInternalError(`refreshOauthToken method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return await adapter.refreshOauthToken!({ ...params });
  }

  public async upsertOauth(params: UpsertAuthAdapterParams, _adapter: ServerAdapters): Promise<void> {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.upsertOauth))
      throw new AuthInternalError(`upsertOauth method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return await adapter.upsertOauth!({ ...params });
  }

  public async verifyServer(serverId: string): Promise<ServerEntity> {
    const server = await this.adminService.getServerById(serverId);
    if (!server) throw new AuthNoFoundError('Server not found in Db', e.SERVER_NO_FOUND_ERROR);
    return server;
  }

  public getJwt(_adapter: ServerAdapters): { accessToken: string } {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.getJwt))
      throw new AuthInternalError(`getJwt method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return adapter.getJwt!();
  }
  public async authenticateMcp(params: AuthenticateMcpAdapterParams, _adapter: ServerAdapters): Promise<string> {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.authenticateMcp))
      throw new AuthInternalError(`authenticateMcp method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return await adapter.authenticateMcp!({ ...params });
  }
  public async getApiSession(params: GetApiSessionAdapterParams, _adapter: ServerAdapters): Promise<ApiSession> {
    const adapter = this.selectAdapter(_adapter);
    if (!this.verifyAdapterCapability(adapter, AuthCapabilities.getApiSession))
      throw new AuthInternalError(`getApiSession method not available for the selected adapter`, e.NO_AUTH_AVAILABLE_ERROR);
    return await adapter.getApiSession!({ ...params });
  }
}
