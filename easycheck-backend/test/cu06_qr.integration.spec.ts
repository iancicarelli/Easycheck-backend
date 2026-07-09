import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('CU-06 Generacion y validacion QR (integration)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.OK);
  });

  afterEach(async () => {
    await app.close();
  });

  it('profesor genera QR y estudiante registra asistencia con ese QR', async () => {
    const qrResponse = await request(app.getHttpServer())
      .post('/api/v1/professors/subjects/INF-301/classes/3/qr')
      .set('Authorization', 'Bearer mock-token-98765432-1-profesor')
      .expect(HttpStatus.CREATED);

    expect(qrResponse.body).toEqual({
      qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
      subjectId: 'INF-301',
      classId: 3,
    });

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'INF-301',
        qrSignature: qrResponse.body.qrSignature,
      })
      .expect(HttpStatus.CREATED);

    expect(registerResponse.body).toMatchObject({
      message: 'Assistance registered successfully',
      studentRut: '12345678-9',
      classId: 3,
    });
    expect(registerResponse.body).toHaveProperty('recordId');
  });

  it('retorna 400 cuando el QR es invalido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'INF-301',
        qrSignature: 'INVALID_SIGNATURE',
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body).toMatchObject({ error: 'Invalid QR signature' });
  });

  it('retorna 409 cuando el registro esta duplicado', async () => {
    const payload = {
      studentRut: '12345678-9',
      classId: 3,
      subjectId: 'INF-301',
      qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
    };

    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send(payload)
      .expect(HttpStatus.CREATED);

    const response = await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send(payload)
      .expect(HttpStatus.CONFLICT);

    expect(response.body).toMatchObject({
      error: 'Student 12345678-9 already registered assistance for class 3',
    });
  });

  it('retorna 409 cuando la clase esta deshabilitada', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send({
        studentRut: '12345678-9',
        classId: 4,
        subjectId: 'INF-301',
        qrSignature: 'easycheck-qr:INF-301:4:98765432-1',
      })
      .expect(HttpStatus.CONFLICT);

    expect(response.body).toMatchObject({
      error: 'Registration for class 4 is disabled',
      classId: 4,
    });
  });

  it('retorna 403 si un no profesor intenta generar QR', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/professors/subjects/INF-301/classes/3/qr')
      .set('Authorization', 'Bearer mock-token-12345678-9-estudiante')
      .expect(HttpStatus.FORBIDDEN);

    expect(response.body).toMatchObject({
      error: 'Solo profesores pueden generar QR de asistencia',
    });
  });
});
