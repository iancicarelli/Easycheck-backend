import { Injectable } from '@nestjs/common';
import { buildUfromailEmail } from '../../common/ufromail';
import { AuthUser, SeedAuthUser, UserRole, UserStatus } from '../domain/auth.types';

@Injectable()
export class AuthRepository {
  private users: AuthUser[] = [];

  constructor() {
    this.seedDefaultInstitutionalUsers();
  }

  reset(): void {
    this.users = [];
  }

  seedUser(
    rut: string,
    role: UserRole,
    status: UserStatus,
    password = 'contrasena_valida',
  ): void {
    this.seedInstitutionalUser({ rut, role, status, password });
  }

  seedInstitutionalUser(user: SeedAuthUser): void {
    const fullName = user.fullName ?? this.defaultNameFor(user.role);
    this.users.push({
      rut: user.rut,
      role: user.role,
      status: user.status,
      password: user.password ?? 'contrasena_valida',
      fullName,
      email: user.email ?? this.nextInstitutionalEmail(fullName),
    });
  }

  findByRut(rut: string): AuthUser | undefined {
    return this.users.find((user) => user.rut === rut);
  }

  private defaultNameFor(role: UserRole): string {
    const names: Record<UserRole, string> = {
      estudiante: 'Usuario Estudiante',
      profesor: 'Usuario Profesor',
      administrador: 'Usuario Administrador',
      director: 'Usuario Director',
    };
    return names[role];
  }

  private nextInstitutionalEmail(fullName: string): string {
    return buildUfromailEmail(
      fullName,
      this.users.map((user) => user.email),
    );
  }

  private seedDefaultInstitutionalUsers(): void {
    this.seedInstitutionalUser({
      rut: '12345678-9',
      role: 'estudiante',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Ana Garcia',
    });
    this.seedInstitutionalUser({
      rut: '98765432-1',
      role: 'profesor',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Profesor EasyCheck',
    });
    this.seedInstitutionalUser({
      rut: '11222333-4',
      role: 'administrador',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Administrador EasyCheck',
    });
    this.seedInstitutionalUser({
      rut: '11112222-3',
      role: 'estudiante',
      status: 'DISABLED',
      password: 'cuenta_deshabilitada',
      fullName: 'Cuenta Deshabilitada',
    });
  }
}
