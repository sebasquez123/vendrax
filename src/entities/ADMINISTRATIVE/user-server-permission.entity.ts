import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ClientServerEntity } from './client-server.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'USER_SERVER_PERMISSION', schema: 'ADMINISTRATIVE' })
@Unique('UQ_user_server_permission_user_id_client_server_id', ['userId', 'clientServerId'])
export class UserServerPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  clientServerId!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  @ManyToOne(() => ClientServerEntity)
  @JoinColumn({ name: 'clientServerId', referencedColumnName: 'id' })
  clientServer!: ClientServerEntity;
}
