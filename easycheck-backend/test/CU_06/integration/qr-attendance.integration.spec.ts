import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssistanceModule } from '../../../src/assistance/Assistance.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import type { QrClaims } from '../../../src/assistance/qr-token.service';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { READER_HEADERS, seedAccount } from '../../SHARED/security-fixtures';

const STUDENT_TOKEN = 'Bearer mock-token-11111111-1-estudiante';
const OTHER_STUDENT_TOKEN = 'Bearer mock-token-55555555-5-estudiante';
const PROFESSOR_TOKEN = 'Bearer mock-token-22222222-2-profesor';

interface GeneratedQrResponse {
  studentRut: string;
  classId: number;
  subjectId: string;
  qrToken: string;
  expiresAt: string;
}

describe('Bloque 4 - CU-06 QR firmado', () => {
  let app: INestApplication<App>;
  let repository: DataRepository;
  let qrTokens: QrTokenService;
  let users: InMemoryUsersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AssistanceModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    repository = moduleRef.get(DataRepository);
    qrTokens = moduleRef.get(QrTokenService);
    users = moduleRef.get(InMemoryUsersRepository);
  });

  beforeEach(async () => {
    repository.reset();
    users.reset();
    await seedAccount(users, '11111111-1', UserRole.ESTUDIANTE);
    await seedAccount(users, '55555555-5', UserRole.ESTUDIANTE);
    await seedAccount(users, '22222222-2', UserRole.PROFESOR);
    repository.seedStudent('11111111-1', 'Estudiante Uno');
    repository.seedStudent('55555555-5', 'Estudiante Dos');
    repository.seedEnrollment('11111111-1', 'ASG-01');
    repository.seedClass({
      id: 1001,
      subjectId: 'ASG-01',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
  });

  afterAll(async () => app.close());

  async function generateQr(): Promise<GeneratedQrResponse> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', STUDENT_TOKEN)
      .expect(HttpStatus.CREATED);
    return response.body as GeneratedQrResponse;
  }

  it('genera un token firmado con la identidad y clase verificadas', async () => {
    const body = await generateQr();
    expect(body).toMatchObject({
      studentRut: '11111111-1',
      classId: 1001,
      subjectId: 'ASG-01',
    });
    expect(body.qrToken.split('.')).toHaveLength(2);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('registra asistencia usando solo el token QR', async () => {
    const generated = await generateQr();
    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set(READER_HEADERS)
      .send({ qrToken: generated.qrToken })
      .expect(HttpStatus.CREATED)
      .expect(({ body }: { body: { studentRut: string; classId: number } }) => {
        expect(body).toMatchObject({
          studentRut: '11111111-1',
          classId: 1001,
        });
      });
    expect(await repository.assistanceExists('11111111-1', 1001)).toBe(true);
  });

  it('rechaza un QR cuya firma fue alterada', async () => {
    const generated = await generateQr();
    const [payload, signature] = generated.qrToken.split('.');
    const tampered = `${payload}.${signature.slice(0, -1)}x`;
    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set(READER_HEADERS)
      .send({ qrToken: tampered })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('impide que un estudiante no matriculado genere el QR', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', OTHER_STUDENT_TOKEN)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('impide que un profesor use la ruta de generacion del estudiante', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', PROFESSOR_TOKEN)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('rechaza registrar dos veces la misma asistencia', async () => {
    const firstQr = await generateQr();
    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set(READER_HEADERS)
      .send({ qrToken: firstQr.qrToken })
      .expect(HttpStatus.CREATED);

    const secondQr = await generateQr();
    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set(READER_HEADERS)
      .send({ qrToken: secondQr.qrToken })
      .expect(HttpStatus.CONFLICT);
  });

  it('rechaza un token vencido', () => {
    const now = Date.parse('2026-07-12T12:00:00.000Z');
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    const generated = qrTokens.create('11111111-1', 1001, 'ASG-01');
    clock.mockReturnValue(now + 301_000);
    expect(qrTokens.verify(generated.qrToken)).toBeNull();
    clock.mockRestore();
  });

  it('rechaza un nonce que ya fue consumido', async () => {
    const generated = await generateQr();
    const [encoded] = generated.qrToken.split('.');
    const claims = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as QrClaims;
    expect(await repository.consumeQrNonce(claims.nonce)).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set(READER_HEADERS)
      .send({ qrToken: generated.qrToken })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }: { body: { error: string } }) => {
        expect(body.error).toBe('QR token has already been used');
      });
  });
});
