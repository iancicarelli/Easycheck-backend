import { loadFeature, defineFeature } from 'jest-cucumber';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../../../src/auth/Auth.module';
import { AuthRepository } from '../../../src/auth/Auth.repository';
import { InMemoryInstitutionalIdentityService } from '../../../src/users/infrastructure/in-memory-institutional-identity.service';
import { UserRole } from '../../../src/users/domain/user-role.enum';

const feature = loadFeature('./test/BDD/features/Login.feature');

// supertest expone res.body como `any`; tipamos la forma esperada de la respuesta.
interface LoginResponseBody {
  role?: string;
  redirectUrl?: string;
  message?: string;
  fields?: string[];
}

defineFeature(feature, (test) => {
  let app: INestApplication<App>;
  let repo: AuthRepository;
  let institutional: InMemoryInstitutionalIdentityService;
  let response: request.Response;

  // Siembra las credenciales institucionales con la MISMA contraseña que usa
  // el escenario, para que la validación real de password del login pase. El
  // .feature no cambia: el rol/correo aquí son irrelevantes para verifyPassword.
  const seedInstitutionalCredentials = (
    rut: string,
    password: string,
    role: UserRole,
  ) => {
    institutional.seed({
      rut,
      institutionalEmail: `${rut}@ufromail.cl`,
      fullName: 'Usuario de prueba',
      role,
      password,
    });
  };

  // ── Setup compartido (igual que tu integration spec) ──────────────────────
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    repo = moduleRef.get<AuthRepository>(AuthRepository);
    institutional = moduleRef.get<InMemoryInstitutionalIdentityService>(
      InMemoryInstitutionalIdentityService,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repo.reset();
    institutional.reset();
  });

  // ==========================================================================
  // Scenario: Inicio de sesión exitoso como estudiante
  // ==========================================================================
  test('Inicio de sesión exitoso como estudiante', ({
    given,
    and,
    when,
    then,
  }) => {
    let rutIngresado: string;
    let passwordIngresada: string;

    given(
      /^el usuario con RUT "(.*)" está registrado en el sistema con rol "estudiante"$/,
      (rut: string) => {
        // Precondición: seed del usuario en el repo in-memory
        repo.seedUser(rut, 'estudiante', 'ACTIVE');
      },
    );

    and('el usuario se encuentra en el formulario de inicio de sesión', () => {
      // No requiere acción, es contexto UI
    });

    when(/^el usuario ingresa el RUT "(.*)"$/, (rut: string) => {
      rutIngresado = rut;
    });

    and(/^el usuario ingresa la contraseña "(.*)"$/, (password: string) => {
      passwordIngresada = password;
      // Credencial institucional coherente con la contraseña del escenario.
      seedInstitutionalCredentials(rutIngresado, password, UserRole.ESTUDIANTE);
    });

    and('el usuario selecciona "Entrar"', async () => {
      // Aquí ocurre la llamada HTTP real
      response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: rutIngresado, password: passwordIngresada });
    });

    then('el sistema autentica al usuario correctamente', () => {
      expect(response.status).toBe(HttpStatus.OK);
    });

    and(
      'el usuario es redirigido a la pantalla principal de estudiante',
      () => {
        const body = response.body as LoginResponseBody;
        expect(body.redirectUrl).toBe('/estudiante/home');
        expect(body.role).toBe('estudiante');
      },
    );
  });

  // ==========================================================================
  // Scenario: Inicio de sesión exitoso como profesor
  // ==========================================================================
  test('Inicio de sesión exitoso como profesor', ({
    given,
    and,
    when,
    then,
  }) => {
    let rutIngresado: string;
    let passwordIngresada: string;

    given(
      /^el usuario con RUT "(.*)" está registrado en el sistema con rol "profesor"$/,
      (rut: string) => {
        repo.seedUser(rut, 'profesor', 'ACTIVE');
      },
    );

    and(
      'el usuario se encuentra en el formulario de inicio de sesión',
      () => {},
    );

    when(/^el usuario ingresa el RUT "(.*)"$/, (rut: string) => {
      rutIngresado = rut;
    });

    and(/^el usuario ingresa la contraseña "(.*)"$/, (password: string) => {
      passwordIngresada = password;
      // Credencial institucional coherente con la contraseña del escenario.
      seedInstitutionalCredentials(rutIngresado, password, UserRole.PROFESOR);
    });

    and('el usuario selecciona "Entrar"', async () => {
      response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: rutIngresado, password: passwordIngresada });
    });

    then('el sistema autentica al usuario correctamente', () => {
      expect(response.status).toBe(HttpStatus.OK);
    });

    and('el usuario es redirigido a la pantalla principal de profesor', () => {
      const body = response.body as LoginResponseBody;
      expect(body.redirectUrl).toBe('/profesor/home');
      expect(body.role).toBe('profesor');
    });
  });

  // ==========================================================================
  // Scenario: Inicio de sesión con campos vacíos
  // ==========================================================================
  test('Inicio de sesión con campos vacíos', ({ given, when, and, then }) => {
    given(
      'el usuario se encuentra en el formulario de inicio de sesión',
      () => {},
    );

    when('el usuario deja el campo RUT vacío', () => {});

    and('el usuario deja el campo contraseña vacío', () => {});

    and('el usuario selecciona "Entrar"', async () => {
      response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: '', password: '' });
    });

    then('el sistema no envía el formulario', () => {
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    and(/^se muestra el mensaje "(.*)"$/, (mensaje: string) => {
      const body = response.body as LoginResponseBody;
      expect(body.message).toBe(mensaje);
    });

    and('se marcan en rojo los campos vacíos', () => {
      // Validación de campos: el backend indica cuáles fallaron
      const body = response.body as LoginResponseBody;
      expect(body.fields).toEqual(expect.arrayContaining(['rut', 'password']));
    });
  });

  // ==========================================================================
  // Scenario: Inicio de sesión con cuenta deshabilitada
  // ==========================================================================
  test('Inicio de sesión con cuenta deshabilitada', ({
    given,
    and,
    when,
    then,
  }) => {
    let rutIngresado: string;
    let passwordIngresada: string;

    given(
      /^el usuario con RUT "(.*)" tiene su cuenta deshabilitada en EasyCheck$/,
      (rut: string) => {
        repo.seedUser(rut, 'estudiante', 'DISABLED');
      },
    );

    and(
      'el usuario se encuentra en el formulario de inicio de sesión',
      () => {},
    );

    when(/^el usuario ingresa el RUT "(.*)"$/, (rut: string) => {
      rutIngresado = rut;
    });

    and(/^el usuario ingresa la contraseña "(.*)"$/, (password: string) => {
      passwordIngresada = password;
    });

    and('el usuario selecciona "Entrar"', async () => {
      response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ rut: rutIngresado, password: passwordIngresada });
    });

    then('el sistema rechaza el acceso', () => {
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    and(/^se muestra el mensaje "(.*)"$/, (mensaje: string) => {
      const body = response.body as LoginResponseBody;
      expect(body.message).toBe(mensaje);
    });

    and('el usuario permanece en el formulario de inicio de sesión', () => {
      const body = response.body as LoginResponseBody;
      expect(body.redirectUrl).toBeUndefined();
    });
  });

  // ==========================================================================
  // Scenario: RUT sin dígito verificador
  // ==========================================================================
  test('Inicio de sesión con RUT en formato sin dígito verificador', ({
    given,
    when,
    and,
    then,
  }) => {
    given(
      'el usuario se encuentra en el formulario de inicio de sesión',
      () => {},
    );

    when(
      /^el usuario ingresa el RUT "(.*)" sin dígito verificador$/,
      async (rut: string) => {
        response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ rut, password: 'cualquier_password' });
      },
    );

    and('el usuario ingresa cualquier contraseña', () => {
      // Ya incluido en el when anterior
    });

    and('el usuario selecciona "Entrar"', () => {
      // Ya ejecutado en el when
    });

    then('el sistema detecta el formato inválido', () => {
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    and(/^se muestra el mensaje "(.*)"$/, (mensaje: string) => {
      const body = response.body as LoginResponseBody;
      expect(body.message).toBe(mensaje);
    });

    and('el usuario permanece en el formulario de inicio de sesión', () => {
      const body = response.body as LoginResponseBody;
      expect(body.redirectUrl).toBeUndefined();
    });
  });
});
