import { AuthRepository } from '../../src/auth/Auth.repository';
import { AuthService } from '../../src/auth/Auth.service';
import {
  AccountDisabledException,
  EmptyCredentialsException,
  InvalidCredentialsException,
  InvalidRutFormatException,
} from '../../src/common/exceptions';

describe('CU-01 AuthService login', () => {
  let repository: AuthRepository;
  let service: AuthService;

  beforeEach(() => {
    repository = new AuthRepository();
    repository.reset();
    service = new AuthService(repository);
  });

  it('autentica estudiante con credenciales validas y retorna token mock', () => {
    repository.seedInstitutionalUser({
      rut: '12345678-9',
      role: 'estudiante',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Ana Garcia',
      email: 'a.garcia01@ufromail.cl',
    });

    const result = service.login({
      rut: '12345678-9',
      password: 'contrasena_valida',
    });

    expect(result).toMatchObject({
      token: 'mock-token-12345678-9-estudiante',
      role: 'estudiante',
      redirectUrl: '/estudiante/home',
      user: {
        rut: '12345678-9',
        fullName: 'Ana Garcia',
        email: 'a.garcia01@ufromail.cl',
        role: 'estudiante',
      },
    });
  });

  it('autentica profesor con credenciales validas y redirecciona por rol', () => {
    repository.seedUser(
      '98765432-1',
      'profesor',
      'ACTIVE',
      'contrasena_valida',
    );

    const result = service.login({
      rut: '98765432-1',
      password: 'contrasena_valida',
    });

    expect(result.role).toBe('profesor');
    expect(result.redirectUrl).toBe('/profesor/home');
    expect(result.token).toBe('mock-token-98765432-1-profesor');
  });

  it('genera correo ufromail correlativo para nombres con misma inicial y apellido', () => {
    repository.seedInstitutionalUser({
      rut: '11111111-1',
      role: 'estudiante',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Juanito Perez',
    });
    repository.seedInstitutionalUser({
      rut: '22222222-2',
      role: 'estudiante',
      status: 'ACTIVE',
      password: 'contrasena_valida',
      fullName: 'Juana Perez',
    });

    expect(
      service.login({ rut: '11111111-1', password: 'contrasena_valida' }).user
        .email,
    ).toBe('j.perez01@ufromail.cl');
    expect(
      service.login({ rut: '22222222-2', password: 'contrasena_valida' }).user
        .email,
    ).toBe('j.perez02@ufromail.cl');
  });

  it('rechaza campos obligatorios vacios', () => {
    expect(() => service.login({ rut: '', password: '' })).toThrow(
      EmptyCredentialsException,
    );
  });

  it('rechaza rut sin digito verificador', () => {
    expect(() =>
      service.login({ rut: '12345678', password: 'contrasena_valida' }),
    ).toThrow(InvalidRutFormatException);
  });

  it('rechaza usuario inexistente', () => {
    expect(() =>
      service.login({ rut: '11111111-1', password: 'contrasena_valida' }),
    ).toThrow(InvalidCredentialsException);
  });

  it('rechaza contrasena incorrecta', () => {
    repository.seedUser(
      '12345678-9',
      'estudiante',
      'ACTIVE',
      'contrasena_valida',
    );

    expect(() =>
      service.login({ rut: '12345678-9', password: 'otra_contrasena' }),
    ).toThrow(InvalidCredentialsException);
  });

  it('rechaza cuenta deshabilitada', () => {
    repository.seedUser(
      '12345678-9',
      'estudiante',
      'DISABLED',
      'contrasena_valida',
    );

    expect(() =>
      service.login({ rut: '12345678-9', password: 'contrasena_valida' }),
    ).toThrow(AccountDisabledException);
  });
});
