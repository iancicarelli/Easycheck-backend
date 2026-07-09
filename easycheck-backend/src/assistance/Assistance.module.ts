import { Module } from '@nestjs/common';
import { AssistanceController } from './Assistance.controller';
import { AssistanceService } from './Assistance.service';
import { DataRepository } from './Data.repository';
import { MockTokenService } from '../auth/application/mock-token.service';
import { QrService } from './application/qr.service';

@Module({
  controllers: [AssistanceController],
  providers: [AssistanceService, DataRepository, MockTokenService, QrService],
  exports: [AssistanceService, DataRepository],
})
export class AssistanceModule {}
