/**
 * ============================================================
 *  EasyCheck — Integration Tests (Foro 7)
 *  Strategy: Bottom-Up
 *  Members: Francisca Neira, Ian Cicarelli
 * ============================================================
 *
 *  Level 3 — AssistanceService ↔ DataRepository (in-memory)
 *  Level 4 — AssistanceController ↔ AssistanceService (HTTP via supertest)
 *
 *  Covered cases:
 *   IT-1  Show student assistance      — success flow
 *   IT-2  Show student assistance      — student not found (404)
 *   IT-3  Verify assistance via QR     — successful registration (201)
 *   IT-4  Verify assistance via QR     — registration disabled (409)
 *   IT-5  Show subject assistance      — success flow (professor)
 *   IT-6  Show subject assistance      — professor without subject (404)
 *   IT-7  Attendance by RUT (CU-03)    — success (200), invalid rut (400),
 *                                        student not found (404), role (403)
 *   IT-8  Disable registration (CU-07) — success (200), no permission (404),
 *                                        already disabled (409)
 *   IT-9  Enable registration (CU-08)  — success (200), already enabled (409)
 *   IT-10 Edit assistance (CU-08)      — success (200), record not found (404)
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AssistanceModule } from '../../../src/assistance/Assistance.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { READER_HEADERS, seedAccount } from '../../SHARED/security-fixtures';

// ─── Typed response shapes (supertest exposes res.body as `any`) ───────────────

interface StudentAssistanceResponse {
  studentRut: string;
  subjectId: string;
  records: unknown[];
  totalClasses: number;
  classesAttended: number;
  assistancePercentage: number;
}

interface RegisterResponse {
  message: string;
  recordId: number;
  studentRut: string;
  classId: number;
}

interface SubjectStudentRow {
  rut: string;
  name: string;
  classesAttended: number;
  totalClasses: number;
  assistancePercentage: number;
}

interface ErrorResponse {
  error?: string;
  rut?: string;
  classId?: number;
  professorRut?: string;
  subjectCode?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApp(): Promise<{
  app: INestApplication<App>;
  repo: DataRepository;
  users: InMemoryUsersRepository;
}> {
  return Test.createTestingModule({ imports: [AssistanceModule] })
    .compile()
    .then(async (moduleRef: TestingModule) => {
      const app = moduleRef.createNestApplication<INestApplication<App>>();
      // Simulates the auth middleware that in production would populate
      // req.user; the role comes from the 'x-user-role' test header so the
      // guards (e.g. DirectorOrAdminGuard) can be exercised end-to-end.
      app.use(
        (
          req: { headers: Record<string, unknown>; user?: { role: string } },
          _res: unknown,
          next: () => void,
        ) => {
          const role = req.headers['x-user-role'];
          if (typeof role === 'string') {
            req.user = { role };
          }
          next();
        },
      );
      await app.init();
      const repo = moduleRef.get<DataRepository>(DataRepository);
      const users = moduleRef.get(InMemoryUsersRepository);
      return { app, repo, users };
    });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('EasyCheck — Integration Tests (Bottom-Up)', () => {
  let app: INestApplication<App>;
  let repo: DataRepository;
  let users: InMemoryUsersRepository;

  beforeAll(async () => {
    ({ app, repo, users } = await buildApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    repo.reset();
    users.reset();
    await seedAccount(users, '12345678-9', UserRole.ESTUDIANTE);
    await seedAccount(users, '33333333-3', UserRole.DIRECTOR_CARRERA);
    await seedAccount(users, '44444444-4', UserRole.ADMINISTRADOR);
    await seedAccount(users, '11111111-1', UserRole.PROFESOR);
    await seedAccount(users, '22222222-2', UserRole.PROFESOR);
    await seedAccount(users, '98765432-1', UserRole.PROFESOR);
    await seedAccount(users, '55555555-5', UserRole.ESTUDIANTE);
  });

  // ===========================================================================
  // IT-1 — Show student assistance: success flow
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-1 — Show student assistance: success flow', () => {
    /**
     * Precondition:
     *  - DB contains student RUT 12345678-9 enrolled in ASG-01
     *  - 10 assistance records exist (all present)
     * Input: GET /api/v1/students/12345678-9/assistance?subject=ASG-01
     */
    it('should return HTTP 200 with 10 records and assistancePercentage', async () => {
      // ── Fixture (Level 1 — data in "DB") ──
      repo.seedStudent('12345678-9', 'Ana García');
      for (let i = 1; i <= 10; i++) {
        repo.seedAssistance({
          id: i,
          studentRut: '12345678-9',
          classId: i,
          subjectId: 'ASG-01',
          date: new Date(),
          present: true,
        });
      }

      // ── HTTP invocation (Level 4) ──
      const res = await request(app.getHttpServer())
        .get('/api/v1/students/12345678-9/assistance')
        .set('authorization', 'Bearer mock-token-12345678-9-estudiante')
        .query({ subject: 'ASG-01' });
      const body = res.body as StudentAssistanceResponse;

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.OK);
      expect(body.studentRut).toBe('12345678-9');
      expect(body.subjectId).toBe('ASG-01');
      expect(body.records).toHaveLength(10);
      expect(body.assistancePercentage).toBe(100);
      expect(body).toHaveProperty('classesAttended');
      expect(body).toHaveProperty('totalClasses');

      // ── Assert on DB state ──
      const inDb = await repo.findAssistancesByStudentAndSubject(
        '12345678-9',
        'ASG-01',
      );
      expect(inDb).toHaveLength(10);
    });
  });

  // ===========================================================================
  // IT-2 — Show student assistance: student not found (404)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-2 — Show student assistance: student not found (404)', () => {
    /**
     * Precondition: DB does NOT contain RUT 1111111-1
     * Input: GET /api/v1/students/1111111-1/assistance?subject=ASG-01
     */
    it('should return HTTP 404 with error message and the involved rut', async () => {
      // No student is seeded — simulates a non-existent RUT

      const res = await request(app.getHttpServer())
        .get('/api/v1/students/1111111-1/assistance')
        .set('authorization', 'Bearer mock-token-33333333-3-director')
        .query({ subject: 'ASG-01' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        error: 'Student not found',
        rut: '1111111-1',
      });

      // ── Assert DB was not modified ──
      const inDb = await repo.findAssistancesByStudentAndSubject(
        '1111111-1',
        'ASG-01',
      );
      expect(inDb).toHaveLength(0);
    });
  });

  // ===========================================================================
  // IT-3 — Verify assistance via QR: successful registration (201)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-3 — Verify assistance via QR: successful registration', () => {
    /**
     * Precondition:
     *  - DB contains class id=42, ASG-01, status=ENABLED
     *  - Student 12345678-9 enrolled in ASG-01
     *  - No previous assistance record for that class
     * Input: POST /api/v1/assistance/register { valid qrSignature }
     */
    it('should return HTTP 201 with confirmation and insert the record in DB', async () => {
      // ── Fixture ──
      repo.seedStudent('12345678-9', 'Ana García');
      repo.seedEnrollment('12345678-9', 'ASG-01');
      repo.seedClass({
        id: 42,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });

      const generated = await request(app.getHttpServer())
        .post('/api/v1/students/me/classes/42/qr')
        .set('authorization', 'Bearer mock-token-12345678-9-estudiante')
        .expect(HttpStatus.CREATED);
      const generatedBody = generated.body as { qrToken: string };
      const payload = { qrToken: generatedBody.qrToken };

      // ── HTTP invocation ──
      const res = await request(app.getHttpServer())
        .post('/api/v1/assistance/register')
        .set(READER_HEADERS)
        .send(payload);
      const body = res.body as RegisterResponse;

      // ── HTTP asserts ──
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(body.message).toBe('Assistance registered successfully');
      expect(body.studentRut).toBe('12345678-9');
      expect(body.classId).toBe(42);
      expect(body).toHaveProperty('recordId');

      // ── Assert on DB state (side effect) ──
      const registered = await repo.assistanceExists('12345678-9', 42);
      expect(registered).toBe(true);
    });
  });

  // ===========================================================================
  // IT-4 — Verify assistance via QR: registration disabled (409)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-4 — Verify assistance via QR: registration disabled (409)', () => {
    /**
     * Precondition:
     *  - DB contains class id=55 with status=DISABLED
     *  - Student 12345678-9 enrolled
     * Input: POST /api/v1/assistance/register { classId: 55 }
     */
    it('should return HTTP 409 Conflict when class registration is disabled', async () => {
      repo.seedStudent('12345678-9', 'Ana García');
      repo.seedEnrollment('12345678-9', 'ASG-01');
      repo.seedClass({
        id: 55,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });

      const generated = await request(app.getHttpServer())
        .post('/api/v1/students/me/classes/55/qr')
        .set('authorization', 'Bearer mock-token-12345678-9-estudiante')
        .expect(HttpStatus.CREATED);
      await repo.updateClassRegistrationStatus(55, 'DISABLED');
      const generatedBody = generated.body as { qrToken: string };
      const payload = { qrToken: generatedBody.qrToken };

      const res = await request(app.getHttpServer())
        .post('/api/v1/assistance/register')
        .set(READER_HEADERS)
        .send(payload);
      const body = res.body as ErrorResponse;

      // ── HTTP asserts ──
      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(body).toMatchObject({ classId: 55 });

      // ── Assert DB — no record was inserted ──
      const registered = await repo.assistanceExists('12345678-9', 55);
      expect(registered).toBe(false);
    });
  });

  // ===========================================================================
  // IT-5 — Show subject students assistance: success flow (professor)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-5 — Show subject students assistance: success flow', () => {
    /**
     * Precondition:
     *  - Professor 98765432-1 is assigned to INF-301
     *  - 3 enrolled students: RUT-A, RUT-B, RUT-C
     *  - 5 classes held with assistance for each student
     * Input: GET /api/v1/professors/98765432-1/subjects/INF-301/assistance
     */
    it('should return HTTP 200 with an array of 3 students with assistancePercentage', async () => {
      // ── Fixture ──
      repo.seedTeaching('98765432-1', 'INF-301');
      const students = [
        { rut: 'RUT-A', name: 'Carlos López' },
        { rut: 'RUT-B', name: 'María Pérez' },
        { rut: 'RUT-C', name: 'Juan Silva' },
      ];
      students.forEach((s) => {
        repo.seedStudent(s.rut, s.name);
        repo.seedEnrollment(s.rut, 'INF-301');
      });

      for (let i = 1; i <= 5; i++) {
        repo.seedClass({
          id: 100 + i,
          subjectId: 'INF-301',
          date: new Date(),
          registrationStatus: 'ENABLED',
        });
        students.forEach((s, idx) => {
          repo.seedAssistance({
            id: i * 10 + idx,
            studentRut: s.rut,
            classId: 100 + i,
            subjectId: 'INF-301',
            date: new Date(),
            present: true,
          });
        });
      }

      // ── HTTP invocation ──
      const res = await request(app.getHttpServer())
        .get('/api/v1/professors/98765432-1/subjects/INF-301/assistance')
        .set('authorization', 'Bearer mock-token-98765432-1-profesor');
      const body = res.body as SubjectStudentRow[];

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.OK);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);

      body.forEach((student) => {
        expect(student).toHaveProperty('rut');
        expect(student).toHaveProperty('name');
        expect(student).toHaveProperty('classesAttended');
        expect(student).toHaveProperty('assistancePercentage');
        expect(student.classesAttended).toBe(5);
        expect(student.assistancePercentage).toBe(100);
      });

      // ── Assert DB ──
      const assistance = await repo.findStudentsAssistanceBySubject('INF-301');
      expect(assistance).toHaveLength(3);
    });
  });

  // ===========================================================================
  // IT-6 — Show subject assistance: professor without subject (404)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-6 — Show subject assistance: professor without subject (404)', () => {
    /**
     * Precondition:
     *  - DB contains professor 11111111-1 but WITHOUT subject INF-999 assigned
     * Input: GET /api/v1/professors/11111111-1/subjects/INF-999/assistance
     */
    it('should return HTTP 404 when the professor is not assigned to the subject', async () => {
      // No teaching is seeded for this professor/subject

      const res = await request(app.getHttpServer())
        .get('/api/v1/professors/11111111-1/subjects/INF-999/assistance')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor');
      const body = res.body as ErrorResponse;

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        professorRut: '11111111-1',
        subjectCode: 'INF-999',
      });
    });
  });

  // ===========================================================================
  // IT-7 — CU-03: Attendance by RUT (director/admin)
  // Integration: DirectorOrAdminGuard ↔ AssistanceController ↔ Service ↔ Repo
  // ===========================================================================
  describe('IT-7 — Attendance by RUT (CU-03)', () => {
    /**
     * Precondition:
     *  - Student 12345678-5 (valid mod-11 RUT) enrolled in ASG-01
     *  - 2 classes for ASG-01, 1 attended
     * Input: GET /api/v1/students/12345678-5/attendance (role: director)
     */
    it('should return HTTP 200 with attendance per enrolled subject', async () => {
      // ── Fixture ──
      repo.seedStudent('12345678-5', 'Ana García');
      repo.seedEnrollment('12345678-5', 'ASG-01');
      repo.seedClass({
        id: 1,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
      repo.seedClass({
        id: 2,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
      repo.seedAssistance({
        id: 1,
        studentRut: '12345678-5',
        classId: 1,
        subjectId: 'ASG-01',
        date: new Date(),
        present: true,
      });

      // ── HTTP invocation ──
      const res = await request(app.getHttpServer())
        .get('/api/v1/students/12345678-5/attendance')
        .set('authorization', 'Bearer mock-token-33333333-3-director');

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual([
        {
          subjectName: 'ASG-01',
          attendedClasses: 1,
          totalClasses: 2,
          attendancePercentage: 50,
        },
      ]);
    });

    it('should return HTTP 400 when the RUT is invalid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students/rut-invalido/attendance')
        .set('authorization', 'Bearer mock-token-44444444-4-administrador');
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        error: 'El RUT ingresado no es válido. Ingrese el RUT nuevamente.',
        rut: 'rut-invalido',
      });
    });

    it('should return HTTP 404 when the student does not exist', async () => {
      // 11111111-1 is a valid mod-11 RUT, but no student is seeded
      const res = await request(app.getHttpServer())
        .get('/api/v1/students/11111111-1/attendance')
        .set('authorization', 'Bearer mock-token-33333333-3-director');
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        error: 'Student not found',
        rut: '11111111-1',
      });
    });

    it('should return HTTP 403 for roles other than director/administrador', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students/12345678-5/attendance')
        .set('authorization', 'Bearer mock-token-55555555-5-estudiante');

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ===========================================================================
  // IT-8 — CU-07: Disable assistance registration (professor)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-8 — Disable registration (CU-07)', () => {
    /**
     * Precondition:
     *  - Class id=7 for ASG-01 with status=ENABLED
     *  - Professor 11111111-1 teaches ASG-01
     * Input: PATCH /api/v1/professors/11111111-1/classes/7/registration
     *        { "status": "DISABLED" }
     */
    it('should return HTTP 200 and persist registrationStatus=DISABLED', async () => {
      // ── Fixture ──
      repo.seedClass({
        id: 7,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
      repo.seedTeaching('11111111-1', 'ASG-01');

      // ── HTTP invocation ──
      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/classes/7/registration')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ status: 'DISABLED' });

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual({
        message: 'Registration disabled successfully',
        classId: 7,
        registrationStatus: 'DISABLED',
      });

      // ── Assert on DB state (side effect) ──
      const inDb = await repo.findClass(7);
      expect(inDb?.registrationStatus).toBe('DISABLED');
    });

    it('should return HTTP 404 when the professor does not teach the subject', async () => {
      repo.seedClass({
        id: 7,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
      // No teaching seeded for this professor

      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/22222222-2/classes/7/registration')
        .set('authorization', 'Bearer mock-token-22222222-2-profesor')
        .send({ status: 'DISABLED' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        professorRut: '22222222-2',
        subjectCode: 'ASG-01',
      });

      // ── Assert DB was not modified ──
      const inDb = await repo.findClass(7);
      expect(inDb?.registrationStatus).toBe('ENABLED');
    });

    it('should return HTTP 409 when registration is already disabled', async () => {
      repo.seedClass({
        id: 7,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'DISABLED',
      });
      repo.seedTeaching('11111111-1', 'ASG-01');

      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/classes/7/registration')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ status: 'DISABLED' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(body).toMatchObject({ classId: 7 });
    });
  });

  // ===========================================================================
  // IT-9 — CU-08: Enable assistance registration (professor)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-9 — Enable registration (CU-08)', () => {
    it('should return HTTP 200 and persist registrationStatus=ENABLED', async () => {
      repo.seedClass({
        id: 8,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'DISABLED',
      });
      repo.seedTeaching('11111111-1', 'ASG-01');

      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/classes/8/registration')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ status: 'ENABLED' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual({
        message: 'Registration enabled successfully',
        classId: 8,
        registrationStatus: 'ENABLED',
      });

      const inDb = await repo.findClass(8);
      expect(inDb?.registrationStatus).toBe('ENABLED');
    });

    it('should return HTTP 409 when registration is already enabled', async () => {
      repo.seedClass({
        id: 8,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
      repo.seedTeaching('11111111-1', 'ASG-01');

      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/classes/8/registration')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ status: 'ENABLED' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(body).toMatchObject({ classId: 8 });
    });
  });

  // ===========================================================================
  // IT-10 — CU-08: Edit a student's assistance record (professor)
  // Integration: AssistanceController ↔ AssistanceService ↔ DataRepository
  // ===========================================================================
  describe('IT-10 — Edit assistance record (CU-08)', () => {
    /**
     * Precondition:
     *  - Assistance record id=10 (present=true) for ASG-01
     *  - Professor 11111111-1 teaches ASG-01
     * Input: PATCH /api/v1/professors/11111111-1/assistance/10
     *        { "present": false }
     */
    it('should return HTTP 200 and persist the new presence value', async () => {
      // ── Fixture ──
      repo.seedClass({
        id: 1,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'DISABLED',
        editingStatus: 'ENABLED',
      });
      repo.seedAssistance({
        id: 10,
        studentRut: '12345678-5',
        classId: 1,
        subjectId: 'ASG-01',
        date: new Date(),
        present: true,
      });
      repo.seedTeaching('11111111-1', 'ASG-01');

      // ── HTTP invocation ──
      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/assistance/10')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ present: false });

      // ── Asserts ──
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toEqual({
        message: 'Assistance record updated successfully',
        recordId: 10,
        studentRut: '12345678-5',
        present: false,
      });

      // ── Assert on DB state (side effect) ──
      const inDb = await repo.findAssistanceById(10);
      expect(inDb?.present).toBe(false);
    });

    it('should return HTTP 404 when the assistance record does not exist', async () => {
      repo.seedTeaching('11111111-1', 'ASG-01');

      const res = await request(app.getHttpServer())
        .patch('/api/v1/professors/11111111-1/assistance/999')
        .set('authorization', 'Bearer mock-token-11111111-1-profesor')
        .send({ present: true });

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.body).toMatchObject({ recordId: 999 });
    });
  });
});
