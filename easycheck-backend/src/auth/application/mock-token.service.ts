import { Injectable } from '@nestjs/common';
import type { TokenPort } from './auth.ports';
import type { AuthRole, TokenPayload } from '../domain/auth.types';

@Injectable()
export class MockTokenService implements TokenPort {
  create(rut: string, role: AuthRole): string {
    return `mock-token-${rut}-${role}`;
  }

  parse(token: string): TokenPayload | null {
    const match =
      /^mock-token-(\d{7,8}-[\dkK])-(estudiante|profesor|administrador|director)$/.exec(
        token.trim(),
      );
    if (!match) return null;
    return { rut: match[1], role: match[2] as AuthRole };
  }
}
