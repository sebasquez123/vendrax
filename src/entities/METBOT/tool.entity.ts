import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ServerEntity } from '../ADMINISTRATIVE/server.entity';

export enum ToolType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Entidad de herramienta
 * Herramienta que ofrece un servidor, con el nombre con que el sistema la registra; se otorga a clientes y usuarios.
 */
@Entity({ name: 'TOOL', schema: 'METBOT' })
@Unique('UQ_tool_server_id_name', ['serverId', 'name'])
export class ToolEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  serverId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  type!: ToolType;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => ServerEntity, (server) => server.tools)
  @JoinColumn({ name: 'serverId', referencedColumnName: 'id' })
  server!: ServerEntity;
}
