import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import {
  NewUser,
  UsersRepositoryPort,
} from '../application/user-registration.ports';

@Injectable()
export class InMemoryUsersRepository implements UsersRepositoryPort {
  private users = new Map<string, User>();

  constructor() {
    this.users.set('44444444-4', {
      id: 'usr-bootstrap-admin',
      rut: '44444444-4',
      institutionalEmail: 'administradora44@ufromail.cl',
      fullName: 'Administradora EasyCheck',
      role: UserRole.ADMINISTRADOR,
      status: 'ACTIVE',
      createdAt: new Date(),
    });
  }

  existsByRut(rut: string): Promise<boolean> {
    return Promise.resolve(this.users.has(rut));
  }

  save(user: NewUser): Promise<User> {
    const created: User = {
      id: `usr-${this.users.size + 1}`,
      ...user,
      status: user.status ?? 'ACTIVE',
      createdAt: new Date(),
    };
    this.users.set(created.rut, created);
    return Promise.resolve(created);
  }

  findByRut(rut: string): Promise<User | null> {
    return Promise.resolve(this.users.get(rut) ?? null);
  }

  reset(): void {
    this.users.clear();
  }
}
