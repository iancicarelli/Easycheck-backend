import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-07 cierre del registro (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('el profesor cierra el registro de su clase', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/registration')
      .set('Authorization', TOKENS.professor)
      .send({ status: 'DISABLED' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          classId: 1001,
          registrationStatus: 'DISABLED',
        });
      });
  });
});
