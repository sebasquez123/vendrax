import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ClientServerEntity } from './client-server.entity';
import { ServerAuthEntity } from './server-auth.entity';
import { SubdomainEntity } from '../METBOT/subdomain.entity';
import { ToolEntity } from '../METBOT/tool.entity';

export enum ServerType {
  MCP = 'mcp',
  API = 'api',
}

export enum AuthType {
  OAUTH = 'oauth',
  JWT = 'token',
}

export enum ServerAdapters {
  pms_api = 'pms_api',
  pay_api = 'pay_api',
  superset_mcp = 'superset_mcp',
  google_workspace_mcp = 'google_workspace_mcp',
}

@Entity({ name: 'SERVER', schema: 'ADMINISTRATIVE' })
export class ServerEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar' })
  transport!: string;

  @Column({ type: 'varchar' })
  serverName!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => ClientServerEntity, (clientServer) => clientServer.server)
  clientServers!: ClientServerEntity[];

  @OneToOne(() => ServerAuthEntity, (serverAuth) => serverAuth.server)
  serverAuth!: ServerAuthEntity;

  @OneToMany(() => ToolEntity, (tool) => tool.server)
  tools!: ToolEntity[];

  @OneToMany(() => SubdomainEntity, (subdomain) => subdomain.server)
  subdomains!: SubdomainEntity[];
}
