/**
 * ============================================================
 *  EasyCheck — Integration Tests (Foro 7)
 *  Strategy: Bottom-Up
 *  Members: Francisca Neira, Ian Cicarelli
 * ============================================================
 *
 *  Complementa Assistance.integration.spec.ts (IT-1..IT-10) cubriendo los
 *  casos de uso que faltaban con pruebas de integración:
 *
 *  Level 3 — Service ↔ Repository (in-memory)
 *  Level 4 — Controller ↔ Service (HTTP via supertest)
 *
 *  Covered cases:
 *   IT-11 Login (CU-01)          — éxito estudiante/profesor (200),
 *                                  campos vacíos (400), formato de RUT (400),
 *                                  cuenta deshabilitada (403),
 *                                  credenciales incorrectas (401)
 *   IT-12 Register user (CU-02)  — éxito (201), duplicado (409),
 *                                  no pertenece a la universidad (404),
 *                                  credenciales institucionales inválidas (400),
 *                                  rol no permitido (400), formato de RUT (400)
 *   IT-13 Create subject (CU-09) — éxito (201), sin token (401),
 *                                  rol no autorizado (403), código duplicado (409),
 *                                  campos faltantes (400), caracteres inválidos (400)
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AuthModule } from '../../../src/auth/Auth.module';
import { AuthRepository } from '../../../src/auth/Auth.repository';
import { UsersModule } from '../../../src/users/users.module';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { SubjectModule } from '../../../src/subject/Subject.module';
import { SubjectRepository } from '../../../src/subject/Subject.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { seedAccount } from '../../SHARED/security-fixtures';

const ADMIN_AUTHORIZATION = 'Bearer mock-token-44444444-4-administrador';

// ─── Typed response shapes (supertest exposes res.body as `any`) ───────────────

interface LoginResponse {
  token: string;
  user: {
    rut: string;
    fullName: string;
    email: string;
    role: string;
  };
  role: string;
  redirectUrl: string;
}

interface RegisterUserResponse {
  id: string;
  rut: string;
  institutionalEmail: string;
  fullName: string;
  role: string;
  createdAt: string;
}

interface CreateSubjectResponse {
  message: string;
  subject: { code: string; name: string; career: string };
}

interface ErrorResponse {
  message?: string;
  error?: string;
  fields?: string[];
  field?: string;
  rut?: string;
  role?: string;
  code?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildApp(): Promise<{
  app: INestApplication<App>;
  authRepo: AuthRepository;
  usersRepo: InMemoryUsersRepository;
  subjectRepo: SubjectRepository;
}> {
  return Test.createTestingModule({
    imports: [AuthModule, UsersModule, SubjectModule],
  })
    .compile()
    .then(async (moduleRef: TestingModule) => {
      const app = moduleRef.createNestApplication<INestApplication<App>>();
      // Simulates the auth middleware that in production would populate
      // req.user; the role comes from the 'x-user-role' test header so the
      // guards (e.g. AdminGuard) can be exercised end-to-end.
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
      return {
        app,
        authRepo: moduleRef.get<AuthRepository>(AuthRepository),
        usersRepo: moduleRef.get<InMemoryUsersRepository>(
          InMemoryUsersRepository,
        ),
        subjectRepo: moduleRef.get<SubjectRepository>(SubjectRepository),
      };
    });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('EasyCheck — Integration Tests (Bottom-Up) — CU-01 / CU-02 / CU-09', () => {
  let app: INestApplication<App>;
  let authRepo: AuthRepository;
  let usersRepo: InMemoryUsersRepository;
  let subjectRepo: SubjectRepository;

  beforeAll(async () => {
    ({ app, authRepo, usersRepo, subjectRepo } = await buildApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // AuthRepository y InMemoryUsersRepository exponen reset(); SubjectRepository
    // no lo hace, por eso cada test de IT-13 usa un código de asignatura distinto
    // para evitar arrastre de estado entre pruebas.
    authRepo.reset();
    usersRepo.reset();
    await seedAccount(usersRepo, '44444444-4', UserRole.ADMINISTRADOR);
    await seedAccount(usersRepo, '11111111-1', UserRole.ESTUDIANTE);
  });

  // ===========================================================================
  // IT-11 — CU-01: Login
  // Integration: AuthController ↔ AuthService ↔ AuthRepository (in-memory)
  // ===========================================================================
  describe('IT-11 — Login (CU-01)', () => {
    /**
     * Precondition: usuario 11111111-1 (estudiante, ACTIVE) en el almacén.
     * Input: POST /api/v1/auth/login { rut, password }
     */
    it('should return HTTP 200 with role and redirectUrl for an active student', async () => {
      authRepo.seedUser('11111111-1', 'estudiante', 'ACTIVE');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '11111111-1', password: 'demo' });
      const body = res.body as LoginResponse;

      expect(res.status).toBe(HttpStatus.OK);
      expect(body).toMatchObject({
        token: 'mock-token-11111111-1-estudiante',
        role: 'estudiante',
        redirectUrl: '/estudiante/home',
        user: { rut: '11111111-1', role: 'estudiante' },
      });
    });

    it('should return HTTP 200 with the professor home url', async () => {
      authRepo.seedUser('22222222-2', 'profesor', 'ACTIVE');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '22222222-2', password: 'demo' });
      const body = res.body as LoginResponse;

      expect(res.status).toBe(HttpStatus.OK);
      expect(body).toMatchObject({
        token: 'mock-token-22222222-2-profesor',
        role: 'profesor',
        redirectUrl: '/profesor/home',
        user: { rut: '22222222-2', role: 'profesor' },
      });
    });

    it('should reject a password not validated by the simulated Intranet', async () => {
      authRepo.seedUser(
        '11111111-1',
        'estudiante',
        'ACTIVE',
        'correct-password',
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '11111111-1', password: 'wrong-password' });

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body).toMatchObject({
        message: 'RUT o contraseña incorrectos',
      });
    });

    it('should return HTTP 400 with the missing fields when credentials are empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '', password: '' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        message: 'Debe completar los campos obligatorios',
        fields: ['rut', 'password'],
      });
    });

    it('should return HTTP 400 when the RUT has an invalid format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: 'rut-invalido', password: 'demo' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        message: 'El formato del RUT ingresado no es válido',
      });
    });

    it('should return HTTP 403 when the account is disabled', async () => {
      authRepo.seedUser('77777777-7', 'estudiante', 'DISABLED');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '77777777-7', password: 'demo' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
      expect(body).toMatchObject({
        message:
          'Su cuenta se encuentra deshabilitada, contacte al administrador',
      });
    });

    it('should return HTTP 401 when the user does not exist', async () => {
      // 33333333-3 tiene formato válido pero no está sembrado
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '33333333-3', password: 'demo' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(body).toMatchObject({ message: 'RUT o contraseña incorrectos' });
    });
  });

  // ===========================================================================
  // IT-12 — CU-02: Register user
  // Integration: UsersController ↔ RegisterUserService ↔ InMemory adapters
  // ===========================================================================
  describe('IT-12 — Register user (CU-02)', () => {
    // Correo institucional válido: dominio @ufromail.cl y exactamente 2 dígitos
    // en la parte local (regla del stub InMemoryInstitutionalIdentityService).
    const validPayload = {
      rut: '12345678-9',
      institutionalEmail: 'ana.garcia22@ufromail.cl',
      institutionalPassword: 'ClaveInstitucional123',
      fullName: 'Ana Garcia',
      role: 'ESTUDIANTE',
    };

    it('should return HTTP 401 when registration has no administrator token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .send(validPayload);

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return HTTP 201 and persist the created user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send(validPayload);
      const body = res.body as RegisterUserResponse;

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(body).toMatchObject({
        rut: '12345678-9',
        institutionalEmail: 'ana.garcia22@ufromail.cl',
        fullName: 'Ana Garcia',
        role: 'ESTUDIANTE',
      });
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('createdAt');

      // ── Assert on DB state (side effect) ──
      const exists = await usersRepo.existsByRut('12345678-9');
      expect(exists).toBe(true);
    });

    it('should allow a newly registered institutional user to log in', async () => {
      const registration = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send(validPayload);
      expect(registration.status).toBe(HttpStatus.CREATED);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          rut: validPayload.rut,
          password: validPayload.institutionalPassword,
        });

      expect(login.status).toBe(HttpStatus.OK);
      expect(login.body).toMatchObject({
        role: 'estudiante',
        user: { rut: validPayload.rut },
      });
    });

    it('should return HTTP 409 when the RUT is already registered', async () => {
      // Primer registro (éxito)
      await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send(validPayload);

      // Segundo registro con el mismo RUT
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send(validPayload);
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(body).toMatchObject({
        error: 'El usuario con RUT 12345678-9 ya se encuentra registrado',
        rut: '12345678-9',
      });
    });

    it('should return HTTP 404 when the user does not belong to the university', async () => {
      // Dominio @ufromail.cl pero sin los 2 dígitos requeridos en la parte local
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({
          ...validPayload,
          institutionalEmail: 'ana.garcia@ufromail.cl',
        });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toMatchObject({
        error:
          'El usuario con RUT 12345678-9 no pertenece a la Universidad de La Frontera',
        rut: '12345678-9',
      });
    });

    it('should return HTTP 400 when the institutional credentials are invalid', async () => {
      // Correo fuera del dominio institucional
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ ...validPayload, institutionalEmail: 'ana.garcia@gmail.com' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        error: 'Las credenciales institucionales son invalidas',
      });
    });

    it('should return HTTP 400 when the role is not allowed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ ...validPayload, role: 'ADMINISTRADOR' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        error: 'El rol ADMINISTRADOR no es permitido para registro',
        role: 'ADMINISTRADOR',
      });
    });

    it('should return HTTP 400 when the RUT format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/register')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ ...validPayload, rut: 'rut-invalido' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        error: 'El formato del RUT rut-invalido es invalido',
        rut: 'rut-invalido',
      });
    });
  });

  // ===========================================================================
  // IT-13 — CU-09: Create subject (admin only)
  // Integration: AdminGuard ↔ SubjectController ↔ SubjectService ↔ Repository
  // ===========================================================================
  describe('IT-13 — Create subject (CU-09)', () => {
    /**
     * Precondition: rol administrador (header x-user-role) + header authorization.
     * Input: POST /api/v1/subjects { code, name, career }
     */
    it('should return HTTP 201 and persist the subject', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({
          code: 'ICC-404',
          name: 'Sistemas Operativos',
          career: 'ICINF',
        });
      const body = res.body as CreateSubjectResponse;

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(body).toMatchObject({
        message: 'Asignatura registrada correctamente',
        subject: {
          code: 'ICC-404',
          name: 'Sistemas Operativos',
          career: 'ICINF',
        },
      });

      // ── Assert on DB state (side effect) ──
      const inDb = await subjectRepo.findByCode('ICC-404');
      expect(inDb).toMatchObject({ code: 'ICC-404' });
    });

    it('should return HTTP 401 when no authorization token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .send({ code: 'ICC-401', name: 'Redes', career: 'ICINF' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(body.message).toBeDefined();

      // ── Assert DB was not modified ──
      const inDb = await subjectRepo.findByCode('ICC-401');
      expect(inDb).toBeNull();
    });

    it('should return HTTP 403 for a non-admin role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('authorization', 'Bearer mock-token-11111111-1-estudiante')
        .send({ code: 'ICC-403', name: 'Bases de Datos', career: 'ICINF' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
      expect(body.message).toBeDefined();

      const inDb = await subjectRepo.findByCode('ICC-403');
      expect(inDb).toBeNull();
    });

    it('should return HTTP 409 when the subject code already exists', async () => {
      // Se siembra directamente en el repositorio (no hay reset() en Subject)
      await subjectRepo.save({
        code: 'DUP-01',
        name: 'Existente',
        career: 'ICINF',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ code: 'DUP-01', name: 'Otra Asignatura', career: 'ICINF' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(body).toMatchObject({
        message: 'El código ingresado ya existe en el sistema',
        code: 'DUP-01',
      });
    });

    it('should return HTTP 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ code: '', name: '', career: '' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        message: 'Debe completar los datos obligatorios',
        fields: ['code', 'name', 'career'],
      });
    });

    it('should return HTTP 400 when a field contains invalid characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('authorization', ADMIN_AUTHORIZATION)
        .send({ code: 'IC@#', name: 'Redes', career: 'ICINF' });
      const body = res.body as ErrorResponse;

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(body).toMatchObject({
        message: 'Caracteres no permitidos',
        field: 'code',
      });
    });
  });
});
