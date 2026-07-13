import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialIntegratedSchema1760000000000 implements MigrationInterface {
  name = 'InitialIntegratedSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`DO $$ BEGIN
      ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'ADMINISTRADOR';
    EXCEPTION WHEN undefined_object THEN NULL; END $$`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "rut" varchar(12) NOT NULL UNIQUE,
      "institutionalEmail" varchar(120) NOT NULL, "fullName" varchar(120) NOT NULL,
      "role" varchar(30) NOT NULL, "status" varchar(10) NOT NULL DEFAULT 'ACTIVE',
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "students" (
      "rut" varchar(12) PRIMARY KEY, "name" varchar(120) NOT NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "professors" (
      "rut" varchar(12) PRIMARY KEY, "name" varchar(120) NOT NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "subjects" (
      "code" varchar(20) PRIMARY KEY, "name" varchar(120) NOT NULL,
      "career" varchar(120) NOT NULL, "source" varchar(10) NOT NULL DEFAULT 'LOCAL',
      "external_id" varchar(80), "last_synced_at" timestamptz)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "class_sessions" (
      "id" integer PRIMARY KEY, "subjectId" varchar(20) NOT NULL, "date" timestamptz NOT NULL,
      "registrationStatus" varchar(10) NOT NULL DEFAULT 'ENABLED',
      "editingStatus" varchar(10) NOT NULL DEFAULT 'DISABLED')`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "enrollments" (
      "id" SERIAL PRIMARY KEY, "studentRut" varchar(12) NOT NULL,
      "subjectId" varchar(20) NOT NULL, UNIQUE ("studentRut", "subjectId"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "teachings" (
      "id" SERIAL PRIMARY KEY, "professorRut" varchar(12) NOT NULL,
      "subjectId" varchar(20) NOT NULL, UNIQUE ("professorRut", "subjectId"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assistances" (
      "id" SERIAL PRIMARY KEY, "studentRut" varchar(12) NOT NULL, "classId" integer NOT NULL,
      "subjectId" varchar(20) NOT NULL, "date" timestamptz NOT NULL, "present" boolean NOT NULL,
      UNIQUE ("studentRut", "classId"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "used_qr_nonces" (
      "nonce" varchar(36) PRIMARY KEY, "used_at" timestamptz NOT NULL)`);

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(10) NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "source" varchar(10) NOT NULL DEFAULT 'LOCAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "external_id" varchar(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "editingStatus" varchar(10) NOT NULL DEFAULT 'DISABLED'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_class_subject" ON "class_sessions" ("subjectId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_assistance_subject" ON "assistances" ("subjectId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'used_qr_nonces',
      'assistances',
      'teachings',
      'enrollments',
      'class_sessions',
      'subjects',
      'professors',
      'students',
      'users',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  }
}
