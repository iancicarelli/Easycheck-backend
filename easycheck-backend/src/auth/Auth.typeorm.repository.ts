import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '../users/domain/user.entity';
import { UserTypeOrmEntity } from '../users/infrastructure/user.typeorm.entity';

/** Historical adapter kept temporarily for import compatibility. */
@Injectable()
export class TypeOrmAuthRepository {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly accounts: Repository<UserTypeOrmEntity>,
  ) {}

  async findByRut(rut: string): Promise<User | null> {
    return this.accounts.findOneBy({ rut });
  }
}
