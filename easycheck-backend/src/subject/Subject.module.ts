import { Module } from '@nestjs/common';
import { SubjectController } from './Subject.controller';
import { SubjectService } from './application/create-subject.service';
import { SubjectRepository } from './infrastructure/in-memory-subject.repository';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService, SubjectRepository],
  exports: [SubjectService, SubjectRepository],
})
export class SubjectModule {}
