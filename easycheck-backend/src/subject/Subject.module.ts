import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectController } from './Subject.controller';
import { SubjectService } from './Subject.service';
import { SubjectRepository } from './Subject.repository';
import { TypeOrmSubjectRepository } from './Subject.typeorm.repository';
import { USE_DATABASE } from '../database/use-database';
import { SubjectEntity } from '../database/entities/subject.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ...(USE_DATABASE ? [TypeOrmModule.forFeature([SubjectEntity])] : []),
  ],
  controllers: [SubjectController],
  providers: [
    SubjectService,
    USE_DATABASE
      ? { provide: SubjectRepository, useClass: TypeOrmSubjectRepository }
      : SubjectRepository,
  ],
  exports: [SubjectRepository],
})
export class SubjectModule {}
