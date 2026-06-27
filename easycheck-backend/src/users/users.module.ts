import { Module } from '@nestjs/common';
import { RegisterUserService } from './application/register-user.service';
import {
  INSTITUTIONAL_IDENTITY_PORT,
  USERS_REPOSITORY_PORT,
} from './application/user-registration.ports';
import { InMemoryInstitutionalIdentityService } from './infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from './infrastructure/in-memory-users.repository';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    RegisterUserService,
    InMemoryInstitutionalIdentityService,
    InMemoryUsersRepository,
    {
      provide: INSTITUTIONAL_IDENTITY_PORT,
      useExisting: InMemoryInstitutionalIdentityService,
    },
    {
      provide: USERS_REPOSITORY_PORT,
      useExisting: InMemoryUsersRepository,
    },
  ],
  exports: [
    RegisterUserService,
    InMemoryInstitutionalIdentityService,
    InMemoryUsersRepository,
    // Exportado para que AuthModule (login, CU-01) pueda inyectar el puerto y
    // delegar la verificación de contraseña institucional.
    INSTITUTIONAL_IDENTITY_PORT,
  ],
})
export class UsersModule {}
