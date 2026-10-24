import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ClientServerEntity } from './client-server.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'CLIENT', schema: 'ADMINISTRATIVE' })
export class ClientEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar' })
  serverName!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  botName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true, select: false })
  apiKeyHash!: string | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  apiKeyRotatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => ClientServerEntity, (clientServer) => clientServer.client)
  clientServers!: ClientServerEntity[];

  @OneToMany(() => UserEntity, (user) => user.client)
  users!: UserEntity[];
}
