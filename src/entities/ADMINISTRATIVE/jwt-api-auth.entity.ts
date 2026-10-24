import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ServerAuthEntity } from './server-auth.entity';

@Entity({ name: 'JWT_API_AUTH', schema: 'ADMINISTRATIVE' })
@Unique('UQ_jwt_api_auth_server_auth_id', ['serverAuthId'])
export class jwtApiAuthEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  serverAuthId!: string;

  @Column({ type: 'varchar' })
  schema!: string;

  @Column({ type: 'varchar' })
  authEndpoint!: string;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @OneToOne(() => ServerAuthEntity, (serverAuth) => serverAuth.jwtApiAuth)
  @JoinColumn([{ name: 'serverAuthId', referencedColumnName: 'id' }])
  ServerAuth!: ServerAuthEntity;
}
