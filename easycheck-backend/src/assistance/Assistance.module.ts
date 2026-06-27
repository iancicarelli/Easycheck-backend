import { Module } from '@nestjs/common';
import { AssistanceController } from './Assistance.controller';
import { AssistanceService } from './Assistance.service';
import { DataRepository } from './Data.repository';

@Module({
  controllers: [AssistanceController],
  providers: [AssistanceService, DataRepository],
  exports: [DataRepository],
})
export class AssistanceModule {}
