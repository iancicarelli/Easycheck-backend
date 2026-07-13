import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  createE2eApp,
  synchronizeIntranet,
  TOKENS,
} from '../../SHARED/e2e-app';

describe('CU-04 asistencia propia por asignatura (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('resume la asistencia de todas las asignaturas del estudiante', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/attendance')
      .set('Authorization', TOKENS.student)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            subjectName: 'ASG-01',
            totalClasses: 1,
            attendedClasses: 0,
            attendancePercentage: 0,
          }),
        ]);
      });
  });

  it('obtiene la identidad desde el token del estudiante', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/students/me/subjects/ASG-01/attendance')
      .set('Authorization', TOKENS.student)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          studentRut: '11111111-1',
          subjectId: 'ASG-01',
          totalClasses: 1,
          attendedClasses: 0,
        });
      });
  });
});
