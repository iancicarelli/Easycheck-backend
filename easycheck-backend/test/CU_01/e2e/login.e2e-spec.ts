import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, synchronizeIntranet } from '../../SHARED/e2e-app';

describe('CU-01 inicio de sesión (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('autentica una cuenta local activa con credenciales simuladas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ rut: '11111111-1', password: 'demo' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          token: 'mock-token-11111111-1-estudiante',
          user: { rut: '11111111-1', role: 'estudiante' },
        });
      });
  });
});
