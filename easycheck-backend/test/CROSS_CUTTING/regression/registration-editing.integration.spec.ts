import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssistanceModule } from '../../../src/assistance/Assistance.module';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { seedAccount } from '../../SHARED/security-fixtures';

const PROFESSOR_TOKEN = 'Bearer mock-token-22222222-2-profesor';
const OTHER_PROFESSOR_TOKEN = 'Bearer mock-token-88888888-8-profesor';
const STUDENT_TOKEN = 'Bearer mock-token-11111111-1-estudiante';

describe('Bloque 5 - CU-07 cierre y CU-08 edicion', () => {
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
    await seedAccount(users, '22222222-2', UserRole.PROFESOR);
    await seedAccount(users, '88888888-8', UserRole.PROFESOR);
    await seedAccount(users, '11111111-1', UserRole.ESTUDIANTE);
    repository.seedStudent('11111111-1', 'Estudiante Uno');
    repository.seedEnrollment('11111111-1', 'ASG-01');
    repository.seedTeaching('22222222-2', 'ASG-01');
    repository.seedClass({
      id: 1001,
      subjectId: 'ASG-01',
      date: new Date(),
      registrationStatus: 'ENABLED',
      editingStatus: 'DISABLED',
    });
    repository.seedAssistance({
      id: 10,
      studentRut: '11111111-1',
      classId: 1001,
      subjectId: 'ASG-01',
      date: new Date(),
      present: true,
    });
  });

  afterAll(async () => app.close());

  async function closeRegistration(): Promise<void> {
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/registration')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ status: 'DISABLED' })
      .expect(HttpStatus.OK);
  }

  async function enableEditing(): Promise<void> {
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/editing')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ status: 'ENABLED' })
      .expect(HttpStatus.OK);
  }

  it('CU-07 cierra nuevos registros usando el profesor del token', async () => {
    await closeRegistration();
    expect(await repository.findClass(1001)).toMatchObject({
      registrationStatus: 'DISABLED',
      editingStatus: 'DISABLED',
    });
  });

  it('CU-08 exige cerrar el registro antes de habilitar edicion', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/editing')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ status: 'ENABLED' })
      .expect(HttpStatus.CONFLICT);
  });

  it('habilitar edicion no vuelve a habilitar el registro QR', async () => {
    await closeRegistration();
    await enableEditing();

    expect(await repository.findClass(1001)).toMatchObject({
      registrationStatus: 'DISABLED',
      editingStatus: 'ENABLED',
    });
    await request(app.getHttpServer())
      .post('/api/v1/students/me/classes/1001/qr')
      .set('Authorization', STUDENT_TOKEN)
      .expect(HttpStatus.CONFLICT);
  });

  it('CU-08 permite editar solamente durante la ventana habilitada', async () => {
    await closeRegistration();
    await enableEditing();

    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/assistance/10')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ present: false })
      .expect(HttpStatus.OK);
    expect(await repository.findAssistanceById(10)).toMatchObject({
      present: false,
    });

    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/editing')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ status: 'DISABLED' })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/assistance/10')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ present: true })
      .expect(HttpStatus.CONFLICT);
  });

  it('rechaza editar cuando la ventana no fue habilitada', async () => {
    await closeRegistration();
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/assistance/10')
      .set('Authorization', PROFESSOR_TOKEN)
      .send({ present: false })
      .expect(HttpStatus.CONFLICT);
  });

  it('rechaza a otro profesor y a un rol estudiante', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/registration')
      .set('Authorization', OTHER_PROFESSOR_TOKEN)
      .send({ status: 'DISABLED' })
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .patch('/api/v1/professors/me/classes/1001/registration')
      .set('Authorization', STUDENT_TOKEN)
      .send({ status: 'DISABLED' })
      .expect(HttpStatus.FORBIDDEN);
  });
});
