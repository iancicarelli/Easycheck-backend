import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, synchronizeIntranet, TOKENS } from '../../SHARED/e2e-app';

// CU-07/CU-08 (apoyo): el profesor lista las clases que dicta con sus estados,
// para no tener que escribir el id a mano. Cubre GET professors/me/classes
// (controlador → getCurrentProfessorClasses → findClassesForProfessor).
describe('GET professors/me/classes (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createE2eApp();
    await synchronizeIntranet(app);
  });
  afterAll(async () => app.close());

  it('devuelve las clases del profesor con sus estados', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/classes')
      .set('Authorization', TOKENS.professor)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        // Toda clase trae id, asignatura y ambos estados.
        for (const c of body) {
          expect(typeof c.classId).toBe('number');
          expect(typeof c.subjectId).toBe('string');
          expect(['ENABLED', 'DISABLED']).toContain(c.registrationStatus);
          expect(['ENABLED', 'DISABLED']).toContain(c.editingStatus);
        }
        // La clase 1001 (ASG-01) la dicta el profesor del seed.
        expect(body.some((c: { classId: number }) => c.classId === 1001)).toBe(
          true,
        );
      });
  });

  it('rechaza a un rol que no es profesor (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/classes')
      .set('Authorization', TOKENS.student)
      .expect(403);
  });

  it('rechaza sin token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/professors/me/classes')
      .expect(401);
  });
});
