import { CreateDateColumn, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ToolEntity } from '../METBOT/tool.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'USER_TOOL_PERMISSION', schema: 'ADMINISTRATIVE' })
@Unique('UQ_user_tool_permission_user_id_tool_id', ['userId', 'toolId'])
export class UserToolPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  toolId!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.toolPermissions)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  @ManyToOne(() => ToolEntity)
  @JoinColumn({ name: 'toolId', referencedColumnName: 'id' })
  tool!: ToolEntity;
}
