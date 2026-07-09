export type UserRole = 'estudiante' | 'profesor' | 'administrador' | 'director';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface AuthUser {
  rut: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

export interface SeedAuthUser {
  rut: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  fullName?: string;
  email?: string;
}

export interface LoginDto {
  rut: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    rut: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  role: UserRole;
  redirectUrl: string;
}
