import { Module } from '@nestjs/common';
import { AssistanceModule } from '../assistance/Assistance.module';
import { SubjectModule } from '../subject/Subject.module';
import { UsersModule } from '../users/users.module';
import { ApiIntranetController } from './api-intranet.controller';
import { SyncApiIntranetService } from './application/sync-api-intranet.service';
import { ApiIntranetMockService } from './infrastructure/api-intranet-mock.service';

@Module({
  imports: [AssistanceModule, SubjectModule, UsersModule],
  controllers: [ApiIntranetController],
  providers: [SyncApiIntranetService, ApiIntranetMockService],
})
export class ApiIntranetModule {}
