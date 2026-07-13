import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { SubjectRepository } from '../../../src/subject/Subject.repository';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { seedAccount } from '../../SHARED/security-fixtures';

const ADMIN_AUTHORIZATION = 'Bearer mock-token-44444444-4-administrador';

describe('API Intranet simulada - integracion', () => {
  let app: INestApplication<App>;
  let data: DataRepository;
  let subjects: SubjectRepository;
  let users: InMemoryUsersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    data = moduleRef.get(DataRepository);
    subjects = moduleRef.get(SubjectRepository);
    users = moduleRef.get(InMemoryUsersRepository);
  });

  beforeEach(async () => {
    data.reset();
    subjects.reset();
    users.reset();
    await seedAccount(users, '44444444-4', UserRole.ADMINISTRADOR);
  });

  afterAll(async () => app.close());

  it('rechaza una sincronizacion sin credenciales administrativas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('sincroniza usuarios, asignaturas y relaciones de forma idempotente', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .set('Authorization', ADMIN_AUTHORIZATION)
      .expect(HttpStatus.CREATED);

    expect(first.body).toMatchObject({
      source: 'API_INTRANET_SIMULADA',
      users: 5,
      students: 2,
      professors: 1,
      subjects: 2,
      enrollments: 2,
      teachings: 2,
      classes: 2,
    });

    const second = await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .set('Authorization', ADMIN_AUTHORIZATION)
      .expect(HttpStatus.CREATED);

    expect(second.body).toEqual(first.body);
    expect(await users.findByRut('11111111-1')).toMatchObject({
      role: 'ESTUDIANTE',
      status: 'ACTIVE',
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ rut: '55555555-5', password: 'demo' })
      .expect(HttpStatus.OK)
      .expect(({ body }: { body: { user: { rut: string; role: string } } }) => {
        expect(body.user).toMatchObject({
          rut: '55555555-5',
          role: 'estudiante',
        });
      });
  });

  it('conserva una asignatura LOCAL de CU-09 si Intranet usa el mismo codigo', async () => {
    await subjects.save({
      code: 'ASG-01',
      name: 'Nombre definido localmente',
      career: 'Carrera local',
    });

    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .set('Authorization', ADMIN_AUTHORIZATION)
      .expect(HttpStatus.CREATED);

    expect(await subjects.findByCode('ASG-01')).toMatchObject({
      name: 'Nombre definido localmente',
      career: 'Carrera local',
      source: 'LOCAL',
    });
    expect(await subjects.count()).toBe(2);
  });

  it('los CU-04 y CU-05 consumen los datos academicos sincronizados', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/api-intranet/sync')
      .set('Authorization', ADMIN_AUTHORIZATION)
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', 'Bearer mock-token-11111111-1-estudiante')
      .expect(HttpStatus.OK)
      .expect({
        studentRut: '11111111-1',
        subjectId: 'ASG-01',
        attendedClasses: 0,
        totalClasses: 1,
        attendancePercentage: 0,
      });

    await request(app.getHttpServer())
      .get('/api/v1/professors/me/subjects/ASG-01/attendance')
      .set('Authorization', 'Bearer mock-token-22222222-2-profesor')
      .expect(HttpStatus.OK)
      .expect([
        {
          rut: '11111111-1',
          name: 'Estudiante Uno',
          classesAttended: 0,
          totalClasses: 1,
          assistancePercentage: 0,
        },
      ]);
  });
});
