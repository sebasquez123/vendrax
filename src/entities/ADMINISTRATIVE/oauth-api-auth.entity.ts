import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ServerAuthEntity } from './server-auth.entity';

@Entity({ name: 'OAUTH_API_AUTH', schema: 'ADMINISTRATIVE' })
@Unique('UQ_oauth_api_auth_server_auth_id', ['serverAuthId'])
export class oauthApiAuthEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  serverAuthId!: string;

  @Column({ type: 'varchar' })
  schema!: string;

  @Column({ type: 'varchar' })
  client!: string;

  @Column({ type: 'varchar' })
  authEndpoint!: string;

  @Column({ type: 'varchar' })
  refreshEndpoint!: string;

  @Column({ type: 'varchar' })
  redirectUrl!: string;

  @Column({ type: 'varchar' })
  clientSecret!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @OneToOne(() => ServerAuthEntity, (serverAuth) => serverAuth.oauthApiAuth)
  @JoinColumn([{ name: 'serverAuthId', referencedColumnName: 'id' }])
  ServerAuth!: ServerAuthEntity;
}
