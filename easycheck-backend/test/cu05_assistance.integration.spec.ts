import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataRepository } from '../src/assistance/Data.repository';

interface SubjectStudentAttendanceRow {
  rut: string;
  name: string;
  classesAttended: number;
  totalClasses: number;
  assistancePercentage: number;
}

describe('CU-05 Mostrar asistencia de estudiantes de asignatura para profesor (integration)', () => {
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

  it('GET /api/v1/professors/subjects/:subjectId/attendance retorna asistencia de estudiantes inscritos', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.OK);

    dataRepository.seedAssistance({
      id: 1,
      studentRut: '12345678-9',
      classId: 3,
      subjectId: 'INF-301',
      date: new Date('2026-07-09T14:00:00.000Z'),
      present: true,
    });
    dataRepository.seedAssistance({
      id: 2,
      studentRut: '23456789-0',
      classId: 3,
      subjectId: 'INF-301',
      date: new Date('2026-07-09T14:00:00.000Z'),
      present: true,
    });
    dataRepository.seedAssistance({
      id: 3,
      studentRut: '23456789-0',
      classId: 4,
      subjectId: 'INF-301',
      date: new Date('2026-07-11T14:00:00.000Z'),
      present: true,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/subjects/INF-301/attendance')
      .set('Authorization', 'Bearer mock-token-98765432-1-profesor')
      .expect(HttpStatus.OK);

    expect(response.body as SubjectStudentAttendanceRow[]).toEqual([
      {
        rut: '12345678-9',
        name: 'Ana Garcia',
        classesAttended: 1,
        totalClasses: 2,
        assistancePercentage: 50,
      },
      {
        rut: '23456789-0',
        name: 'Carlos Lopez',
        classesAttended: 2,
        totalClasses: 2,
        assistancePercentage: 100,
      },
    ]);
  });

  it('GET /api/v1/professors/subjects/:subjectId/attendance retorna 401 sin token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/subjects/INF-301/attendance')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body).toMatchObject({ error: 'Token requerido' });
  });

  it('GET /api/v1/professors/subjects/:subjectId/attendance retorna 401 con token mal formado', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/subjects/INF-301/attendance')
      .set('Authorization', 'Bearer token-invalido')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(response.body).toMatchObject({ error: 'Token invalido' });
  });

  it('GET /api/v1/professors/subjects/:subjectId/attendance retorna 403 para rol no profesor', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/subjects/INF-301/attendance')
      .set('Authorization', 'Bearer mock-token-12345678-9-estudiante')
      .expect(HttpStatus.FORBIDDEN);

    expect(response.body).toMatchObject({
      error: 'Solo profesores pueden consultar asistencia por asignatura',
    });
  });

  it('GET /api/v1/professors/subjects/:subjectId/attendance retorna 404 si el profesor no dicta la asignatura', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.OK);

    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/subjects/INF-999/attendance')
      .set('Authorization', 'Bearer mock-token-98765432-1-profesor')
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body).toMatchObject({
      error: 'Subject not assigned to professor',
      professorRut: '98765432-1',
      subjectCode: 'INF-999',
    });
  });
});
