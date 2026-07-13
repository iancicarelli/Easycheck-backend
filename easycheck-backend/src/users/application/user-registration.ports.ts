import { InstitutionalUser, User } from '../domain/user.entity';

export type NewUser = Omit<User, 'id' | 'createdAt' | 'status'> & {
  status?: User['status'];
};

export interface ValidateInstitutionalUserParams {
  rut: string;
  institutionalEmail: string;
  institutionalPassword: string;
}

export interface InstitutionalIdentityPort {
  validateInstitutionalUser(
    params: ValidateInstitutionalUserParams,
  ): Promise<InstitutionalUser | null>;
}

export interface UsersRepositoryPort {
  existsByRut(rut: string): Promise<boolean>;
  findByRut(rut: string): Promise<User | null>;
  save(user: NewUser): Promise<User>;
}

export const INSTITUTIONAL_IDENTITY_PORT = Symbol(
  'INSTITUTIONAL_IDENTITY_PORT',
);
export const USERS_REPOSITORY_PORT = Symbol('USERS_REPOSITORY_PORT');
