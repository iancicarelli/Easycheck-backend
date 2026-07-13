import {
  readDatabaseEnvironment,
  validateRuntimeEnvironment,
} from '../../../src/config/environment';

describe('Bloque 7 - validacion de configuracion', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('rechaza una configuracion de base de datos incompleta', () => {
    process.env.DB_HOST = 'localhost';
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    expect(() => readDatabaseEnvironment()).toThrow(
      'Variables de base de datos faltantes',
    );
  });

  it('acepta una configuracion completa de PostgreSQL', () => {
    Object.assign(process.env, {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'easycheck',
      DB_PASSWORD: 'secret',
      DB_NAME: 'easycheck',
    });
    expect(readDatabaseEnvironment()).toEqual({
      host: 'localhost',
      port: 5432,
      username: 'easycheck',
      password: 'secret',
      database: 'easycheck',
    });
  });

  it('exige secretos de QR y lector en produccion', () => {
    delete process.env.DB_HOST;
    process.env.NODE_ENV = 'production';
    delete process.env.QR_SIGNING_SECRET;
    delete process.env.READER_API_KEY;
    expect(() => validateRuntimeEnvironment()).toThrow('QR_SIGNING_SECRET');
  });

  it('acepta secretos suficientemente largos en produccion', () => {
    delete process.env.DB_HOST;
    Object.assign(process.env, {
      NODE_ENV: 'production',
      PORT: '3000',
      QR_SIGNING_SECRET: 'q'.repeat(32),
      READER_API_KEY: 'r'.repeat(16),
    });
    expect(() => validateRuntimeEnvironment()).not.toThrow();
  });
});
