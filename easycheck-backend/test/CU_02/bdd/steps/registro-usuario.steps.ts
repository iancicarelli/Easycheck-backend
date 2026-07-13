import { TestingModule, Test } from '@nestjs/testing';
import { defineFeature, loadFeature, DefineStepFunction } from 'jest-cucumber';
import { RegisterUserDto } from '../../../../src/users/application/register-user.dto';
import { RegisterUserService } from '../../../../src/users/application/register-user.service';
import { User } from '../../../../src/users/domain/user.entity';
import { UserRole } from '../../../../src/users/domain/user-role.enum';
import {
  InstitutionalUserNotFoundError,
  InvalidRutFormatError,
  InvalidInstitutionalCredentialsError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../../../../src/users/domain/user-registration.errors';
import { InMemoryInstitutionalIdentityService } from '../../../../src/users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../../../../src/users/infrastructure/in-memory-users.repository';
import { UsersModule } from '../../../../src/users/users.module';

const feature = loadFeature('test/CU_02/bdd/features/registro-usuario.feature');

// Un usuario pertenece a la UFRO si su correo termina en @ufromail.cl y su
// parte local tiene exactamente 2 digitos (ver InMemoryInstitutionalIdentityService).
const VALID_INSTITUTIONAL_EMAIL = 'ana.garcia22@ufromail.cl';
// Correo @ufromail.cl pero sin los 2 digitos requeridos: no pertenece a la UFRO.
const INSTITUTIONAL_EMAIL_WITHOUT_NUMERIC_ID = 'ana.garcia@ufromail.cl';
// Correo que no es institucional: credenciales invalidas.
const NON_INSTITUTIONAL_EMAIL = 'ana.garcia@gmail.com';

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
        ? VALID_INSTITUTIONAL_EMAIL
        : NON_INSTITUTIONAL_EMAIL,
    institutionalPassword:
      credentialMode === 'validas'
        ? 'ClaveInstitucional123'
        : 'clave-incorrecta',
    fullName: 'Ana Garcia',
    role: role as UserRole,
  });

  const registerWithCommand = async (dto: RegisterUserDto) => {
    command = dto;
    try {
      result = await registerUserService.execute(command);
    } catch (error) {
      capturedError = error;
    }
  };

  const givenInstitutionalSystemAvailable = (given: DefineStepFunction) => {
    given('el sistema institucional UFRO se encuentra disponible', () => {
      expect(institutionalIdentity).toBeDefined();
    });
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
          institutionalEmail: VALID_INSTITUTIONAL_EMAIL,
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
        await registerWithCommand(buildCommand(rut, credentialMode));
      },
    );
  };

  const whenAdministrativeRegistersUserWithoutNumericId = (
    when: DefineStepFunction,
  ) => {
    when(
      /^el administrativo registra al usuario con RUT "([^"]*)" y un correo institucional sin identificador numerico$/,
      async (rut: string) => {
        await registerWithCommand({
          rut,
          institutionalEmail: INSTITUTIONAL_EMAIL_WITHOUT_NUMERIC_ID,
          institutionalPassword: 'ClaveInstitucional123',
          fullName: 'Ana Garcia',
          role: UserRole.ESTUDIANTE,
        });
      },
    );
  };

  const whenAdministrativeRegistersUserWithRole = (
    when: DefineStepFunction,
  ) => {
    when(
      /^el administrativo registra al usuario con RUT "([^"]*)" y rol "([^"]*)"$/,
      async (rut: string, role: string) => {
        await registerWithCommand(buildCommand(rut, 'validas', role));
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
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenEasyCheckUserIsNotRegistered(given);
    whenAdministrativeRegistersUser(when);
    thenAccountIsCreated(then);
  };

  const bindDuplicatedUser = ({
    given,
    when,
    then,
  }: {
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
  }) => {
    givenInstitutionalSystemAvailable(given);
    givenEasyCheckUserAlreadyRegistered(given);
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
    whenAdministrativeRegistersUserWithoutNumericId(when);
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
  test('Usuario que no pertenece a la universidad', bindNonexistentUser);
  test('Credenciales invalidas', bindInvalidCredentials);
  test('Registro con rol no permitido', bindRoleNotAllowed);
  test('Registro con formato de RUT invalido', bindInvalidRutFormat);
  test('Registro con campos vacios', bindEmptyFields);
});
