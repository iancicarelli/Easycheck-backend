import { RegisterUserService } from '../../../src/users/application/register-user.service';
import type {
  InstitutionalIdentityPort,
  UsersRepositoryPort,
} from '../../../src/users/application/user-registration.ports';
import {
  InstitutionalUserNotFoundError,
  InvalidInstitutionalCredentialsError,
  InvalidRutFormatError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../../../src/users/domain/user-registration.errors';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { SubjectRepository } from '../../../src/subject/Subject.repository';

describe('CU-02 RegisterUserService', () => {
  const command = {
    rut: '12345678-9',
    institutionalEmail: 'ana22@ufromail.cl',
    institutionalPassword: 'Clave123',
    fullName: 'Ana Garcia',
    role: UserRole.ESTUDIANTE,
  };
  let identity: jest.Mocked<InstitutionalIdentityPort>;
  let users: jest.Mocked<UsersRepositoryPort>;
  let data: DataRepository;
  let subjects: SubjectRepository;
  let service: RegisterUserService;

  beforeEach(() => {
    identity = {
      validateInstitutionalUser: jest.fn().mockResolvedValue({
        rut: command.rut,
        institutionalEmail: command.institutionalEmail,
        fullName: command.fullName,
        role: command.role,
      }),
    };
    users = {
      existsByRut: jest.fn().mockResolvedValue(false),
      findByRut: jest.fn(),
      save: jest.fn().mockResolvedValue({
        id: 'usr-1',
        rut: command.rut,
        institutionalEmail: command.institutionalEmail,
        fullName: command.fullName,
        role: command.role,
        status: 'ACTIVE',
        createdAt: new Date(),
      }),
    };
    data = new DataRepository();
    subjects = new SubjectRepository();
    service = new RegisterUserService(identity, users, data, subjects);
  });

  it('registra una cuenta institucional activa', async () => {
    await expect(service.execute(command)).resolves.toMatchObject({
      rut: command.rut,
      role: UserRole.ESTUDIANTE,
      status: 'ACTIVE',
    });
  });

  it('inscribe al estudiante en todas las asignaturas existentes', async () => {
    await subjects.save({ code: 'ICC-101', name: 'Intro', career: 'ICC' });
    await subjects.save({ code: 'ICC-202', name: 'Datos', career: 'ICC' });

    await service.execute(command);

    expect(await data.findStudent(command.rut)).not.toBeNull();
    expect(await data.isStudentEnrolled(command.rut, 'ICC-101')).toBe(true);
    expect(await data.isStudentEnrolled(command.rut, 'ICC-202')).toBe(true);
    expect(await data.countEnrollments()).toBe(2);
  });

  it('no inscribe asignaturas cuando el rol no es estudiante', async () => {
    identity.validateInstitutionalUser.mockResolvedValue({
      rut: command.rut,
      institutionalEmail: command.institutionalEmail,
      fullName: command.fullName,
      role: UserRole.PROFESOR,
    });
    await subjects.save({ code: 'ICC-101', name: 'Intro', career: 'ICC' });

    await service.execute({ ...command, role: UserRole.PROFESOR });

    expect(await data.countEnrollments()).toBe(0);
  });

  it('rechaza un RUT vacio', async () => {
    await expect(service.execute({ ...command, rut: '' })).rejects.toThrow(
      RutRequiredError,
    );
  });

  it('rechaza formato de RUT invalido', async () => {
    await expect(
      service.execute({ ...command, rut: '1234-5678' }),
    ).rejects.toThrow(InvalidRutFormatError);
  });

  it('rechaza registrar rol administrador', async () => {
    await expect(
      service.execute({ ...command, role: UserRole.ADMINISTRADOR }),
    ).rejects.toThrow(RoleNotAllowedError);
  });

  it('distingue credenciales externas invalidas', async () => {
    identity.validateInstitutionalUser.mockResolvedValue(null);
    await expect(
      service.execute({ ...command, institutionalEmail: 'ana@gmail.com' }),
    ).rejects.toThrow(InvalidInstitutionalCredentialsError);
  });

  it('distingue un usuario que no pertenece a la universidad', async () => {
    identity.validateInstitutionalUser.mockResolvedValue(null);
    await expect(service.execute(command)).rejects.toThrow(
      InstitutionalUserNotFoundError,
    );
  });

  it('rechaza una cuenta ya registrada', async () => {
    users.existsByRut.mockResolvedValue(true);
    await expect(service.execute(command)).rejects.toThrow(
      UserAlreadyRegisteredError,
    );
  });
});
