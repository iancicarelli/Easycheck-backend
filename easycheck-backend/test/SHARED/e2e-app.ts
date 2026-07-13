import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

export const TOKENS = {
  admin: 'Bearer mock-token-44444444-4-administrador',
  director: 'Bearer mock-token-33333333-3-director',
  professor: 'Bearer mock-token-22222222-2-profesor',
  student: 'Bearer mock-token-11111111-1-estudiante',
} as const;

export const READER_KEY = 'easycheck-local-reader-key';

export async function createE2eApp(): Promise<INestApplication<App>> {
  delete process.env.DB_HOST;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app;
}

export async function synchronizeIntranet(
  app: INestApplication<App>,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/api-intranet/sync')
    .set('Authorization', TOKENS.admin)
    .expect(201);
}
