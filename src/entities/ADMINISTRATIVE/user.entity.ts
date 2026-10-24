import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { OauthEntity } from './oauth.entity';
import { ClientEntity } from './client.entity';
import { UserToolPermissionEntity } from './user-tool-permission.entity';

@Entity({ name: 'USER', schema: 'ADMINISTRATIVE' })
@Unique('UQ_user_user_id_client_id', ['userId', 'clientId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  userId!: number;

  @Column({ type: 'uuid' })
  clientId!: string;

  @Column({ type: 'varchar', nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'boolean', nullable: true })
  status!: boolean | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @OneToMany(() => OauthEntity, (oauth) => oauth.user)
  oauth!: OauthEntity[];

  @ManyToOne(() => ClientEntity, (client) => client.users)
  @JoinColumn({ name: 'clientId', referencedColumnName: 'id' })
  client!: ClientEntity;

  @OneToMany(() => UserToolPermissionEntity, (permission) => permission.user)
  toolPermissions!: UserToolPermissionEntity[];
}
