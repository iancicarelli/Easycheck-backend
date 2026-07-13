/**
 * Configuración unificada de Jest.
 *
 * Antes existían cinco configuraciones separadas (unit, integration, e2e, bdd, tdd)
 * que se ejecutaban en procesos de Jest distintos. La cobertura sólo se generaba con
 * la suite unitaria (`src/**`), por lo que SonarQube reportaba una cobertura baja:
 * el código ejercitado por integration/e2e/bdd/tdd nunca quedaba registrado en el
 * `lcov.info`.
 *
 * Esta configuración usa `projects` para correr TODAS las suites en una sola
 * ejecución y fusionar su cobertura en un único reporte (`coverage/lcov.info`),
 * que es el que consume SonarQube.
 *
 * Uso:
 *   npm test            -> ejecuta las 5 suites
 *   npm run test:cov    -> ejecuta las 5 suites + cobertura combinada
 */
const tsTransform = {
  '^.+\\.(t|j)s$': 'ts-jest',
};

/** Opciones comunes a todas las suites. */
const common = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: tsTransform,
};

/** @type {import('jest').Config} */
module.exports = {
  // --- Configuración de cobertura (nivel raíz: aplica a todos los proyectos) ---
  collectCoverage: false, // se activa con --coverage (npm run test:cov)
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts', // los archivos de prueba no son código fuente a cubrir
    '!src/**/*.module.ts', // wiring de NestJS, no es lógica de negocio testeable
    '!src/main.ts', // bootstrap de la aplicación
    '!src/seed/**', // script de seed: bootstrap de datos, igual que main.ts
    '!src/database/entities/**', // esquema declarativo de TypeORM
    '!src/database/migrations/**', // DDL validado por prueba de contrato
    '!src/database/database.module.ts',
    '!src/database/data-source.ts',
    '!src/database/use-database.ts',
    '!src/**/*.typeorm.repository.ts', // adapters Postgres: solo ejercitables
    '!src/**/typeorm-*.ts', //   contra una DB real; los tests usan in-memory
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'clover', 'json', 'text-summary'],

  // --- Suites: una sola ejecución corre las cinco ---
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      ...common,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/**/*.integration.spec.ts'],
    },
    {
      ...common,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
    },
    {
      ...common,
      displayName: 'bdd',
      testMatch: ['<rootDir>/test/CU_*/bdd/steps/**/*.steps.ts'],
    },
    {
      ...common,
      displayName: 'tdd',
      testMatch: ['<rootDir>/test/**/*.unit.spec.ts'],
    },
  ],
};
