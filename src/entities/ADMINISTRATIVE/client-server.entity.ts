import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ClientEntity } from './client.entity';
import { ClientSubdomainPermissionEntity } from './client-subdomain-permission.entity';
import { ClientToolPermissionEntity } from './client-tool-permission.entity';
import { OauthEntity } from './oauth.entity';
import { ServerEntity } from './server.entity';

@Entity({ name: 'CLIENT_SERVER', schema: 'ADMINISTRATIVE' })
@Unique('UQ_client_server_server_id_client_id', ['serverId', 'clientId'])
export class ClientServerEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  serverId!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => ServerEntity, (server) => server.clientServers)
  @JoinColumn({ name: 'serverId', referencedColumnName: 'id' })
  server!: ServerEntity;

  @ManyToOne(() => ClientEntity, (client) => client.clientServers)
  @JoinColumn({ name: 'clientId', referencedColumnName: 'id' })
  client!: ClientEntity;

  @OneToMany(() => OauthEntity, (oauth) => oauth.clientServer)
  oauth!: OauthEntity[];

  @OneToMany(() => ClientToolPermissionEntity, (permission) => permission.clientServer)
  toolPermissions!: ClientToolPermissionEntity[];

  @OneToMany(() => ClientSubdomainPermissionEntity, (permission) => permission.clientServer)
  subdomainPermissions!: ClientSubdomainPermissionEntity[];
}
