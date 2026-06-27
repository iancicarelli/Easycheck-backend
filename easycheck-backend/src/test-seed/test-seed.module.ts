import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/Auth.module';
import { SubjectModule } from '../subject/Subject.module';
import { AssistanceModule } from '../assistance/Assistance.module';
import { UsersModule } from '../users/users.module';
import { TestSeedController } from './test-seed.controller';

/**
 * Módulo de utilidades de testing. Importa los módulos de negocio para
 * reutilizar sus instancias de repositorio (exportadas) y exponer el endpoint
 * POST /api/v1/test/seed. Sólo debe montarse fuera de producción
 * (ver app.module.ts).
 */
@Module({
  imports: [AuthModule, SubjectModule, AssistanceModule, UsersModule],
  controllers: [TestSeedController],
})
export class TestSeedModule {}
