import { Inject, Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import {
  InstitutionalUserNotFoundError,
  InvalidRutFormatError,
  InvalidInstitutionalCredentialsError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../domain/user-registration.errors';
import { UserRole } from '../domain/user-role.enum';
import {
  INSTITUTIONAL_IDENTITY_PORT,
  USERS_REPOSITORY_PORT,
} from './user-registration.ports';
import type {
  InstitutionalIdentityPort,
  UsersRepositoryPort,
} from './user-registration.ports';
import { RegisterUserDto } from './register-user.dto';

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(INSTITUTIONAL_IDENTITY_PORT)
    private readonly institutionalIdentity: InstitutionalIdentityPort,
    @Inject(USERS_REPOSITORY_PORT)
    private readonly usersRepository: UsersRepositoryPort,
  ) {}

  async execute(command: RegisterUserDto): Promise<User> {
    const rut = command.rut?.trim() ?? '';
    const institutionalEmail = command.institutionalEmail?.trim() ?? '';
    const institutionalPassword = command.institutionalPassword ?? '';
    const requestedRole = command.role;

    if (!rut) {
      throw new RutRequiredError();
    }

    if (!/^\d{7,8}-[\dkK]$/.test(rut)) {
      throw new InvalidRutFormatError(rut);
    }

    if (!Object.values(UserRole).includes(requestedRole)) {
      throw new RoleNotAllowedError(requestedRole);
    }

    const institutionalUser =
      await this.institutionalIdentity.validateInstitutionalUser({
        rut,
        institutionalEmail,
        institutionalPassword,
      });

    if (!institutionalUser) {
      if (!institutionalEmail.endsWith('@ufromail.cl')) {
        throw new InvalidInstitutionalCredentialsError();
      }
      throw new InstitutionalUserNotFoundError(rut);
    }

    if (institutionalUser.role !== requestedRole) {
      throw new RoleNotAllowedError(requestedRole);
    }

    const alreadyRegistered = await this.usersRepository.existsByRut(rut);
    if (alreadyRegistered) {
      throw new UserAlreadyRegisteredError(rut);
    }

    return this.usersRepository.save({
      rut: institutionalUser.rut,
      institutionalEmail: institutionalUser.institutionalEmail,
      fullName: command.fullName || institutionalUser.fullName,
      role: institutionalUser.role,
    });
  }
}
