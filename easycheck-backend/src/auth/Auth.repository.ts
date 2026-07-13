import { Injectable } from '@nestjs/common';
import type { AuthRole } from './domain/auth.types';
import { InMemoryInstitutionalIdentityService } from '../users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../users/infrastructure/in-memory-users.repository';
import { UserRole } from '../users/domain/user-role.enum';
import type { UserStatus } from '../users/domain/user.entity';

/** Compatibility facade used by the existing CU-01 tests. */
@Injectable()
export class AuthRepository {
  constructor(
    private readonly accounts: InMemoryUsersRepository,
    private readonly intranet: InMemoryInstitutionalIdentityService,
  ) {}

  reset(): void {
    this.accounts.reset();
    this.intranet.resetCredentials();
  }

  seedUser(
    rut: string,
    role: AuthRole,
    status: UserStatus,
    password = 'demo',
  ): void {
    const fullName = `Usuario ${role}`;
    const digits = rut.replace(/\D/g, '').slice(-2).padStart(2, '0');
    const email = `${role}.${digits}@ufromail.cl`;
    void this.accounts.save({
      rut,
      institutionalEmail: email,
      fullName,
      role: this.toUserRole(role),
      status,
    });
    this.intranet.seedCredential({ rut, password, fullName, email, role });
  }

  private toUserRole(role: AuthRole): UserRole {
    const roles: Record<AuthRole, UserRole> = {
      estudiante: UserRole.ESTUDIANTE,
      profesor: UserRole.PROFESOR,
      director: UserRole.DIRECTOR_CARRERA,
      administrador: UserRole.ADMINISTRADOR,
    };
    return roles[role];
  }
}

export type { AuthRole as UserRole } from './domain/auth.types';
export type { UserStatus } from '../users/domain/user.entity';
