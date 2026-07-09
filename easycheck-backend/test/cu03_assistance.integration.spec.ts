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

describe('CU-03 Mostrar asistencia por estudiante (integration)', () => {
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

  it('GET /api/v1/admin/students/:rut/attendance retorna asistencia sincronizada por todas sus asignaturas', async () => {
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
      .get('/api/v1/admin/students/12345678-9/attendance')
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

  it('GET /api/v1/admin/students/:rut/attendance retorna 400 para RUT invalido', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/students/rut-invalido/attendance')
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body).toMatchObject({
      error: 'El RUT ingresado no es valido. Ingrese el RUT nuevamente.',
    });
  });

  it('GET /api/v1/admin/students/:rut/attendance retorna 404 cuando el estudiante no existe', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/students/11111111-1/attendance')
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body).toMatchObject({
      error: 'El estudiante ingresado no existe',
      rut: '11111111-1',
    });
  });
});
