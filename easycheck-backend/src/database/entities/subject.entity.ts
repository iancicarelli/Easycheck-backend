import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'subjects' })
export class SubjectEntity {
  @PrimaryColumn({ length: 20 })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 120 })
  career!: string;

  @Column({ type: 'varchar', length: 10, default: 'LOCAL' })
  source!: 'LOCAL' | 'INTRANET';

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  externalId!: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;
}
