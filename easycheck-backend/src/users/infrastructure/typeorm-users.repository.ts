import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import {
  NewUser,
  UsersRepositoryPort,
} from '../application/user-registration.ports';
import { UserTypeOrmEntity } from './user.typeorm.entity';

/**
 * Adapter Postgres/TypeORM del puerto UsersRepositoryPort (CU-02).
 * Se enlaza al token USERS_REPOSITORY_PORT cuando `DB_HOST` está definido;
 * en tests/local sin DB se usa InMemoryUsersRepository.
 */
@Injectable()
export class TypeOrmUsersRepository implements UsersRepositoryPort {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly users: Repository<UserTypeOrmEntity>,
  ) {}

  async existsByRut(rut: string): Promise<boolean> {
    return this.users.existsBy({ rut });
  }

  async save(user: NewUser): Promise<User> {
    return this.users.save(
      this.users.create({ ...user, status: user.status ?? 'ACTIVE' }),
    );
  }

  async findByRut(rut: string): Promise<User | null> {
    return this.users.findOneBy({ rut });
  }
}
