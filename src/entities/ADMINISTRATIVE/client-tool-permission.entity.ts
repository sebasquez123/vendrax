import { CreateDateColumn, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ClientServerEntity } from './client-server.entity';
import { ToolEntity } from '../METBOT/tool.entity';

@Entity({ name: 'CLIENT_TOOL_PERMISSION', schema: 'ADMINISTRATIVE' })
@Unique('UQ_client_tool_permission_client_server_id_tool_id', ['clientServerId', 'toolId'])
export class ClientToolPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientServerId!: string;

  @Column({ type: 'uuid' })
  toolId!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => ClientServerEntity, (clientServer) => clientServer.toolPermissions)
  @JoinColumn({ name: 'clientServerId', referencedColumnName: 'id' })
  clientServer!: ClientServerEntity;

  @ManyToOne(() => ToolEntity)
  @JoinColumn({ name: 'toolId', referencedColumnName: 'id' })
  tool!: ToolEntity;
}
