import type {
  AuthRole,
  IntranetIdentity,
  TokenPayload,
} from '../domain/auth.types';

export interface IntranetAuthPort {
  validateCredentials(
    rut: string,
    password: string,
  ): Promise<IntranetIdentity | null>;
}

export interface TokenPort {
  create(rut: string, role: AuthRole): string;
  parse(token: string): TokenPayload | null;
}

export const INTRANET_AUTH_PORT = Symbol('INTRANET_AUTH_PORT');
export const TOKEN_PORT = Symbol('TOKEN_PORT');
