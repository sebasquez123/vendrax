import { CreateDateColumn, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ClientModePermissionEntity } from './client-mode-permission.entity';
import { ClientServerEntity } from './client-server.entity';
import { SubdomainEntity } from '../METBOT/subdomain.entity';

@Entity({ name: 'CLIENT_SUBDOMAIN_PERMISSION', schema: 'ADMINISTRATIVE' })
@Unique('UQ_client_subdomain_permission_client_server_id_subdomain_id', ['clientServerId', 'subdomainId'])
export class ClientSubdomainPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientServerId!: string;

  @Column({ type: 'uuid' })
  subdomainId!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => ClientServerEntity, (clientServer) => clientServer.subdomainPermissions)
  @JoinColumn({ name: 'clientServerId', referencedColumnName: 'id' })
  clientServer!: ClientServerEntity;

  @ManyToOne(() => SubdomainEntity)
  @JoinColumn({ name: 'subdomainId', referencedColumnName: 'id' })
  subdomain!: SubdomainEntity;

  @OneToMany(() => ClientModePermissionEntity, (modePermission) => modePermission.subdomainPermission)
  modePermissions!: ClientModePermissionEntity[];
}
