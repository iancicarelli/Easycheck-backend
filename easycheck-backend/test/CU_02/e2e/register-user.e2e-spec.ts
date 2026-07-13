import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, TOKENS } from '../../SHARED/e2e-app';

describe('CU-02 registro de usuario (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => (app = await createE2eApp()));
  afterAll(async () => app.close());

  it('permite que administración cree una cuenta local institucional', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users/register')
      .set('Authorization', TOKENS.admin)
      .send({
        rut: '66666666-6',
        institutionalEmail: 'estudiante66@ufromail.cl',
        institutionalPassword: 'clave-institucional',
        fullName: 'Estudiante E2E',
        role: 'ESTUDIANTE',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          rut: '66666666-6',
          role: 'ESTUDIANTE',
          status: 'ACTIVE',
        });
      });
  });
});
