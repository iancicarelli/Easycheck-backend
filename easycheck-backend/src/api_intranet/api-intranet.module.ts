import { Module } from '@nestjs/common';
import { AssistanceModule } from '../assistance/Assistance.module';
import { SubjectModule } from '../subject/Subject.module';
import { ApiIntranetMockService } from './infrastructure/api-intranet-mock.service';
import { ApiIntranetSyncController } from './api-intranet-sync.controller';
import { ApiIntranetSyncService } from './application/sync-api-intranet.service';

@Module({
  imports: [AssistanceModule, SubjectModule],
  controllers: [ApiIntranetSyncController],
  providers: [ApiIntranetMockService, ApiIntranetSyncService],
  exports: [ApiIntranetMockService, ApiIntranetSyncService],
})
export class ApiIntranetModule {}
