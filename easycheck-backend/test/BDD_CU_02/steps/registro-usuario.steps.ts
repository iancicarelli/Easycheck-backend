import { TestingModule, Test } from '@nestjs/testing';
import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { RegisterUserDto } from '../../../src/users/application/register-user.dto';
import { RegisterUserService } from '../../../src/users/application/register-user.service';
import { User } from '../../../src/users/domain/user.entity';
import { UserRole } from '../../../src/users/domain/user-role.enum';
import {
  InstitutionalUserNotFoundError,
  InvalidRutFormatError,
  InvalidInstitutionalCredentialsError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../../../src/users/domain/user-registration.errors';
import { InMemoryInstitutionalIdentityService } from '../../../src/users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';
import { UsersModule } from '../../../src/users/users.module';

const feature = loadFeature('test/BDD_CU_02/features/registro-usuario.feature');

defineFeature(feature, (test) => {
  let moduleRef: TestingModule;
  let registerUserService: RegisterUserService;
  let institutionalIdentity: InMemoryInstitutionalIdentityService;
  let usersRepository: InMemoryUsersRepository;
  let command: RegisterUserDto;
  let result: User | null;
  let capturedError: unknown;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    registerUserService = moduleRef.get(RegisterUserService);
    institutionalIdentity = moduleRef.get(InMemoryInstitutionalIdentityService);
    usersRepository = moduleRef.get(InMemoryUsersRepository);
    institutionalIdentity.reset();
    usersRepository.reset();
    result = null;
    capturedError = null;
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const buildCommand = (
    rut: string,
    credentialMode: 'validas' | 'invalidas',
    role: UserRole | string = UserRole.ESTUDIANTE,
  ): RegisterUserDto => ({
    rut,
    institutionalEmail:
      credentialMode === 'validas'
        ? 'a.garcia01@ufromail.cl'
        : 'ana.garcia@gmail.com',
    institutionalPassword:
      credentialMode === 'validas'
        ? 'ClaveInstitucional123'
        : 'clave-incorrecta',
    fullName: 'Ana Garcia',
    role: role as UserRole,
  });

  const seedInstitutionalUser = (rut: string) => {
    institutionalIdentity.seed({
      rut,
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });
  };

  const givenInstitutionalSystemAvailable = (given: DefineStepFunction) => {
    given('el sistema institucional UFRO se encuentra disponible', () => {
      expect(institutionalIdentity).toBeDefined();
    });
  };

  const givenInstitutionalUserExists = (given: DefineStepFunction) => {
    given(
      /^existe el usuario institucional con RUT "([^"]*)"$/,
      (rut: string) => {
        seedInstitutionalUser(rut);
      },
    );
  };

  const givenInstitutionalUserDoesNotExist = (given: DefineStepFunction) => {
    given(
      /^no existe el usuario institucional con RUT "([^"]*)"$/,
      (rut: string) => {
        institutionalIdentity.reset();
        command = buildCommand(rut, 'validas');
      },
    );
  };

  const givenEasyCheckUserIsNotRegistered = (given: DefineStepFunction) => {
    given(
      /^el usuario con RUT "([^"]*)" no esta registrado en EasyCheck$/,
      async (rut: string) => {
        expect(await usersRepository.existsByRut(rut)).toBe(false);
      },
    );
  };

  const givenEasyCheckUserAlreadyRegistered = (given: DefineStepFunction) => {
    given(
      /^el usuario con RUT "([^"]*)" ya esta registrado en EasyCheck$/,
      async (rut: string) => {
        await usersRepository.save({
          rut,
          institutionalEmail: 'a.garcia01@ufromail.cl',
          fullName: 'Ana Garcia',
          role: UserRole.ESTUDIANTE,
        });
      },
    );
  };

  const whenAdministrativeRegistersUser = (when: DefineStepFunction) => {
    when(
      /^el administrativo registra al usuario con RUT "([^"]*)" y credenciales (validas|invalidas)$/,
      async (rut: string, credentialMode: 'validas' | 'invalidas') => {
        command = buildCommand(rut, credentialMode);
        try {
          result = await registerUserService.execute(command);
        } catch (error) {
          capturedError = error;
        }
      },
    );
  };

  const whenAdministrativeRegistersUserWithRole = (
    when: DefineStepFunction,
  ) => {
    when(
      /^el administrativo registra al usuario con RUT "([^"]*)" y rol "([^"]*)"$/,
      async (rut: string, role: string) => {
        command = buildCommand(rut, 'validas', role);
        try {
          result = await registerUserService.execute(command);
        } catch (error) {
          capturedError = error;
        }
      },
    );
  };

  const thenAccountIsCreated = (then: DefineStepFunction) => {
    then(
      /^el sistema registra la cuenta con rol "([^"]*)"$/,
      async (role: string) => {
        expect(capturedError).toBeNull();
        expect(result).toMatchObject({
          rut: command.rut,
          role,
          institutionalEmail: command.institutionalEmail,
        });
        expect(await usersRepository.existsByRut(command.rut)).toBe(true);
      },
    );
  };

  const thenDuplicatedUserIsReported = (then: DefineStepFunction) => {
    then('el sistema informa que el usuario ya se encuentra registrado', () => {
      expect(result).toBeNull();
      expect(capturedError).toBeInstanceOf(UserAlreadyRegisteredError);
    });
  };

  const thenUniversityMembershipIsReported = (then: DefineStepFunction) => {
    then(
      'el sistema informa que el usuario no pertenece a la universidad',
      () => {
        expect(result).toBeNull();
        expect(capturedError).toBeInstanceOf(InstitutionalUserNotFoundError);
      },
    );
  };

  const thenInvalidCredentialsAreReported = (then: DefineStepFunction) => {
    then(
      'el sistema informa que las credenciales institucionales son invalidas',
      () => {
        expect(result).toBeNull();
        expect(capturedError).toBeInstanceOf(
          InvalidInstitutionalCredentialsError,
        );
      },
    );
  };

  const thenRoleNotAllowedIsReported = (then: DefineStepFunction) => {
    then('el sistema informa que el rol no es permitido para registro', () => {
      expect(result).toBeNull();
      expect(capturedError).toBeInstanceOf(RoleNotAllowedError);
    });
  };

  const thenInvalidRutFormatIsReported = (then: DefineStepFunction) => {
    then('el sistema informa que el formato del RUT es invalido', () => {
      expect(result).toBeNull();
      expect(capturedError).toBeInstanceOf(InvalidRutFormatError);
    });
  };

  const thenRutRequiredIsReported = (then: DefineStepFunction) => {
    then('el sistema informa que el RUT no puede estar vacio', () => {
      expect(result).toBeNull();
      expect(capturedError).toBeInstanceOf(RutRequiredError);
    });
  };

  const bindSuccessfulRegistration = ({
    given,
    and,
    when,
    then,
  }: {
    given: DefineStepFunction;
    and: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenInstitutionalUserExists(given);
    givenEasyCheckUserIsNotRegistered(and);
    whenAdministrativeRegistersUser(when);
    thenAccountIsCreated(then);
  };

  const bindDuplicatedUser = ({
    given,
    and,
    when,
    then,
  }: {
    given: DefineStepFunction;
    and: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenInstitutionalUserExists(given);
    givenEasyCheckUserAlreadyRegistered(and);
    whenAdministrativeRegistersUser(when);
    thenDuplicatedUserIsReported(then);
  };

  const bindNonexistentUser = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenInstitutionalUserDoesNotExist(given);
    whenAdministrativeRegistersUser(when);
    thenUniversityMembershipIsReported(then);
  };

  const bindInvalidCredentials = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenInstitutionalUserExists(given);
    whenAdministrativeRegistersUser(when);
    thenInvalidCredentialsAreReported(then);
  };

  const bindRoleNotAllowed = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenInstitutionalUserExists(given);
    whenAdministrativeRegistersUserWithRole(when);
    thenRoleNotAllowedIsReported(then);
  };

  const bindInvalidRutFormat = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    whenAdministrativeRegistersUser(when);
    thenInvalidRutFormatIsReported(then);
  };

  const bindEmptyFields = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    whenAdministrativeRegistersUser(when);
    thenRutRequiredIsReported(then);
  };

  test('Registro exitoso', bindSuccessfulRegistration);
  test('Usuario duplicado', bindDuplicatedUser);
  test('Usuario inexistente', bindNonexistentUser);
  test('Credenciales invalidas', bindInvalidCredentials);
  test('Registro con rol no permitido', bindRoleNotAllowed);
  test('Registro con formato de RUT invalido', bindInvalidRutFormat);
  test('Registro con campos vacios', bindEmptyFields);
});
