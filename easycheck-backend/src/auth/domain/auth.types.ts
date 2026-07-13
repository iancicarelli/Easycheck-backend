export type AuthRole = 'estudiante' | 'profesor' | 'director' | 'administrador';

export interface LoginDto {
  rut: string;
  password: string;
}

export interface IntranetIdentity {
  rut: string;
  fullName: string;
  email: string;
  role: AuthRole;
}

export interface LoginResult {
  token: string;
  user: {
    rut: string;
    fullName: string;
    email: string;
    role: AuthRole;
  };
  role: AuthRole;
  redirectUrl: string;
}

export interface TokenPayload {
  rut: string;
  role: AuthRole;
}
