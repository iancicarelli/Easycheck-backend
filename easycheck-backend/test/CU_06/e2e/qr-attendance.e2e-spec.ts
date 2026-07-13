import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  READER_KEY,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-06 registro de asistencia mediante QR (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('lista las clases de las asignaturas inscritas del estudiante', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/classes')
      .set('Authorization', TOKENS.student)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            classId: 1001,
            subjectId: 'ASG-01',
            registrationStatus: 'ENABLED',
          }),
        ]);
      });
  });

  it('genera un QR firmado y el lector registra la asistencia', async () => {
    const qr = await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', TOKENS.student)
      .expect(201);
    const qrBody = qr.body as Record<string, unknown>;

    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set('x-reader-key', READER_KEY)
      .send({ qrToken: String(qrBody.qrToken) })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          studentRut: '11111111-1',
          classId: 1001,
        });
      });
  });
});
