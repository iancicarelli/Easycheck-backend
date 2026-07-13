import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  READER_KEY,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-08 edición de asistencia (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('cierra registro, habilita edición y corrige una asistencia', async () => {
    const qr = await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', TOKENS.student)
      .expect(201);
    const qrBody = qr.body as Record<string, unknown>;
    const registration = await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .set('x-reader-key', READER_KEY)
      .send({ qrToken: String(qrBody.qrToken) })
      .expect(201);
    const registrationBody = registration.body as Record<string, unknown>;

    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/registration')
      .set('Authorization', TOKENS.professor)
      .send({ status: 'DISABLED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/editing')
      .set('Authorization', TOKENS.professor)
      .send({ status: 'ENABLED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        `/api/v1/professors/me/assistance/${String(registrationBody.recordId)}`,
      )
      .set('Authorization', TOKENS.professor)
      .send({ present: false })
      .expect(200)
      .expect((response) => {
        const body = response.body as Record<string, unknown>;
        expect(body.present).toBe(false);
      });
  });
});
