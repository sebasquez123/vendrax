import AppDataSource from '../../data-source';
import { LoggerService } from '~/shared/logging/main.logger';
import {
  ClientModePermissionEntity,
  ClientServerEntity,
  ClientSubdomainPermissionEntity,
  ClientToolPermissionEntity,
  ModeEntity,
  ServerEntity,
  SubdomainEntity,
  ToolEntity,
  ToolType,
} from '~/entities';

interface CatalogTool {
  name: string;
  type: ToolType;
  description: string;
}

interface ServerCatalog {
  tools: CatalogTool[];
  subdomains: Record<string, string[]>;
}

const read_t = (name: string, description: string): CatalogTool => ({ name, type: ToolType.READ, description });
const create_t = (name: string, description: string): CatalogTool => ({ name, type: ToolType.CREATE, description });
const update_t = (name: string, description: string): CatalogTool => ({ name, type: ToolType.UPDATE, description });
const delete_t = (name: string, description: string): CatalogTool => ({ name, type: ToolType.DELETE, description });

export const SERVER_CATALOG: Record<string, ServerCatalog> = {
  pay_api: {
    tools: [
      read_t('get_persons', 'Consulta las personas registradas en PAY.'),
      read_t('search_knowledge', 'Busca en la base de conocimiento de PAY.'),
    ],
    subdomains: { personas: [], ventas: [] },
  },
  pms_api: {
    tools: [
      read_t('get_user_simple_list', 'Lista los usuarios del gestor de proyectos.'),
      read_t('get_work_packages', 'Consulta los paquetes de trabajo del gestor de proyectos.'),
      update_t('start_pms_oauth', 'Inicia la autorización OAuth del usuario con el gestor de proyectos.'),
    ],
    subdomains: {},
  },
  superset_mcp: {
    tools: [
      read_t('list_dashboards', 'Lista los dashboards.'),
      read_t('get_dashboard_info', 'Lee un dashboard y sus gráficos.'),
      read_t('list_datasets', 'Lista los datasets.'),
      read_t('get_dataset_info', 'Lee las columnas y métricas de un dataset.'),
      read_t('list_charts', 'Lista los gráficos.'),
      read_t('get_chart_info', 'Lee la configuración de un gráfico y qué se puede cambiar en él.'),
      read_t('get_chart_type_schema', 'Lee los campos que necesita un tipo de gráfico para crearse.'),
      read_t('get_chart_data', 'Lee los datos que muestra un gráfico.'),
      create_t('generate_chart', 'Crea un gráfico.'),
      update_t('update_chart', 'Cambia un gráfico guardado.'),
      update_t('add_chart_to_existing_dashboard', 'Agrega un gráfico al dashboard seleccionado.'),
      update_t('update_dashboard', 'Renombra el dashboard seleccionado o cambia su publicación.'),
      delete_t('delete_chart', 'Quita un gráfico del dashboard o lo borra definitivamente.'),
      read_t('make_image', 'Envía una imagen al usuario.'),
      read_t('search_knowledge', 'Busca en la base de conocimiento del gestor de paneles.'),
    ],
    subdomains: { general: ['advance', 'guided'] },
  },
};

const PAY_CLIENT_ID = '550e8400-e29b-41d4-a716-446655440000';

const logger = new LoggerService('permissions_seed');

async function seed() {
  await AppDataSource.initialize();
  await AppDataSource.transaction(async (manager) => {
    const servers = await manager.getRepository(ServerEntity).find();
    const serverByName = new Map(servers.map((server) => [server.serverName, server]));

    /**- 1. CATÁLOGO: herramientas, subdominios y modos por servidor */
    for (const [serverName, catalog] of Object.entries(SERVER_CATALOG)) {
      const server = serverByName.get(serverName);
      if (!server) {
        logger.warn(`Server ${serverName} does not exist: its catalog is left out`);
        continue;
      }
      await manager.getRepository(ToolEntity).upsert(
        catalog.tools.map((tool) => ({ ...tool, serverId: server.id })),
        { conflictPaths: ['serverId', 'name'], skipUpdateIfNoValuesChanged: true }
      );
      for (const [subdomainName, modes] of Object.entries(catalog.subdomains)) {
        await manager
          .getRepository(SubdomainEntity)
          .upsert({ serverId: server.id, name: subdomainName }, { conflictPaths: ['serverId', 'name'], skipUpdateIfNoValuesChanged: true });
        const subdomain = await manager.getRepository(SubdomainEntity).findOneByOrFail({ serverId: server.id, name: subdomainName });
        if (modes.length)
          await manager.getRepository(ModeEntity).upsert(
            modes.map((name) => ({ subdomainId: subdomain.id, name })),
            { conflictPaths: ['subdomainId', 'name'], skipUpdateIfNoValuesChanged: true }
          );
      }
    }

    /**- 2. CLIENTE: el cliente PAY con todo el catálogo */
    const clientServers = await manager.getRepository(ClientServerEntity).find({ where: { clientId: PAY_CLIENT_ID }, relations: { server: true } });
    for (const clientServer of clientServers) {
      const tools = await manager.getRepository(ToolEntity).findBy({ serverId: clientServer.serverId });
      if (tools.length)
        await manager.getRepository(ClientToolPermissionEntity).upsert(
          tools.map((tool) => ({ clientServerId: clientServer.id, toolId: tool.id })),
          { conflictPaths: ['clientServerId', 'toolId'], skipUpdateIfNoValuesChanged: true }
        );
      const subdomains = await manager
        .getRepository(SubdomainEntity)
        .find({ where: { serverId: clientServer.serverId }, relations: { modes: true } });
      for (const subdomain of subdomains) {
        await manager
          .getRepository(ClientSubdomainPermissionEntity)
          .upsert(
            { clientServerId: clientServer.id, subdomainId: subdomain.id },
            { conflictPaths: ['clientServerId', 'subdomainId'], skipUpdateIfNoValuesChanged: true }
          );
        const subdomainPermission = await manager
          .getRepository(ClientSubdomainPermissionEntity)
          .findOneByOrFail({ clientServerId: clientServer.id, subdomainId: subdomain.id });
        if (subdomain.modes.length)
          await manager.getRepository(ClientModePermissionEntity).upsert(
            subdomain.modes.map((mode) => ({ subdomainPermissionId: subdomainPermission.id, modeId: mode.id })),
            { conflictPaths: ['subdomainPermissionId', 'modeId'], skipUpdateIfNoValuesChanged: true }
          );
      }
    }
  });
  await AppDataSource.destroy();
}

if (require.main === module)
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
