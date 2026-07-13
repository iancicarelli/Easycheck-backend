import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssistanceModule } from '../../../src/assistance/Assistance.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { seedAccount } from '../../SHARED/security-fixtures';

const STUDENT_TOKEN = 'Bearer mock-token-11111111-1-estudiante';
const PROFESSOR_TOKEN = 'Bearer mock-token-22222222-2-profesor';
const DIRECTOR_TOKEN = 'Bearer mock-token-33333333-3-director';

describe('Bloque 3 - consultas CU-03, CU-04 y CU-05', () => {
  let app: INestApplication<App>;
  let repository: DataRepository;
  let users: InMemoryUsersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AssistanceModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    repository = moduleRef.get(DataRepository);
    users = moduleRef.get(InMemoryUsersRepository);
  });

  beforeEach(async () => {
    repository.reset();
    users.reset();
    await seedAccount(users, '11111111-1', UserRole.ESTUDIANTE);
    await seedAccount(users, '22222222-2', UserRole.PROFESOR);
    await seedAccount(users, '33333333-3', UserRole.DIRECTOR_CARRERA);
    repository.seedStudent('11111111-1', 'Estudiante Uno');
    repository.seedStudent('55555555-5', 'Estudiante Dos');
    repository.seedEnrollment('11111111-1', 'ASG-01');
    repository.seedEnrollment('55555555-5', 'ASG-01');
    repository.seedTeaching('22222222-2', 'ASG-01');
    repository.seedClass({
      id: 1001,
      subjectId: 'ASG-01',
      date: new Date('2026-07-01T12:00:00.000Z'),
      registrationStatus: 'ENABLED',
    });
    repository.seedClass({
      id: 1002,
      subjectId: 'ASG-01',
      date: new Date('2026-07-02T12:00:00.000Z'),
      registrationStatus: 'ENABLED',
    });
    repository.seedAssistance({
      id: 1,
      studentRut: '11111111-1',
      classId: 1001,
      subjectId: 'ASG-01',
      date: new Date('2026-07-01T12:00:00.000Z'),
      present: true,
    });
  });

  afterAll(async () => app.close());

  it('CU-03 permite al director consultar un estudiante por RUT', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/11111111-1/attendance')
      .set('Authorization', DIRECTOR_TOKEN)
      .expect(HttpStatus.OK)
      .expect([
        {
          subjectName: 'ASG-01',
          attendedClasses: 1,
          totalClasses: 2,
          attendancePercentage: 50,
        },
      ]);
  });

  it('CU-04 usa el RUT del token y calcula la asistencia de la asignatura', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', STUDENT_TOKEN)
      .expect(HttpStatus.OK)
      .expect({
        studentRut: '11111111-1',
        subjectId: 'ASG-01',
        attendedClasses: 1,
        totalClasses: 2,
        attendancePercentage: 50,
      });
  });

  it('CU-04 rechaza consultar con rol profesor', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', PROFESSOR_TOKEN)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('CU-04 informa cuando el estudiante no esta matriculado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/INF-999/attendance')
      .set('Authorization', STUDENT_TOKEN)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          error: 'Student not enrolled in subject',
          studentRut: '11111111-1',
          subjectCode: 'INF-999',
        });
      });
  });

  it('CU-05 usa el profesor del token y lista estudiantes de su asignatura', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/professors/me/subjects/ASG-01/attendance')
      .set('Authorization', PROFESSOR_TOKEN)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual([
      {
        rut: '11111111-1',
        name: 'Estudiante Uno',
        classesAttended: 1,
        totalClasses: 2,
        assistancePercentage: 50,
      },
      {
        rut: '55555555-5',
        name: 'Estudiante Dos',
        classesAttended: 0,
        totalClasses: 2,
        assistancePercentage: 0,
      },
    ]);
  });

  it('CU-05 rechaza una asignatura no impartida por el profesor', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/subjects/INF-999/attendance')
      .set('Authorization', PROFESSOR_TOKEN)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('las rutas canonicas requieren un token valido', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
