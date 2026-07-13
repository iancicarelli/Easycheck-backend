import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, TOKENS } from '../../SHARED/e2e-app';

describe('CU-09 creación de asignatura (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => (app = await createE2eApp()));
  afterAll(async () => app.close());

  it('administración crea una asignatura de origen local', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Authorization', TOKENS.admin)
      .send({
        code: 'E2E-101',
        name: 'Pruebas de sistema',
        career: 'Ingenieria Civil Informatica',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as Record<string, unknown>;
        expect(body.subject).toMatchObject({
          code: 'E2E-101',
          source: 'LOCAL',
        });
      });
  });
});
