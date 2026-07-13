import { AuthService } from '../../../src/auth/Auth.service';
import type {
  IntranetAuthPort,
  TokenPort,
} from '../../../src/auth/application/auth.ports';
import {
  AccountDisabledException,
  EmptyCredentialsException,
  InvalidCredentialsException,
  InvalidRutFormatException,
} from '../../../src/auth/domain/auth.errors';
import type { UsersRepositoryPort } from '../../../src/users/application/user-registration.ports';
import { UserRole } from '../../../src/users/domain/user-role.enum';

describe('CU-01 AuthService', () => {
  const account = {
    id: 'usr-1',
    rut: '11111111-1',
    institutionalEmail: 'ana11@ufromail.cl',
    fullName: 'Ana Perez',
    role: UserRole.ESTUDIANTE,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  };
  let users: jest.Mocked<UsersRepositoryPort>;
  let intranet: jest.Mocked<IntranetAuthPort>;
  let tokens: jest.Mocked<TokenPort>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      existsByRut: jest.fn(),
      findByRut: jest.fn().mockResolvedValue(account),
      save: jest.fn(),
    };
    intranet = {
      validateCredentials: jest.fn().mockResolvedValue({
        rut: account.rut,
        fullName: account.fullName,
        email: account.institutionalEmail,
        role: 'estudiante',
      }),
    };
    tokens = {
      create: jest.fn().mockReturnValue('token-firmado'),
      parse: jest.fn(),
    };
    service = new AuthService(users, intranet, tokens);
  });

  it('autentica una cuenta activa y retorna perfil y redireccion', async () => {
    await expect(
      service.login({ rut: account.rut, password: 'demo' }),
    ).resolves.toEqual({
      token: 'token-firmado',
      user: {
        rut: account.rut,
        fullName: account.fullName,
        email: account.institutionalEmail,
        role: 'estudiante',
      },
      role: 'estudiante',
      redirectUrl: '/estudiante/home',
    });
  });

  it('rechaza campos obligatorios vacios', async () => {
    await expect(service.login({ rut: '', password: '' })).rejects.toThrow(
      EmptyCredentialsException,
    );
  });

  it('rechaza un RUT sin digito verificador', async () => {
    await expect(
      service.login({ rut: '11111111', password: 'demo' }),
    ).rejects.toThrow(InvalidRutFormatException);
  });

  it('rechaza una cuenta local inexistente', async () => {
    users.findByRut.mockResolvedValue(null);
    await expect(
      service.login({ rut: account.rut, password: 'demo' }),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('rechaza credenciales no validadas por Intranet', async () => {
    intranet.validateCredentials.mockResolvedValue(null);
    await expect(
      service.login({ rut: account.rut, password: 'incorrecta' }),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('rechaza una cuenta deshabilitada antes de consultar Intranet', async () => {
    users.findByRut.mockResolvedValue({ ...account, status: 'DISABLED' });
    await expect(
      service.login({ rut: account.rut, password: 'demo' }),
    ).rejects.toThrow(AccountDisabledException);
    expect(intranet.validateCredentials.mock.calls).toHaveLength(0);
  });
});
