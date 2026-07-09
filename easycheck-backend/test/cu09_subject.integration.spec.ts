import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SubjectModule } from '../src/subject/Subject.module';

describe('CU-09 SubjectController (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [SubjectModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra una asignatura con token mock administrativo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Authorization', 'Bearer mock-token-11222333-4-administrador')
      .send({
        code: 'INF-401',
        name: 'Calidad de Software',
        career: 'Ingenieria Informatica',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toEqual({
      message: 'Asignatura registrada correctamente',
      subject: {
        code: 'INF-401',
        name: 'Calidad de Software',
        career: 'Ingenieria Informatica',
      },
    });
  });

  it('rechaza asignatura duplicada', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Authorization', 'Bearer mock-token-11222333-4-administrador')
      .send({
        code: 'INF-402',
        name: 'Gestion de Proyectos',
        career: 'Ingenieria Informatica',
      })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Authorization', 'Bearer mock-token-11222333-4-administrador')
      .send({
        code: 'INF-402',
        name: 'Gestion de Proyectos',
        career: 'Ingenieria Informatica',
      })
      .expect(HttpStatus.CONFLICT);
  });

  it('rechaza solicitud sin token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .send({
        code: 'INF-403',
        name: 'Seguridad de Software',
        career: 'Ingenieria Informatica',
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
