import { Module } from '@nestjs/common';
import { AuthController } from './Auth.controller';
import { AuthService } from './Auth.service';
import { AuthRepository } from './Auth.repository';
import { UsersModule } from '../users/users.module';

@Module({
  // UsersModule provee el puerto de identidad institucional que AuthService
  // usa para validar la contraseña (CU-01).
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
  exports: [AuthRepository],
})
export class AuthModule {}
