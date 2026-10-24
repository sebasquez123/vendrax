import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ServerAuthEntity } from './server-auth.entity';

@Entity({ name: 'OAUTH_MCP_AUTH', schema: 'ADMINISTRATIVE' })
@Unique('UQ_oauth_mcp_auth_server_auth_id', ['serverAuthId'])
export class oauthMcpAuthEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  serverAuthId!: string;

  @Column({ type: 'varchar' })
  schema!: string;

  @Column({ type: 'varchar' })
  mcpEndpoint!: string;

  @Column({ type: 'varchar' })
  authEndpoint!: string;

  @Column({ type: 'varchar' })
  refreshEndpoint!: string;

  @Column({ type: 'varchar' })
  username!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @OneToOne(() => ServerAuthEntity, (serverAuth) => serverAuth.oauthMcpAuth)
  @JoinColumn([{ name: 'serverAuthId', referencedColumnName: 'id' }])
  ServerAuth!: ServerAuthEntity;
}
