import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ClientEntity } from '../ADMINISTRATIVE/client.entity';
import { UserEntity } from '../ADMINISTRATIVE/user.entity';

@Entity({ name: 'AGENT_FEEDBACK', schema: 'AUDITORY' })
export class AgentFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @Column({ type: 'integer' })
  platformUserId!: number;

  @Column({ type: 'varchar', nullable: true })
  userName!: string | null;

  @Column({ type: 'varchar' })
  clientName!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  conversation!: unknown;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  @ManyToOne(() => ClientEntity)
  @JoinColumn({ name: 'clientId', referencedColumnName: 'id' })
  client!: ClientEntity;
}
