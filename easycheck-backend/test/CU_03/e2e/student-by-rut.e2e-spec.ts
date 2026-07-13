import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-03 asistencia del estudiante por RUT (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('permite al director consultar el resumen del estudiante', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/11111111-1/attendance')
      .set('Authorization', TOKENS.director)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({ subjectName: 'ASG-01', totalClasses: 1 }),
        ]);
      });
  });
});
