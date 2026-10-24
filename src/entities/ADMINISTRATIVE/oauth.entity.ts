import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { ClientServerEntity } from './client-server.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'OAUTH', schema: 'ADMINISTRATIVE' })
export class OauthEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientServerId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  refreshToken!: string;

  @Column({ type: 'varchar' })
  accessToken!: string;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.oauth)
  @JoinColumn([{ name: 'userId', referencedColumnName: 'id' }])
  user!: UserEntity;

  @ManyToOne(() => ClientServerEntity, (clientServer) => clientServer.oauth)
  @JoinColumn({ name: 'clientServerId', referencedColumnName: 'id' })
  clientServer!: ClientServerEntity;
}
