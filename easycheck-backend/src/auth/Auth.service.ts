import { Inject, Injectable } from '@nestjs/common';
import { INTRANET_AUTH_PORT, TOKEN_PORT } from './application/auth.ports';
import type { IntranetAuthPort, TokenPort } from './application/auth.ports';
import {
  AccountDisabledException,
  EmptyCredentialsException,
  InvalidCredentialsException,
  InvalidRutFormatException,
} from './domain/auth.errors';
import type { AuthRole, LoginDto, LoginResult } from './domain/auth.types';
import { UserRole } from '../users/domain/user-role.enum';
import { USERS_REPOSITORY_PORT } from '../users/application/user-registration.ports';
import type { UsersRepositoryPort } from '../users/application/user-registration.ports';

const RUT_WITH_CHECK_DIGIT = /^\d{7,8}-[\dkK]$/;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY_PORT)
    private readonly accounts: UsersRepositoryPort,
    @Inject(INTRANET_AUTH_PORT)
    private readonly intranetAuth: IntranetAuthPort,
    @Inject(TOKEN_PORT)
    private readonly tokenService: TokenPort,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const rut = dto?.rut?.trim() ?? '';
    const password = dto?.password ?? '';

    this.assertCredentialsPresent(rut, password);
    this.assertValidRutFormat(rut);

    const account = await this.accounts.findByRut(rut);
    if (!account) throw new InvalidCredentialsException();
    if (account.status === 'DISABLED') {
      throw new AccountDisabledException(rut);
    }

    const identity = await this.intranetAuth.validateCredentials(rut, password);
    if (!identity) throw new InvalidCredentialsException();

    const role = this.toAuthRole(account.role);
    return {
      token: this.tokenService.create(account.rut, role),
      user: {
        rut: account.rut,
        fullName: account.fullName,
        email: account.institutionalEmail,
        role,
      },
      role,
      redirectUrl: `/${role}/home`,
    };
  }

  private assertCredentialsPresent(rut: string, password: string): void {
    const missingFields: string[] = [];
    if (!rut) missingFields.push('rut');
    if (!password) missingFields.push('password');
    if (missingFields.length > 0) {
      throw new EmptyCredentialsException(missingFields);
    }
  }

  private assertValidRutFormat(rut: string): void {
    if (!RUT_WITH_CHECK_DIGIT.test(rut)) {
      throw new InvalidRutFormatException(rut);
    }
  }

  private toAuthRole(role: UserRole): AuthRole {
    const roles: Record<UserRole, AuthRole> = {
      [UserRole.ESTUDIANTE]: 'estudiante',
      [UserRole.PROFESOR]: 'profesor',
      [UserRole.DIRECTOR_CARRERA]: 'director',
      [UserRole.ADMINISTRADOR]: 'administrador',
    };
    return roles[role];
  }
}

export type { LoginDto, LoginResult } from './domain/auth.types';
