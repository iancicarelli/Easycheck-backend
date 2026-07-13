import { UserRole } from './user-role.enum';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  rut: string;
  institutionalEmail: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export interface InstitutionalUser {
  rut: string;
  institutionalEmail: string;
  fullName: string;
  role: UserRole;
}
