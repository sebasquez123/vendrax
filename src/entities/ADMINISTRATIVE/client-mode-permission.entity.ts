import { CreateDateColumn, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ClientSubdomainPermissionEntity } from './client-subdomain-permission.entity';
import { ModeEntity } from '../METBOT/mode.entity';

@Entity({ name: 'CLIENT_MODE_PERMISSION', schema: 'ADMINISTRATIVE' })
@Unique('UQ_client_mode_permission_subdomain_permission_id_mode_id', ['subdomainPermissionId', 'modeId'])
export class ClientModePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subdomainPermissionId!: string;

  @Column({ type: 'uuid' })
  modeId!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => ClientSubdomainPermissionEntity, (subdomainPermission) => subdomainPermission.modePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subdomainPermissionId', referencedColumnName: 'id' })
  subdomainPermission!: ClientSubdomainPermissionEntity;

  @ManyToOne(() => ModeEntity)
  @JoinColumn({ name: 'modeId', referencedColumnName: 'id' })
  mode!: ModeEntity;
}
