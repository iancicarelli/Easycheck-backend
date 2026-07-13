import { InMemoryUsersRepository } from '../../src/users/infrastructure/in-memory-users.repository';
import { UserRole } from '../../src/users/domain/user-role.enum';

export async function seedAccount(
  users: InMemoryUsersRepository,
  rut: string,
  role: UserRole,
  status: 'ACTIVE' | 'DISABLED' = 'ACTIVE',
): Promise<void> {
  await users.save({
    rut,
    institutionalEmail: `${rut.replace('-', '')}@ufromail.cl`,
    fullName: `Cuenta ${rut}`,
    role,
    status,
  });
}

export const READER_HEADERS = { 'x-reader-key': 'easycheck-local-reader-key' };
