import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ServerEntity } from './server.entity';
import { oauthMcpAuthEntity } from './oauth-mcp-auth.entity';
import { oauthApiAuthEntity } from './oauth-api-auth.entity';
import { jwtMcpAuthEntity } from './jwt-mcp-auth.entity';
import { jwtApiAuthEntity } from './jwt-api-auth.entity';

@Entity({ name: 'SERVER_AUTH', schema: 'ADMINISTRATIVE' })
@Unique('UQ_server_auth_server_id', ['serverId'])
export class ServerAuthEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  serverId!: string;

  @Column({ type: 'varchar' })
  serverType!: string;

  @Column({ type: 'varchar' })
  authType!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @OneToOne(() => ServerEntity, (server) => server.serverAuth)
  @JoinColumn([{ name: 'serverId', referencedColumnName: 'id' }])
  server!: ServerEntity;

  @OneToOne(() => oauthMcpAuthEntity, (oauthMcpAuth) => oauthMcpAuth.ServerAuth)
  oauthMcpAuth!: oauthMcpAuthEntity;

  @OneToOne(() => oauthApiAuthEntity, (oauthApiAuth) => oauthApiAuth.ServerAuth)
  oauthApiAuth!: oauthApiAuthEntity;

  @OneToOne(() => jwtMcpAuthEntity, (jwtMcpAuth) => jwtMcpAuth.ServerAuth)
  jwtMcpAuth!: jwtMcpAuthEntity;

  @OneToOne(() => jwtApiAuthEntity, (jwtApiAuth) => jwtApiAuth.ServerAuth)
  jwtApiAuth!: jwtApiAuthEntity;
}
