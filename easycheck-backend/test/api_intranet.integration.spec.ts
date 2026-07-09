import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiIntranetModule } from '../src/api_intranet/api-intranet.module';

describe('API Intranet simulada (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiIntranetModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/api-intranet/sync sincroniza datos academicos', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      message: 'Sincronizacion completada',
      users: 3,
      subjects: 2,
      enrollments: 5,
      teachings: 2,
      classes: 4,
    });
  });
});
