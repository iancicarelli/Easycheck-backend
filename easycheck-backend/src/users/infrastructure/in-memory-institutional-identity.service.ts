import { Injectable } from '@nestjs/common';
import { buildUfromailEmail } from '../../common/ufromail';
import { InstitutionalUser } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import {
  InstitutionalIdentityPort,
  ValidateInstitutionalUserParams,
} from '../application/user-registration.ports';

interface InstitutionalUserRecord extends InstitutionalUser {
  password: string;
}

interface SeedInstitutionalUserRecord
  extends Omit<InstitutionalUser, 'institutionalEmail'> {
  institutionalEmail?: string;
  password: string;
}

@Injectable()
export class InMemoryInstitutionalIdentityService implements InstitutionalIdentityPort {
  private users = new Map<string, InstitutionalUserRecord>();

  constructor() {
    this.seed({
      rut: '12345678-9',
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });
  }

  seed(user: SeedInstitutionalUserRecord): void {
    const institutionalEmail =
      user.institutionalEmail ?? this.nextInstitutionalEmail(user.fullName);
    this.users.set(user.rut, {
      ...user,
      institutionalEmail,
    });
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

  private nextInstitutionalEmail(fullName: string): string {
    return buildUfromailEmail(
      fullName,
      Array.from(this.users.values()).map((user) => user.institutionalEmail),
    );
  }
}
