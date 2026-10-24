import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { SubdomainEntity } from './subdomain.entity';

/**
 * Entidad de modo
 * Forma de trabajo dentro de un subdominio, identificada por su clave: 'advance', 'guided'.
 */
@Entity({ name: 'MODE', schema: 'METBOT' })
@Unique('UQ_mode_subdomain_id_name', ['subdomainId', 'name'])
export class ModeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  subdomainId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 3, nullable: true })
  updatedAt!: Date | null;

  @ManyToOne(() => SubdomainEntity, (subdomain) => subdomain.modes)
  @JoinColumn({ name: 'subdomainId', referencedColumnName: 'id' })
  subdomain!: SubdomainEntity;
}
