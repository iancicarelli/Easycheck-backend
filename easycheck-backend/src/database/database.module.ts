import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USE_DATABASE } from './use-database';
import { readDatabaseEnvironment } from '../config/environment';
import { InitialIntegratedSchema1760000000000 } from './migrations/1760000000000-InitialIntegratedSchema';

/**
 * Conexión raíz a Postgres. Solo se activa cuando `DB_HOST` está definido
 * (modo Docker Compose); sin la variable este módulo no importa nada y el
 * backend queda 100 % in-memory (modo tests/local).
 */
@Module({
  imports: USE_DATABASE
    ? [
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...readDatabaseEnvironment(),
          // Registra automáticamente las entities de los forFeature().
          autoLoadEntities: true,
          // El esquema solo cambia mediante migraciones versionadas.
          synchronize: false,
          migrations: [InitialIntegratedSchema1760000000000],
          migrationsRun: true,
          migrationsTransactionMode: 'all',
        }),
      ]
    : [],
})
export class DatabaseModule {}
