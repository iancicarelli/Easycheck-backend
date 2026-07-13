import { Module } from '@nestjs/common';
import { AuthController } from './Auth.controller';
import { AuthService } from './Auth.service';
import { AuthRepository } from './Auth.repository';
import { INTRANET_AUTH_PORT, TOKEN_PORT } from './application/auth.ports';
import { MockTokenService } from './application/mock-token.service';
import { UsersModule } from '../users/users.module';
import { InMemoryInstitutionalIdentityService } from '../users/infrastructure/in-memory-institutional-identity.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    MockTokenService,
    { provide: TOKEN_PORT, useExisting: MockTokenService },
    {
      provide: INTRANET_AUTH_PORT,
      useExisting: InMemoryInstitutionalIdentityService,
    },
  ],
  exports: [AuthService, MockTokenService],
})
export class AuthModule {}
