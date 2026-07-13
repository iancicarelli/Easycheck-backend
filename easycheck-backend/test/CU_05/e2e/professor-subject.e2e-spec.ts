import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-05 asistencia de una asignatura (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('lista al alumnado de la asignatura del profesor autenticado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/subjects/ASG-01/attendance')
      .set('Authorization', TOKENS.professor)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({ rut: '11111111-1', totalClasses: 1 }),
        ]);
      });
  });
});
