/**
 * Seed de datos demo para el modo Docker/Postgres.
 *
 * - Se ejecuta desde el entrypoint del contenedor ANTES de arrancar la API
 *   (node dist/seed/demo-seed.js).
 * - Es IDEMPOTENTE: si la base ya tiene estudiantes, no inserta nada
 *   (correr dos veces no duplica filas).
 * - Todos los RUT son chilenos válidos (dígito verificador mod-11): los de
 *   dígitos repetidos NNNNNNNN-N cumplen el algoritmo, igual que 12345678-5.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { StudentEntity } from '../database/entities/student.entity';
import { ProfessorEntity } from '../database/entities/professor.entity';
import { SubjectEntity } from '../database/entities/subject.entity';
import { EnrollmentEntity } from '../database/entities/enrollment.entity';
import { ClassSessionEntity } from '../database/entities/class-session.entity';
import { TeachingEntity } from '../database/entities/teaching.entity';
import { AssistanceEntity } from '../database/entities/assistance.entity';
import { UserTypeOrmEntity } from '../users/infrastructure/user.typeorm.entity';
import { UserRole } from '../users/domain/user-role.enum';

async function seed(): Promise<void> {
  if (!process.env.DB_HOST) {
    console.error(
      'DB_HOST no está definido: el seed solo aplica al modo Docker/Postgres.',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const db = app.get(DataSource);

    // ── Idempotencia: si ya hay datos, no volver a sembrar ──────────────────
    const classDate = (daysAgo: number): Date =>
      new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // ── Usuarios de login (CU-01): los 4 roles + una cuenta deshabilitada ──
    await db
      .getRepository(UserTypeOrmEntity)
      .createQueryBuilder()
      .insert()
      .values([
        {
          rut: '11111111-1',
          institutionalEmail: 'ana.perez11@ufromail.cl',
          fullName: 'Ana Pérez',
          role: UserRole.ESTUDIANTE,
          status: 'ACTIVE',
        },
        {
          rut: '22222222-2',
          institutionalEmail: 'pedro.rojas22@ufromail.cl',
          fullName: 'Pedro Rojas',
          role: UserRole.PROFESOR,
          status: 'ACTIVE',
        },
        {
          rut: '33333333-3',
          institutionalEmail: 'directora33@ufromail.cl',
          fullName: 'Directora EasyCheck',
          role: UserRole.DIRECTOR_CARRERA,
          status: 'ACTIVE',
        },
        {
          rut: '44444444-4',
          institutionalEmail: 'administradora44@ufromail.cl',
          fullName: 'Administradora EasyCheck',
          role: UserRole.ADMINISTRADOR,
          status: 'ACTIVE',
        },
        {
          rut: '77777777-7',
          institutionalEmail: 'deshabilitada77@ufromail.cl',
          fullName: 'Cuenta Deshabilitada',
          role: UserRole.ESTUDIANTE,
          status: 'DISABLED',
        },
      ])
      .orIgnore()
      .execute();

    // ── Personas ────────────────────────────────────────────────────────────
    await db
      .getRepository(StudentEntity)
      .createQueryBuilder()
      .insert()
      .values([
        { rut: '11111111-1', name: 'Ana Pérez' }, // inscrita en 2 asignaturas
        { rut: '55555555-5', name: 'Bruno Soto' }, // inscrito, sin asistencias presentes
        { rut: '66666666-6', name: 'Carla Muñoz' }, // sin inscripciones
      ])
      .orIgnore()
      .execute();
    await db
      .getRepository(ProfessorEntity)
      .createQueryBuilder()
      .insert()
      .values([{ rut: '22222222-2', name: 'Pedro Rojas' }])
      .orIgnore()
      .execute();

    // ── Asignaturas y docencia ───────────────────────────────────────────────
    await db
      .getRepository(SubjectEntity)
      .createQueryBuilder()
      .insert()
      .values([
        { code: 'ICC-101', name: 'Ingeniería de Software', career: 'ICINF' },
        { code: 'ICC-202', name: 'Bases de Datos', career: 'ICINF' },
        { code: 'ICC-303', name: 'Redes de Computadores', career: 'ICINF' },
      ])
      .orIgnore()
      .execute();
    await db
      .getRepository(TeachingEntity)
      .createQueryBuilder()
      .insert()
      .values([
        { professorRut: '22222222-2', subjectId: 'ICC-101' },
        { professorRut: '22222222-2', subjectId: 'ICC-202' },
      ])
      .orIgnore()
      .execute();

    // ── Clases con registro en ambos estados (CU-06/CU-07/CU-08) ────────────
    await db
      .getRepository(ClassSessionEntity)
      .createQueryBuilder()
      .insert()
      .values([
        {
          id: 1,
          subjectId: 'ICC-101',
          date: classDate(7),
          registrationStatus: 'ENABLED',
        },
        {
          id: 2,
          subjectId: 'ICC-101',
          date: classDate(1),
          registrationStatus: 'DISABLED',
        },
        {
          id: 3,
          subjectId: 'ICC-202',
          date: classDate(3),
          registrationStatus: 'ENABLED',
        },
        {
          id: 4,
          subjectId: 'ICC-303',
          date: classDate(2),
          registrationStatus: 'ENABLED',
        },
      ])
      .orIgnore()
      .execute();

    // ── Inscripciones: Ana en 2 asignaturas, Bruno en 1, Carla en ninguna ───
    await db
      .getRepository(EnrollmentEntity)
      .createQueryBuilder()
      .insert()
      .values([
        { studentRut: '11111111-1', subjectId: 'ICC-101' },
        { studentRut: '11111111-1', subjectId: 'ICC-202' },
        { studentRut: '55555555-5', subjectId: 'ICC-101' },
      ])
      .orIgnore()
      .execute();

    // ── Asistencias: Ana presente en ambas; Bruno ausente en la clase 1 ─────
    await db
      .getRepository(AssistanceEntity)
      .createQueryBuilder()
      .insert()
      .values([
        {
          studentRut: '11111111-1',
          classId: 1,
          subjectId: 'ICC-101',
          date: classDate(7),
          present: true,
        },
        {
          studentRut: '11111111-1',
          classId: 3,
          subjectId: 'ICC-202',
          date: classDate(3),
          present: true,
        },
        {
          studentRut: '55555555-5',
          classId: 1,
          subjectId: 'ICC-101',
          date: classDate(7),
          present: false,
        },
      ])
      .orIgnore()
      .execute();

    console.log(
      '🌱 Seed completado: 5 users, 3 students, 1 professor, 3 subjects, 4 clases, 3 enrollments, 3 assistances.',
    );
  } finally {
    await app.close();
  }
}

void seed().catch((error) => {
  console.error('❌ Seed falló:', error);
  process.exit(1);
});
