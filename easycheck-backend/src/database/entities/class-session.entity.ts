import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export type RegistrationStatus = 'ENABLED' | 'DISABLED';

// Refleja la forma de `ClassSession` en Data.repository.ts:
// { id, subjectId, date, registrationStatus }.
// El id NO es autogenerado: los fixtures y el seed asignan ids explícitos
// (igual que hace `seedClass` en el repositorio in-memory).
@Entity({ name: 'class_sessions' })
export class ClassSessionEntity {
  @PrimaryColumn()
  id!: number;

  @Index()
  @Column({ length: 20 })
  subjectId!: string;

  @Column({ type: 'timestamptz' })
  date!: Date;

  // Enum nativo de Postgres, como pide el modelo de CU-07/CU-08.
  @Column({
    type: 'enum',
    enum: ['ENABLED', 'DISABLED'],
    default: 'ENABLED',
  })
  registrationStatus!: RegistrationStatus;

  @Column({
    type: 'enum',
    enum: ['ENABLED', 'DISABLED'],
    default: 'DISABLED',
  })
  editingStatus!: RegistrationStatus;
}
