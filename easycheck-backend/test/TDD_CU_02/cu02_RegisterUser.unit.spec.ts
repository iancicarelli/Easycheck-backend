import { RegisterUserService } from '../../src/users/application/register-user.service';
import { RegisterUserDto } from '../../src/users/application/register-user.dto';
import { UserRole } from '../../src/users/domain/user-role.enum';
import {
  InstitutionalUserNotFoundError,
  InvalidInstitutionalCredentialsError,
  InvalidRutFormatError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../../src/users/domain/user-registration.errors';
import { InMemoryInstitutionalIdentityService } from '../../src/users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../../src/users/infrastructure/in-memory-users.repository';

describe('CU-02 RegisterUserService', () => {
  let institutionalIdentity: InMemoryInstitutionalIdentityService;
  let usersRepository: InMemoryUsersRepository;
  let service: RegisterUserService;

  const validCommand = (
    overrides: Partial<RegisterUserDto> = {},
  ): RegisterUserDto => ({
    rut: '12345678-9',
    institutionalEmail: 'a.garcia01@ufromail.cl',
    institutionalPassword: 'ClaveInstitucional123',
    fullName: 'Ana Garcia',
    role: UserRole.ESTUDIANTE,
    ...overrides,
  });

  beforeEach(() => {
    institutionalIdentity = new InMemoryInstitutionalIdentityService();
    usersRepository = new InMemoryUsersRepository();
    institutionalIdentity.reset();
    usersRepository.reset();
    service = new RegisterUserService(institutionalIdentity, usersRepository);
  });

  const seedInstitutionalUser = (
    rut = '12345678-9',
    role = UserRole.ESTUDIANTE,
  ) => {
    institutionalIdentity.seed({
      rut,
      fullName: 'Ana Garcia',
      role,
      password: 'ClaveInstitucional123',
    });
  };

  it('registra usuario institucional con datos validos', async () => {
    seedInstitutionalUser();

    const result = await service.execute(validCommand());

    expect(result).toMatchObject({
      id: 'usr-1',
      rut: '12345678-9',
      institutionalEmail: 'a.garcia01@ufromail.cl',
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
    });
    await expect(usersRepository.existsByRut('12345678-9')).resolves.toBe(
      true,
    );
  });

  it('asigna correo ufromail correlativo cuando dos usuarios comparten inicial y apellido', async () => {
    institutionalIdentity.seed({
      rut: '11111111-1',
      fullName: 'Juanito Perez',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });
    institutionalIdentity.seed({
      rut: '22222222-2',
      fullName: 'Juana Perez',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });

    await expect(
      service.execute(
        validCommand({
          rut: '11111111-1',
          institutionalEmail: 'j.perez01@ufromail.cl',
          fullName: 'Juanito Perez',
        }),
      ),
    ).resolves.toMatchObject({ institutionalEmail: 'j.perez01@ufromail.cl' });
    await expect(
      service.execute(
        validCommand({
          rut: '22222222-2',
          institutionalEmail: 'j.perez02@ufromail.cl',
          fullName: 'Juana Perez',
        }),
      ),
    ).resolves.toMatchObject({ institutionalEmail: 'j.perez02@ufromail.cl' });
  });

  it('rechaza registro cuando el RUT esta vacio', async () => {
    await expect(service.execute(validCommand({ rut: '' }))).rejects.toThrow(
      RutRequiredError,
    );
  });

  it('rechaza registro cuando el formato de RUT es invalido', async () => {
    await expect(
      service.execute(validCommand({ rut: '1234-5678' })),
    ).rejects.toThrow(InvalidRutFormatError);
  });

  it('rechaza usuario institucional inexistente', async () => {
    await expect(service.execute(validCommand())).rejects.toThrow(
      InstitutionalUserNotFoundError,
    );
  });

  it('rechaza credenciales institucionales invalidas', async () => {
    seedInstitutionalUser();

    await expect(
      service.execute(
        validCommand({
          institutionalEmail: 'ana.garcia@gmail.com',
          institutionalPassword: 'clave-incorrecta',
        }),
      ),
    ).rejects.toThrow(InvalidInstitutionalCredentialsError);
  });

  it('rechaza usuario duplicado', async () => {
    seedInstitutionalUser();
    await usersRepository.save({
      rut: '12345678-9',
      institutionalEmail: 'a.garcia01@ufromail.cl',
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
    });

    await expect(service.execute(validCommand())).rejects.toThrow(
      UserAlreadyRegisteredError,
    );
  });

  it('rechaza rol no permitido para registro', async () => {
    seedInstitutionalUser();

    await expect(
      service.execute(validCommand({ role: 'ADMINISTRADOR' as UserRole })),
    ).rejects.toThrow(RoleNotAllowedError);
  });

  it('rechaza rol distinto al rol institucional simulado', async () => {
    seedInstitutionalUser('12345678-9', UserRole.ESTUDIANTE);

    await expect(
      service.execute(validCommand({ role: UserRole.PROFESOR })),
    ).rejects.toThrow(RoleNotAllowedError);
  });
});
