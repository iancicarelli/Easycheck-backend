import { Module } from '@nestjs/common';
import { AuthController } from './Auth.controller';
import { AuthService } from './application/login.service';
import { MockTokenService } from './application/mock-token.service';
import { AuthRepository } from './infrastructure/in-memory-auth.repository';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, MockTokenService],
})
export class AuthModule {}
