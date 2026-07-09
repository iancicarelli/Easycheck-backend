import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiIntranetSyncService } from './application/sync-api-intranet.service';

@ApiTags('API Intranet simulada')
@Controller('api/v1/api-intranet')
export class ApiIntranetSyncController {
  constructor(private readonly syncService: ApiIntranetSyncService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  syncAcademicData() {
    return this.syncService.syncAcademicData();
  }
}
