import { Inject, Injectable } from '@nestjs/common';
import { AuthRepository, UserRole } from './Auth.repository';
import { INSTITUTIONAL_IDENTITY_PORT } from '../users/application/user-registration.ports';
import type { InstitutionalIdentityPort } from '../users/application/user-registration.ports';
import {
  EmptyCredentialsException,
  InvalidRutFormatException,
  AccountDisabledException,
  InvalidCredentialsException,
} from '../common/exceptions';

export interface LoginDto {
  rut: string;
  password: string;
}

export interface LoginResult {
  role: string;
  redirectUrl: string;
}

// RUT con dígito verificador: 7-8 dígitos, guion y DV (dígito o K).
const RUT_WITH_CHECK_DIGIT = /^\d{7,8}-[\dkK]$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    @Inject(INSTITUTIONAL_IDENTITY_PORT)
    private readonly institutionalIdentity: InstitutionalIdentityPort,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const rut = dto?.rut ?? '';
    const password = dto?.password ?? '';

    this.assertCredentialsPresent(rut, password);
    this.assertValidRutFormat(rut);

    const user = this.authRepository.findByRut(rut);
    if (!user) {
      throw new InvalidCredentialsException();
    }
    if (user.status === 'DISABLED') {
      throw new AccountDisabledException(rut);
    }

    // Validación real de contraseña delegada al sistema institucional (CU-01).
    // AuthRepository sólo conoce { rut, role, status }; las credenciales viven
    // en InMemoryInstitutionalIdentityService.
    const passwordValid = await this.institutionalIdentity.verifyPassword(
      rut,
      password,
    );
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    return {
      role: user.role,
      redirectUrl: this.homeUrlFor(user.role),
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

  private homeUrlFor(role: UserRole): string {
    return `/${role}/home`;
  }
}
