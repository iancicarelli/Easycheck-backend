import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistanceController } from './Assistance.controller';
import { AssistanceService } from './Assistance.service';
import { DataRepository } from './Data.repository';
import { TypeOrmDataRepository } from './Data.typeorm.repository';
import { USE_DATABASE } from '../database/use-database';
import { StudentEntity } from '../database/entities/student.entity';
import { ProfessorEntity } from '../database/entities/professor.entity';
import { EnrollmentEntity } from '../database/entities/enrollment.entity';
import { ClassSessionEntity } from '../database/entities/class-session.entity';
import { TeachingEntity } from '../database/entities/teaching.entity';
import { AssistanceEntity } from '../database/entities/assistance.entity';
import { QrNonceEntity } from '../database/entities/qr-nonce.entity';
import { QrTokenService } from './qr-token.service';
import { UsersModule } from '../users/users.module';
import { ReaderGuard } from './reader.guard';

// Con DB_HOST definido, el token DataRepository resuelve a la implementación
// TypeORM; sin él (tests/local) sigue siendo el store in-memory de siempre.
@Module({
  imports: [
    forwardRef(() => UsersModule),
    ...(USE_DATABASE
      ? [
          TypeOrmModule.forFeature([
            StudentEntity,
            // ProfessorEntity no se consulta desde el repo (teachings guarda el
            // rut plano) pero debe registrarse para que el seed la pueda usar.
            ProfessorEntity,
            EnrollmentEntity,
            ClassSessionEntity,
            TeachingEntity,
            AssistanceEntity,
            QrNonceEntity,
          ]),
        ]
      : []),
  ],
  controllers: [AssistanceController],
  providers: [
    AssistanceService,
    QrTokenService,
    ReaderGuard,
    USE_DATABASE
      ? { provide: DataRepository, useClass: TypeOrmDataRepository }
      : DataRepository,
  ],
  exports: [DataRepository],
})
export class AssistanceModule {}
