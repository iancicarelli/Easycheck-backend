import { InstitutionalUser, User } from '../domain/user.entity';

export interface ValidateInstitutionalUserParams {
  rut: string;
  institutionalEmail: string;
  institutionalPassword: string;
}

export interface InstitutionalIdentityPort {
  validateInstitutionalUser(
    params: ValidateInstitutionalUserParams,
  ): Promise<InstitutionalUser | null>;

  /**
   * Verifica que la contraseña institucional corresponda al RUT dado.
   * Usado por el login (CU-01), que sólo dispone de { rut, password } y no
   * del correo institucional. Devuelve false si el RUT no existe o la
   * contraseña no coincide.
   */
  verifyPassword(rut: string, password: string): Promise<boolean>;
}

export interface UsersRepositoryPort {
  existsByRut(rut: string): Promise<boolean>;
  save(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

export const INSTITUTIONAL_IDENTITY_PORT = Symbol(
  'INSTITUTIONAL_IDENTITY_PORT',
);
export const USERS_REPOSITORY_PORT = Symbol('USERS_REPOSITORY_PORT');
