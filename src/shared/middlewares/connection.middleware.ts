import { Socket } from 'socket.io';
import { formatZodErrorMessages } from '../helpers/zod.formatter';
import {
  DomainErrorCodes as e,
  MiddlewareInternalServerError,
  MiddlewareNoFoundError,
  MiddlewarePayloadError,
  MiddlewareUnauthorizedError,
  MiddlewareUnavailableServerError,
} from './errors';
import { connectionHeaderSchema } from './validators/headers';
import {
  IClientServerPermission,
  IServerScopeTool,
  JwtApiToolValidator,
  JwtMcpToolValidator,
  OauthApiToolValidator,
  authValidatorSchemes,
  OauthMcpToolValidator,
} from '~/modules/admin/domain/interfaces/authorization.interface';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logging/main.logger';
import { AdminService } from '~/modules/admin/application/admin.service';
import { AuthOrchestratorService } from '~/modules/auth/application/auth_orchestrator.service';
import { ServerAdapters } from '~/entities/ADMINISTRATIVE/server.entity';
import { ToolOrchestratorService } from '~/modules/tools/application/tools_orchestrator.service';
import { ConnectionContext, SocketContext } from '../context/types/context.types';
import { ServerEntity } from '~/entities';
import { KNOWLEDGE_DOMAINS } from '~/knowledge';
import { KnowledgeSelection, verifyKnowledgeDomains } from './validators/knowledge_request';
import { toolsByServerLine } from '../logging/formatters';

@Injectable()
export class ConnectionMiddleware {
  private logger = new LoggerService(ConnectionMiddleware.name);
  constructor(
    private readonly adminService: AdminService,
    private readonly authOrchestratorService: AuthOrchestratorService,
    private readonly toolOrchestratorService: ToolOrchestratorService
  ) {}
  public async onConnect(socket: Socket, context: SocketContext): Promise<void> {
    this.logger.debug('Starting client connection');

    const _appClientId = socket.handshake.auth['appClientId'];
    const _userId = socket.handshake.auth['userId'];
    const _jwt = socket.handshake.auth['Authorization'];
    const _scopes = socket.handshake.auth['scopes'];
    const _subdomains = socket.handshake.auth['subdomains'];
    const _modes = socket.handshake.auth['modes'];

    const validated = connectionHeaderSchema.safeParse({
      appClientId: _appClientId,
      userId: _userId,
      scopes: _scopes,
      subdomains: _subdomains,
      modes: _modes,
      jwt: _jwt,
    });
    if (!validated.success)
      throw new MiddlewarePayloadError('Client headers are missing', e.UNACCEPTABLE_HEADERS_ERROR, {
        issues: formatZodErrorMessages(validated),
      });

    const { appClientId, userId, jwt, scopes, subdomains, modes } = validated.data;

    const { requested_scopes, server_permissions, serverByClient } = await this.validateServers(scopes, appClientId);

    const knowledge = verifyKnowledgeDomains({
      scopes: requested_scopes,
      subdomains,
      modes,
      permissions: server_permissions,
      domains: KNOWLEDGE_DOMAINS,
    });

    await this.validateHealth(serverByClient);

    const connections = this.validateTools(server_permissions, serverByClient, knowledge, userId, appClientId, jwt);
    this.logger.info(
      `Client permissions · client ${appClientId} · ${toolsByServerLine(connections.map((connection) => ({ server: connection.server.serverName, tools: connection.tools })))}`
    );
    context.connection = connections;
    context.client.appClientId = appClientId;
    context.client.scopes = scopes;
    context.user.userId = userId;
    return;
  }

  private validateServers = async (
    scopes: string,
    appClientId: string
  ): Promise<{ requested_scopes: string[]; server_permissions: IClientServerPermission[]; serverByClient: ServerEntity[] }> => {
    this.logger.debug('Validating Client Connections');
    const requested_scopes = scopes
      .split('.')
      .map((s) => s.trim())
      .filter(Boolean);
    if (requested_scopes.length === 0) throw new MiddlewarePayloadError('No scopes provided', e.NO_SCOPES_PROVIDED_ERROR);

    const server_permissions: IClientServerPermission[] = await this.adminService.getClientPermissions(appClientId);

    if (server_permissions.length === 0) throw new MiddlewareNoFoundError('No server permissions found', e.NO_SERVER_PERMISSIONS_FOUND_ERROR);

    const invalidScope = requested_scopes.find((scope) => !server_permissions.some((permission) => permission.name === scope));

    if (invalidScope) throw new MiddlewareUnauthorizedError(`Invalid scope: ${invalidScope}`, e.NO_AUTHORIZED_SCOPES_ERROR);

    const serverByClient = await this.adminService.getServerListByClient(appClientId, requested_scopes);
    return { requested_scopes, server_permissions, serverByClient };
  };

  private validateHealth = async (serverByClient: ServerEntity[]): Promise<void> => {
    this.logger.debug('Validating Server health and liveness');
    const healthChecks = await Promise.all(
      serverByClient.map(async (serv) => {
        return {
          name: serv.serverName,
          healthy: await this.authOrchestratorService.getHealthCheck(serv.url, ServerAdapters[serv.serverName as keyof typeof ServerAdapters]),
        };
      })
    );
    const isNotHealth = healthChecks.find((h) => !h.healthy);

    if (isNotHealth) throw new MiddlewareUnavailableServerError(`${isNotHealth.name} not healthy.`, e.NO_AVAILABLE_SERVER_ERROR);
  };

  private validateTools = (
    server_permissions: IClientServerPermission[],
    serverByClient: ServerEntity[],
    knowledge: Map<string, KnowledgeSelection>,
    userId: string,
    appClientId: string,
    jwt?: string
  ): ConnectionContext[] => {
    this.logger.debug('Validating Tool availability');
    const tool_permissions: Record<string, IServerScopeTool[]> = Object.fromEntries(
      server_permissions.map((permission) => [permission.name, permission.scopes])
    );
    const systemTools = this.toolOrchestratorService.getSystemToolNames();
    const verifyTools = Object.values(tool_permissions)
      .flat()
      .every((tool) => systemTools.has(tool.name));
    if (!verifyTools) throw new MiddlewareUnavailableServerError('Requested tools are not healthy.', e.NO_AVAILABLE_TOOLS_ERROR);
    const auth_schemas = { OauthApiToolValidator, JwtApiToolValidator, JwtMcpToolValidator, OauthMcpToolValidator };

    const serverAuthSchemas = this.adminService.getServerAuthSchema(serverByClient);

    const connections: ConnectionContext[] = [];

    for (const serv of serverByClient) {
      const schema = serverAuthSchemas.find((sch) => sch.name === serv.serverName);
      if (!schema)
        throw new MiddlewareInternalServerError(`Server ${serv.serverName} lacks of auth schema configuration.`, e.NO_CONFIGURED_SERVER_ERROR);
      const validator = auth_schemas[schema.schema as keyof typeof auth_schemas];
      let obj;
      switch (schema.schema) {
        case authValidatorSchemes.OauthApiToolValidator:
          obj = {
            headers: {},
            body: {
              serverName: serv.serverName,
              userId,
              clientId: appClientId,
              serverId: serv.id,
              baseUrl: serv.url,
              client: serv.serverAuth.oauthApiAuth.client,
              refreshEndpoint: serv.serverAuth.oauthApiAuth.refreshEndpoint,
              secret: serv.serverAuth.oauthApiAuth.clientSecret,
              redirectUrl: serv.serverAuth.oauthApiAuth.redirectUrl,
            },
          };
          break;
        case authValidatorSchemes.JwtApiToolValidator:
          if (!jwt) throw new MiddlewarePayloadError(`Server ${serv.serverName} requires JWT`, e.UNACEPTABLE_VALIDATION_PAYLOAD_ERROR);
          obj = {
            headers: {
              token: jwt,
            },
            body: {
              baseUrl: serv.url,
              serverName: serv.serverName,
            },
          };
          break;
        case authValidatorSchemes.JwtMcpToolValidator:
          const JwtMcpAuth = this.authOrchestratorService.getJwt(serv.serverName as ServerAdapters);
          obj = {
            headers: {
              Authorization: `Bearer ${JwtMcpAuth.accessToken}`,
            },
            body: {
              serverName: serv.serverName,
            },
          };
          break;
        case authValidatorSchemes.OauthMcpToolValidator:
          obj = {
            headers: {},
            body: {
              serverName: serv.serverName,
              userId,
              clientId: appClientId,
              serverId: serv.id,
              baseUrl: serv.url,
              username: serv.serverAuth.oauthMcpAuth.username,
              password: serv.serverAuth.oauthMcpAuth.password,
              refreshEndpoint: serv.serverAuth.oauthMcpAuth.refreshEndpoint,
              mcpEndpoint: serv.serverAuth.oauthMcpAuth.mcpEndpoint,
            },
          };
          break;
        default:
          throw new MiddlewareInternalServerError(`Server ${schema.name} lacks of auth schema`, e.NO_CONFIGURED_SERVER_ERROR);
      }
      const result = validator.safeParse(obj);
      if (!result.success) throw new MiddlewarePayloadError(`Invalid ${schema.name} auth payload`, e.UNACEPTABLE_VALIDATION_PAYLOAD_ERROR);
      const selection = knowledge.get(serv.serverName);
      if (!selection)
        throw new MiddlewareInternalServerError(
          `Server ${serv.serverName} was not checked against its knowledge domain.`,
          e.NO_CONFIGURED_SERVER_ERROR
        );
      connections.push({
        server: serv,
        tools: tool_permissions[serv.serverName] ?? [],
        subdomains: selection.subdomains,
        modes: selection.modes,
        authSchema: result.data,
      });
    }
    return connections;
  };
}
