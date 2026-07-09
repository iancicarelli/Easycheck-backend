import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataRepository } from '../src/assistance/Data.repository';

interface StudentAttendanceRow {
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
  attendancePercentage: number;
}

describe('CU-04 Mostrar asistencia del alumno autenticado (integration)', () => {
  let app: INestApplication<App>;
  let dataRepository: DataRepository;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    dataRepository = moduleRef.get<DataRepository>(DataRepository);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/students/attendance retorna asistencia general del alumno autenticado', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.OK);

    dataRepository.seedAssistance({
      id: 1,
      studentRut: '12345678-9',
      classId: 1,
      subjectId: 'ASG-01',
      date: new Date('2026-07-08T12:00:00.000Z'),
      present: true,
    });
    dataRepository.seedAssistance({
      id: 2,
      studentRut: '12345678-9',
      classId: 3,
      subjectId: 'INF-301',
      date: new Date('2026-07-09T14:00:00.000Z'),
      present: true,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/students/attendance')
      .set('Authorization', 'Bearer mock-token-12345678-9-estudiante')
      .expect(HttpStatus.OK);

    expect(response.body as StudentAttendanceRow[]).toEqual([
      {
        subjectName: 'Arquitectura de Software',
        attendedClasses: 1,
        totalClasses: 2,
        attendancePercentage: 50,
      },
      {
        subjectName: 'Ingenieria de Software',
        attendedClasses: 1,
        totalClasses: 2,
        attendancePercentage: 50,
      },
    ]);
  });

  it('GET /api/v1/students/attendance retorna 401 sin token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students/attendance')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body).toMatchObject({ error: 'Token requerido' });
  });

  it('GET /api/v1/students/attendance retorna 401 con token mal formado', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students/attendance')
      .set('Authorization', 'Bearer token-invalido')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body).toMatchObject({ error: 'Token invalido' });
  });

  it('GET /api/v1/students/attendance retorna 403 para rol no estudiante', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students/attendance')
      .set('Authorization', 'Bearer mock-token-98765432-1-profesor')
      .expect(HttpStatus.FORBIDDEN);

    expect(response.body).toMatchObject({
      error: 'Solo estudiantes pueden consultar su asistencia',
    });
  });

  it('GET /api/v1/students/attendance retorna 404 si el estudiante no existe', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/students/attendance')
      .set('Authorization', 'Bearer mock-token-87654321-0-estudiante')
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body).toMatchObject({
      error: 'El estudiante ingresado no existe',
      rut: '87654321-0',
    });
  });
});
