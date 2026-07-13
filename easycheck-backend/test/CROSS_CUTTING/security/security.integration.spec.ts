import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssistanceModule } from '../../../src/assistance/Assistance.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { seedAccount } from '../../SHARED/security-fixtures';

describe('Bloque 6 - identidad y autorizacion transversal', () => {
  let app: INestApplication<App>;
  let data: DataRepository;
  let users: InMemoryUsersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AssistanceModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    data = moduleRef.get(DataRepository);
    users = moduleRef.get(InMemoryUsersRepository);
  });

  beforeEach(async () => {
    data.reset();
    users.reset();
    await seedAccount(users, '11111111-1', UserRole.ESTUDIANTE);
    await seedAccount(users, '22222222-2', UserRole.PROFESOR);
    await seedAccount(users, '77777777-7', UserRole.ESTUDIANTE, 'DISABLED');
    data.seedStudent('11111111-1', 'Estudiante Uno');
    data.seedEnrollment('11111111-1', 'ASG-01');
    data.seedTeaching('22222222-2', 'ASG-01');
    data.seedClass({
      id: 1001,
      subjectId: 'ASG-01',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
  });

  afterAll(async () => app.close());

  it('rechaza un token para una cuenta inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', 'Bearer mock-token-99999999-9-estudiante')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('rechaza un token para una cuenta deshabilitada', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', 'Bearer mock-token-77777777-7-estudiante')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('rechaza cuando el rol del token no coincide con la cuenta', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/subjects/ASG-01/attendance')
      .set('Authorization', 'Bearer mock-token-11111111-1-profesor')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('x-user-role ya no permite omitir el token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('x-user-role', 'estudiante')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('protege los alias antiguos contra suplantacion por RUT', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/55555555-5/assistance')
      .query({ subject: 'ASG-01' })
      .set('Authorization', 'Bearer mock-token-11111111-1-estudiante')
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get('/api/v1/professors/88888888-8/subjects/ASG-01/assistance')
      .set('Authorization', 'Bearer mock-token-22222222-2-profesor')
      .expect(HttpStatus.FORBIDDEN);
  });

  it('el endpoint del lector exige su credencial tecnica', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/assistance/register')
      .send({ qrToken: 'token-invalido' })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
