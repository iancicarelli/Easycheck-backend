import { Injectable } from '@nestjs/common';
import { UserRole } from '../domain/auth.types';

export interface MockTokenPayload {
  rut: string;
  role: UserRole;
}

@Injectable()
export class MockTokenService {
  create(rut: string, role: UserRole): string {
    return `mock-token-${rut}-${role}`;
  }

  parse(token: string): MockTokenPayload | null {
    const match =
      /^mock-token-(\d{7,8}-[\dkK])-(estudiante|profesor|administrador|director)$/.exec(
        token.trim(),
      );

    if (!match) {
      return null;
    }

    return {
      rut: match[1],
      role: match[2] as UserRole,
    };
  }
}
