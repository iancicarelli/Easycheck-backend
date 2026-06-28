# Easycheck-backend

Backend para EasyCheck (control de asistencia UFRO) creado con NestJS.

## Estructura del repositorio

La raíz de git es `Easycheck-backend/`, pero el proyecto NestJS vive un nivel más
abajo, en `easycheck-backend/`. **Todos los comandos de npm se ejecutan desde
`easycheck-backend/`**, no desde la raíz de git.

```bash
cd easycheck-backend
```

## Instalación

```bash
npm install
```

## Ejecutar el servidor

```bash
npm run start:dev      # modo watch (puerto 3000)
```

La API queda en `http://localhost:3000` y la documentación Swagger en
`http://localhost:3000/api/docs`.

## Scripts disponibles

```bash
npm run start          # iniciar
npm run start:dev      # iniciar en modo watch
npm run build          # compilar a dist/
npm run lint           # eslint --fix
```

## Pruebas

```bash
npm test                 # todas las suites de Jest (unit + integración + e2e + bdd + tdd)
npm run test:cov         # todas las suites + reporte de cobertura combinado

npm run test:integration # solo integración
npm run test:bdd         # solo BDD
npm run test:tdd         # solo TDD
npm run test:e2e         # solo e2e de Jest
```

## Escenarios (casos de uso)

1. CU-01 BDD Pasar a Nest / Pruebas de Humo / Ian
2. CU-02 BDD Fran
3. CU-03 TDD Fran
4. CU-04 Pruebas de Humo / Hacer pruebas unitarias Ian
5. CU-05 Pruebas de Humo / Hacer pruebas unitarias Fran
6. CU-06 Pruebas de Humo / Hacer pruebas unitarias
7. CU-07 Hacer pruebas unitarias
8. CU-08 Hacer pruebas unitarias
9. CU-09 TDD / Ian

## Foro 8 SonarQube

```
Pruebas2026@
token Analyze "easycheck-backend": sqp_508efdee148448400f630e9f737e2b95581e3d59
```

### 1. Levantar Docker

```bash
docker network create sonar-network

docker run -d \
  --name sonarqube \
  --network sonar-network \
  -p 9000:9000 \
  sonarqube:community
```

### 2. Crear el proyecto

Crear el proyecto en http://localhost:9000 y obtener su propio token.

Recordar que la clave y nombre de usuario es `admin`.

A modo de ejemplo de clave nueva y token generado:

```
Pruebas2026@
token Analyze "easycheck-backend": sqp_508efdee148448400f630e9f737e2b95581e3d59
```

### 3. Generar cobertura

```bash
cd ~/ruta/del/proyecto/easycheck-backend
npm run test:cov
```

### 4. Correr el scanner con su propio token

La configuración vive en `easycheck-backend/sonar-project.properties` (sources,
tests y la ruta del lcov combinado). Por eso el scanner se ejecuta **desde
`easycheck-backend/`** y sólo hace falta pasarle el host y el token:

```bash
cd ~/ruta/del/proyecto/Easycheck-backend/easycheck-backend

docker run \
  --rm \
  --network sonar-network \
  -v "$(pwd):/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.token=TOKEN_DE
```

### Con docker compose

1. Levantar: `docker compose up -d`
2. Cobertura: `npm run test:cov`
3. Ejecutar (desde `easycheck-backend/`, usa el `sonar-project.properties`):

```bash
docker run \
  --rm \
  --network easycheck-backend_sonar-network \
  -v "$(pwd):/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.token=sqp
```

## Pruebas E2E (Cypress)

Pruebas end-to-end sobre la API real (sin interfaz), usando `cy.request()` para
llamar directamente a los endpoints HTTP. Validan los flujos completos contra el
servidor levantado en `http://localhost:3000`.

### Ubicación

```
easycheck-backend/
├── cypress.config.ts                     # baseUrl + patrón de specs
└── cypress/
    └── e2e/
        ├── pe2e-01-login-estudiante.cy.ts    # CU-01 login estudiante
        ├── pe2e-02-login-profesor.cy.ts      # CU-01 login profesor
        ├── pe2e-03-registro-asignatura.cy.ts # CU-09 registro de asignatura
        ├── pe2e-04-registro-usuario.cy.ts    # CU-02 registro de usuario
        └── pe2e-05-asistencia.cy.ts          # CU-03 + CU-05 asistencia
```

Cada spec parte de un estado limpio: en su `beforeEach` llama a
`POST /api/v1/test/reset` (vacía los repositorios in-memory) y luego a
`POST /api/v1/test/seed` (siembra los datos base: estudiante `12345678-9`,
profesor `98765432-1`, asignatura `MAT101`, etc.).

### Cómo ejecutarlas

Las pruebas necesitan el servidor corriendo. En una terminal:

```bash
cd easycheck-backend
npm run start:dev
```

En **otra** terminal, con el servidor ya arriba en el puerto 3000:

```bash
cd easycheck-backend
npx cypress run                 # modo headless (consola)
npm run test:e2e:cypress        # equivalente vía script de npm
npm run test:e2e:cypress:open   # interfaz gráfica de Cypress
```

Resultado esperado: **5 specs, 23 pruebas en verde**. Los videos de cada corrida
quedan en `cypress/videos/`.

a