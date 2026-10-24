import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { DataSource, In, IsNull } from 'typeorm';
import {
  AgentFeedbackEntity,
  ClientEntity,
  ClientServerEntity,
  OauthEntity,
  ServerEntity,
  ToolEntity,
  UserEntity,
  UserServerPermissionEntity,
  UserToolPermissionEntity,
} from '~/entities';
import { IClientServerPermission, IServerAuthSchema, IServerScopeTool, IUserServerPermission } from '../domain/interfaces/authorization.interface';
import { InjectDataSource } from '@nestjs/typeorm';
import { DomainErrorCodes as e, NoRecordsfoundError } from '../domain/errors';
import type { AgentFeedbackType } from '../domain/validator';
import { type Guide, TGuides } from '../domain/templating/guides';
import type { LanguageTranslator } from '~/shared/services/i18n/config';
import { generateApiKey, hashApiKey, isApiKey } from '~/shared/services/crypto/crypto';
/**
 * Servicio de administración
 * Gestiona las operaciones corporativas: permisos, asignaciones, configuración y administración general.
 */
@Injectable()
export class AdminService {
  private logger = new LoggerService(AdminService.name);
  private readonly ClientServerRepository;
  private readonly ServerRepository;
  private readonly ClientRepository;
  private readonly UserRepository;
  private readonly OauthRepository;
  private readonly ToolRepository;
  private readonly UserToolPermissionRepository;
  private readonly UserServerPermissionRepository;
  private readonly AgentFeedbackRepository;
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.ClientServerRepository = this.dataSource.getRepository(ClientServerEntity);
    this.ServerRepository = this.dataSource.getRepository(ServerEntity);
    this.ClientRepository = this.dataSource.getRepository(ClientEntity);
    this.UserRepository = this.dataSource.getRepository(UserEntity);
    this.OauthRepository = this.dataSource.getRepository(OauthEntity);
    this.ToolRepository = this.dataSource.getRepository(ToolEntity);
    this.UserToolPermissionRepository = this.dataSource.getRepository(UserToolPermissionEntity);
    this.UserServerPermissionRepository = this.dataSource.getRepository(UserServerPermissionEntity);
    this.AgentFeedbackRepository = this.dataSource.getRepository(AgentFeedbackEntity);
  }

  public getGuide(reference: string, i18n: LanguageTranslator): Guide {
    const guides = TGuides(i18n);
    const guide = guides[reference.trim().toLowerCase()];
    if (!guide) throw new NoRecordsfoundError(`No guide found for '${reference}'`, e.NO_GUIDE_FOUND_ERROR, { available: Object.keys(guides) });
    return guide;
  }

  public async recordFeedback({ appClientId, userId, type, comment, conversation }: AgentFeedbackType): Promise<void> {
    const client = await this.getClientByClientId(appClientId);
    const user = await this.UserRepository.findOneBy({ userId, clientId: client.id });
    if (!user)
      throw new NoRecordsfoundError(`No user ${userId} found for client ${client.id}`, e.NO_USER_FOUND_ERROR, { userId, clientId: client.id });

    const { id } = await this.AgentFeedbackRepository.save({
      userId: user.id,
      clientId: client.id,
      platformUserId: user.userId,
      userName: user.name ?? user.username,
      clientName: client.name,
      type,
      comment: comment ?? null,
      conversation: conversation ?? null,
    });
    this.logger.info(`Recorded feedback ${id} (${type}) from user ${user.id} of client ${client.name}`);
    return;
  }

  public getServerAuthSchema(serverByClient: ServerEntity[]): IServerAuthSchema[] {
    return serverByClient.flatMap((server) => {
      const auth = server.serverAuth;
      const schema = (auth?.oauthMcpAuth ?? auth?.oauthApiAuth ?? auth?.jwtMcpAuth ?? auth?.jwtApiAuth)?.schema;
      return schema ? [{ name: server.serverName, schema }] : [];
    });
  }

  public async getClientPermissions(clientId: string): Promise<IClientServerPermission[]> {
    this.logger.trace(`Getting permissions of client ${clientId}`);
    const clientServers = await this.ClientServerRepository.find({
      where: { clientId, deletedAt: IsNull() },
      relations: { server: true, toolPermissions: { tool: true }, subdomainPermissions: { subdomain: true, modePermissions: { mode: true } } },
    });
    return clientServers.map(({ server, toolPermissions, subdomainPermissions }) => ({
      name: server.serverName,
      scopes: toolPermissions.filter(({ tool }) => tool.active).map(({ tool }) => ({ name: tool.name })),
      subdomains: subdomainPermissions
        .filter(({ subdomain }) => subdomain.active)
        .map(({ subdomain, modePermissions }) => ({
          name: subdomain.name,
          modes: modePermissions.filter(({ mode }) => mode.active).map(({ mode }) => mode.name),
        })),
    }));
  }

  public async getUserPermissions(userId: string): Promise<IUserServerPermission[]> {
    this.logger.trace(`Getting permissions of user ${userId}`);
    const [servers, tools] = await Promise.all([
      this.UserServerPermissionRepository.find({ where: { userId, active: true }, relations: { clientServer: { server: true } } }),
      this.UserToolPermissionRepository.find({ where: { userId, tool: { active: true } }, relations: { tool: true } }),
    ]);
    return servers
      .map(({ clientServer: { server } }) => ({
        name: server.serverName,
        scopes: tools.filter(({ tool }) => tool.serverId === server.id).map(({ tool }) => ({ name: tool.name, type: tool.type })),
      }))
      .filter(({ scopes }) => scopes.length > 0);
  }
  public async getServerListByClient(clientId: string, servers: string[]): Promise<ServerEntity[]> {
    this.logger.trace(`Getting available services by clientId ${clientId}`);
    const serverByClient = await this.ClientServerRepository.find({
      where: { clientId, server: { serverName: In(servers) } },
      relations: { server: { serverAuth: { oauthMcpAuth: true, oauthApiAuth: true, jwtMcpAuth: true, jwtApiAuth: true } } },
    });

    if (!serverByClient || serverByClient.length === 0) throw new NoRecordsfoundError(`No servers found`, e.NO_SERVER_FOUND_ERROR);

    if (servers.length !== serverByClient.length) throw new NoRecordsfoundError(`No all requested servers were found`, e.NO_SERVER_FOUND_ERROR);

    const availableServers: ServerEntity[] = serverByClient.map(({ server }) => {
      return { ...server };
    });

    this.logger.debug(
      'Retrieved Requested Services:',
      availableServers.map((i) => i.serverName)
    );

    return availableServers;
  }

  public async getServerById(serverId: string): Promise<ServerEntity> {
    this.logger.trace(`Getting service by serverId ${serverId}`);
    const record = (
      await this.ServerRepository.find({
        where: { id: serverId },
        relations: {
          serverAuth: {
            oauthMcpAuth: true,
            oauthApiAuth: true,
            jwtMcpAuth: true,
            jwtApiAuth: true,
          },
        },
        take: 1,
      })
    ).at(0);

    if (!record) throw new NoRecordsfoundError(`No server found with ID ${serverId}`, e.NO_SERVER_FOUND_ERROR);

    return record;
  }

  public async getClientByClientId(clientId: string): Promise<ClientEntity> {
    this.logger.trace(`Getting client: ${clientId}`);
    const client = await this.ClientRepository.findOneBy({ id: clientId });

    if (!client) throw new NoRecordsfoundError(`No client found with id ${clientId}`, e.NO_CLIENT_FOUND_ERROR);
    return client;
  }

  public async rotateClientApiKey(clientId: string): Promise<string> {
    const client = await this.ClientRepository.findOneBy({ id: clientId, deletedAt: IsNull() });
    if (!client) throw new NoRecordsfoundError(`No active client found with id ${clientId}`, e.NO_CLIENT_FOUND_ERROR);

    const { apiKey, apiKeyHash } = generateApiKey();
    await this.ClientRepository.update({ id: client.id }, { apiKeyHash, apiKeyRotatedAt: new Date() });
    this.logger.info(`API key rotated for client ${client.name} (${client.id})`);
    return apiKey;
  }

  public async getClientByApiKey(apiKey: unknown): Promise<ClientEntity | null> {
    if (!isApiKey(apiKey)) return null;
    return this.ClientRepository.findOneBy({ apiKeyHash: hashApiKey(apiKey), deletedAt: IsNull() });
  }

  public async getServerByServerName(serverName: string): Promise<ServerEntity> {
    this.logger.trace(`Getting service that matches with name: ${serverName}`);

    const server = (await this.ServerRepository.find({ where: { serverName: serverName }, relations: { serverAuth: true }, take: 1 })).at(0);

    if (!server) throw new NoRecordsfoundError(`No server found that matches the name ${serverName}`, e.NO_SERVER_FOUND_ERROR);
    return server;
  }

  public async upsertUser(
    payload: Partial<UserEntity> & Pick<UserEntity, 'userId' | 'clientId'>,
    permitted: { server: ServerEntity; tools: IServerScopeTool[] }[]
  ): Promise<void> {
    this.logger.trace(`Upserting user`, payload);
    const isNew = !(await this.UserRepository.existsBy({ userId: payload.userId, clientId: payload.clientId }));
    await this.UserRepository.upsert(payload, { conflictPaths: ['userId', 'clientId'], skipUpdateIfNoValuesChanged: true });
    if (!isNew) return;

    const user = await this.UserRepository.findOneByOrFail({ userId: payload.userId, clientId: payload.clientId });
    if (!permitted.length) return;
    const clientServers = await this.ClientServerRepository.findBy({
      clientId: payload.clientId,
      serverId: In(permitted.map(({ server }) => server.id)),
    });
    await this.UserServerPermissionRepository.upsert(
      clientServers.map((clientServer) => ({ userId: user.id, clientServerId: clientServer.id, active: true })),
      { conflictPaths: ['userId', 'clientServerId'], skipUpdateIfNoValuesChanged: true }
    );
    this.logger.info(`Granted ${permitted.map(({ server }) => server.serverName).join(', ')} to the new user ${user.id}`);

    const granted = permitted.filter(({ tools }) => tools.length);
    if (!granted.length) return;
    const tools = await this.ToolRepository.findBy(
      granted.map(({ server, tools: names }) => ({ serverId: server.id, name: In(names.map((tool) => tool.name)), active: true }))
    );
    if (!tools.length) return;
    await this.UserToolPermissionRepository.upsert(
      tools.map((tool) => ({ userId: user.id, toolId: tool.id })),
      { conflictPaths: ['userId', 'toolId'], skipUpdateIfNoValuesChanged: true }
    );
    this.logger.info(`Granted ${tools.length} tools to the new user ${user.id}`);
  }

  public async getUserByUserIdClientId(userId: number, clientId: string) {
    const user = this.UserRepository.findOneBy({ userId, clientId });
    if (!user) throw new NoRecordsfoundError(`No user found with ${userId} and ${clientId}`, e.NO_USER_FOUND_ERROR);
    return user;
  }

  public async getOauthByUniques(clientId: string, serverId: string, userId: string): Promise<OauthEntity> {
    const clientServer = await this.ClientServerRepository.findOneBy({ clientId, serverId });
    if (!clientServer || !clientServer.id)
      throw new NoRecordsfoundError('Error getting client-server relation', e.NO_CLIENT_SERVER_FOUND_ERROR, {
        userId,
        serverId,
        clientId,
      });

    const oauth = await this.OauthRepository.findOneBy({ userId, clientServerId: clientServer.id });
    if (!oauth || !oauth.id)
      throw new NoRecordsfoundError('Error getting oauth record', e.NO_OAUTH_FOUND_ERROR, {
        userId,
        clientId,
        serverId,
      });
    return oauth;
  }
}
