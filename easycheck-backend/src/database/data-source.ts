import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readDatabaseEnvironment } from '../config/environment';
import { AssistanceEntity } from './entities/assistance.entity';
import { ClassSessionEntity } from './entities/class-session.entity';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { ProfessorEntity } from './entities/professor.entity';
import { QrNonceEntity } from './entities/qr-nonce.entity';
import { StudentEntity } from './entities/student.entity';
import { SubjectEntity } from './entities/subject.entity';
import { TeachingEntity } from './entities/teaching.entity';
import { UserTypeOrmEntity } from '../users/infrastructure/user.typeorm.entity';
import { InitialIntegratedSchema1760000000000 } from './migrations/1760000000000-InitialIntegratedSchema';

export default new DataSource({
  type: 'postgres',
  ...readDatabaseEnvironment(),
  entities: [
    AssistanceEntity,
    ClassSessionEntity,
    EnrollmentEntity,
    ProfessorEntity,
    QrNonceEntity,
    StudentEntity,
    SubjectEntity,
    TeachingEntity,
    UserTypeOrmEntity,
  ],
  migrations: [InitialIntegratedSchema1760000000000],
  synchronize: false,
});
