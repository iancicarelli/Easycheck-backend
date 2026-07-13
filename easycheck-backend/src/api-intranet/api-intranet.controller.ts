import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  AllowedRoles,
  TokenRolesGuard,
} from '../auth/application/token-roles.guard';
import { SyncApiIntranetService } from './application/sync-api-intranet.service';

@Controller('api/v1/api-intranet')
export class ApiIntranetController {
  constructor(private readonly synchronization: SyncApiIntranetService) {}

  @Post('sync')
  @AllowedRoles('administrador')
  @UseGuards(TokenRolesGuard)
  synchronize() {
    return this.synchronization.synchronize();
  }
}
