import { Injectable } from '@nestjs/common';
import { InstitutionalUser } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import {
  InstitutionalIdentityPort,
  ValidateInstitutionalUserParams,
} from '../application/user-registration.ports';

interface InstitutionalUserRecord extends InstitutionalUser {
  password: string;
}

@Injectable()
export class InMemoryInstitutionalIdentityService implements InstitutionalIdentityPort {
  private users = new Map<string, InstitutionalUserRecord>();

  constructor() {
    this.seed({
      rut: '12345678-9',
      institutionalEmail: 'ana.garcia@ufromail.cl',
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });
  }

  seed(user: InstitutionalUserRecord): void {
    this.users.set(user.rut, user);
  }

  reset(): void {
    this.users.clear();
  }

  validateInstitutionalUser(
    params: ValidateInstitutionalUserParams,
  ): Promise<InstitutionalUser | null> {
    const user = this.users.get(params.rut);
    if (
      !user ||
      user.institutionalEmail !== params.institutionalEmail ||
      user.password !== params.institutionalPassword
    ) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      rut: user.rut,
      institutionalEmail: user.institutionalEmail,
      fullName: user.fullName,
      role: user.role,
    });
  }

  verifyPassword(rut: string, password: string): Promise<boolean> {
    const user = this.users.get(rut);
    return Promise.resolve(!!user && user.password === password);
  }
}
