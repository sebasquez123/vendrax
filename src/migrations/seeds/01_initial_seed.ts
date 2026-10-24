import AppDataSource from '../../data-source';
import { LoggerService } from '~/shared/logging/main.logger';
import {
  ServerEntity,
  ClientServerEntity,
  ClientEntity,
  oauthMcpAuthEntity,
  oauthApiAuthEntity,
  jwtApiAuthEntity,
  ServerAuthEntity,
} from '~/entities';

const logger = new LoggerService('initial_seed');
async function seed() {
  await AppDataSource.initialize();

  const serverRepository = AppDataSource.getRepository(ServerEntity);
  const serverAuthRepository = AppDataSource.getRepository(ServerAuthEntity);
  const jwtApiAuthRepository = AppDataSource.getRepository(jwtApiAuthEntity);
  const oauthApiAuthRepository = AppDataSource.getRepository(oauthApiAuthEntity);
  const oauthMcpAuthRepository = AppDataSource.getRepository(oauthMcpAuthEntity);
  const clientRepository = AppDataSource.getRepository(ClientEntity);
  const clientServerRepository = AppDataSource.getRepository(ClientServerEntity);

  await clientRepository.save({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'pay',
    botName: 'METBOT',
    serverName: 'pay_api',
    createdAt: new Date('2026-08-08T23:07:19.119'),
    updatedAt: null,
    deletedAt: null,
  });

  await serverRepository.save([
    {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      clientId: '6NjCylQvtD0cecLP6ecZ1zP5NwTI0VFc-aD8dLGEgZ0',
      url: 'http://localhost:8080',
      transport: 'http',
      serverName: 'pms_api',
      createdAt: new Date('2026-08-08T23:09:34.673'),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      clientId: null,
      url: 'http://localhost:4003',
      transport: 'http',
      serverName: 'pay_api',
      createdAt: new Date('2026-08-08T23:13:49.506'),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: '9f8c7b6a-5e4d-43c2-a1b0-9876543210fe',
      clientId: null,
      url: 'https://biaqa.metgroupsas.com',
      transport: 'http',
      serverName: 'superset_mcp',
      createdAt: new Date('2026-08-25T18:23:44.345'),
      updatedAt: null,
      deletedAt: null,
    },
  ]);

  await serverAuthRepository.save([
    {
      id: 'c82e14a7-3f69-48d5-b021-6a9e7c4f1852',
      serverId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      serverType: 'api',
      authType: 'oauth',
      createdAt: new Date('2026-08-08T23:09:34.673'),
      updatedAt: null,
    },
    {
      id: '1a6d5f90-82c3-4e17-b9a4-35f7c8d20169',
      serverId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      serverType: 'api',
      authType: 'token',
      createdAt: new Date('2026-08-08T23:13:49.506'),
      updatedAt: null,
    },
    {
      id: 'e4b79136-0c52-4fa8-93d7-21c6e85ab409',
      serverId: '9f8c7b6a-5e4d-43c2-a1b0-9876543210fe',
      serverType: 'mcp',
      authType: 'oauth',
      createdAt: new Date('2026-08-25T18:23:44.345'),
      updatedAt: null,
    },
  ]);

  await oauthMcpAuthRepository.save([
    {
      id: 'a71d5c38-0e94-46b2-9f17-c3a85e6d2041',
      serverAuthId: 'e4b79136-0c52-4fa8-93d7-21c6e85ab409',
      mcpEndpoint: '/mcp_remote/mcp',
      authEndpoint: '/api/v1/security/login',
      refreshEndpoint: '/api/v1/security/refresh',
      username: 'MET_BOT_PAY',
      password: 'password1',
      schema: 'OauthMcpToolValidator',
      createdAt: new Date('2026-08-25T18:23:44.345'),
      updatedAt: null,
    },
  ]);

  await oauthApiAuthRepository.save({
    id: 'f26c9b73-5d18-4e60-a42f-8c1d7b395e02',
    serverAuthId: 'c82e14a7-3f69-48d5-b021-6a9e7c4f1852',
    schema: 'OauthApiToolValidator',
    client: '6NjCylQvtD0cecLP6ecZ1zP5NwTI0VFc-aD8dLGEgZ0',
    authEndpoint: '/oauth/authorize',
    refreshEndpoint: '/oauth/token',
    redirectUrl: 'http://localhost:8085/auth/oauth/callback',
    clientSecret: 'secret1',
    createdAt: new Date('2026-08-08T23:09:34.673'),
    updatedAt: null,
  });

  await jwtApiAuthRepository.save({
    id: '84e2a617-c530-49bd-8f46-1a73d9c2058e',
    serverAuthId: '1a6d5f90-82c3-4e17-b9a4-35f7c8d20169',
    schema: 'JwtApiToolValidator',
    authEndpoint: '/user/profile',
    createdAt: new Date('2026-08-08T23:13:49.506'),
    updatedAt: null,
  });

  await clientServerRepository.save([
    {
      id: 'a1b2c3d4-e5f6-4789-9012-3456789abcde',
      serverId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-08-08T23:16:27.308'),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 'd4e5f6a7-b8c9-4123-9456-789abcdef012',
      serverId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-08-08T23:16:27.308'),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: '8a3f1d2c-7b6e-49a5-b840-1c2d3e4f5a6b',
      serverId: '9f8c7b6a-5e4d-43c2-a1b0-9876543210fe',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-08-08T23:16:27.308'),
      updatedAt: null,
      deletedAt: null,
    },
  ]);

  await AppDataSource.destroy();
}

seed().catch(async (error) => {
  logger.error(
    `Seed failed: ${error instanceof Error ? error.message : String(error)}`,
    500,
    undefined,
    error instanceof Error ? error.stack : undefined
  );

  if (AppDataSource.isInitialized) await AppDataSource.destroy();

  process.exit(1);
});
