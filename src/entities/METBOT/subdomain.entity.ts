import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ModeEntity } from './mode.entity';
import { ServerEntity } from '../ADMINISTRATIVE/server.entity';

/**
 * Entidad de subdominio
 * Subdominio del dominio de conocimiento de un servidor (src/knowledge), identificado por su clave: 'general', 'personas'.
 */
@Entity({ name: 'SUBDOMAIN', schema: 'METBOT' })
@Unique('UQ_subdomain_server_id_name', ['serverId', 'name'])
export class SubdomainEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  serverId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => ServerEntity, (server) => server.subdomains)
  @JoinColumn({ name: 'serverId', referencedColumnName: 'id' })
  server!: ServerEntity;

  @OneToMany(() => ModeEntity, (mode) => mode.subdomain)
  modes!: ModeEntity[];
}
