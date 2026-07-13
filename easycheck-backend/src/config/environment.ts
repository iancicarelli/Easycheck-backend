export interface DatabaseEnvironment {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function readDatabaseEnvironment(): DatabaseEnvironment {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(
      `Variables de base de datos faltantes: ${missing.join(', ')}`,
    );
  }
  const port = Number(process.env.DB_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT debe ser un puerto vÃ¡lido');
  }
  return {
    host: process.env.DB_HOST!,
    port,
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  };
}

export function validateRuntimeEnvironment(): void {
  const port = Number(process.env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un puerto vÃ¡lido');
  }
  if (process.env.DB_HOST) readDatabaseEnvironment();
  if (process.env.NODE_ENV === 'production') {
    assertSecret('QR_SIGNING_SECRET', 32);
    assertSecret('READER_API_KEY', 16);
  }
}

function assertSecret(name: string, minimumLength: number): void {
  if ((process.env[name]?.length ?? 0) < minimumLength) {
    throw new Error(`${name} debe tener al menos ${minimumLength} caracteres`);
  }
}
