import { Injectable, Optional } from '@nestjs/common';
import { AuthRepository } from '../infrastructure/in-memory-auth.repository';
import {
  AccountDisabledException,
  EmptyCredentialsException,
  InvalidCredentialsException,
  InvalidRutFormatException,
} from '../domain/auth.errors';
import { LoginDto, LoginResult, UserRole } from '../domain/auth.types';
import { MockTokenService } from './mock-token.service';

const RUT_WITH_CHECK_DIGIT = /^\d{7,8}-[\dkK]$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    @Optional() private readonly tokenService?: MockTokenService,
  ) {}

  login(dto: LoginDto): LoginResult {
    const rut = dto?.rut ?? '';
    const password = dto?.password ?? '';

    this.assertCredentialsPresent(rut, password);
    this.assertValidRutFormat(rut);

    const user = this.authRepository.findByRut(rut);
    if (!user || user.password !== password) {
      throw new InvalidCredentialsException();
    }
    if (user.status === 'DISABLED') {
      throw new AccountDisabledException(rut);
    }

    return {
      token: this.createMockToken(user.rut, user.role),
      user: {
        rut: user.rut,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
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

  private createMockToken(rut: string, role: UserRole): string {
    return (this.tokenService ?? new MockTokenService()).create(rut, role);
  }
}
