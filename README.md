# Easycheck-backend
Backend para easycheck creado con Nest

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar servidor

```bash
npm run start:dev
```

## Scripts

```bash
npm run start
npm run start:dev
npm run build
npm run test
```

## Test

Ejecutar desde la carpeta del backend:

```bash
cd easycheck-backend
```

Suite completa:

```bash
npm test -- --runInBand
```

Tests por tipo:

```bash
npm run test:tdd -- --runInBand
npm run test:integration -- --runInBand
npm run test:bdd -- --runInBand
npm run test:e2e -- --runInBand
```

Cobertura y build:

```bash
npm run test:cov -- --runInBand
npm run build
```
## Escenarios

Estado actual de casos de uso:

1. CU-01: listo / faltan pruebas E2E y evidencia final.
2. CU-02: listo / faltan pruebas E2E y evidencia final.
3. CU-03: listo / faltan pruebas BDD, E2E y evidencia final.
4. CU-04: listo / faltan pruebas BDD, E2E y revisar filtro por asignatura.
5. CU-05: listo / faltan pruebas BDD, E2E y decidir export PDF/CSV.
6. CU-06: listo con QR simulado / faltan pruebas BDD, E2E y confirmar alineacion profesor/estudiante genera QR.
7. CU-07: falta implementar / faltan pruebas unitarias, integracion, BDD y E2E.
8. CU-08: falta implementar / faltan pruebas unitarias, integracion, BDD y E2E.
9. CU-08 bis: falta definir alcance antes de implementar.
10. CU-09: listo / faltan pruebas BDD, E2E y evidencia final.
11. API Intranet simulada/sync: listo / falta evidencia E2E si se considera API relevante.

Pendiente transversal para Avance 03:

- Completar escenarios BDD definidos y automatizarlos.
- Agregar E2E para los CU priorizados.
- Ampliar pruebas k6 a APIs relevantes y guardar evidencias para Grafana.
- Ejecutar SonarQube y guardar metricas/capturas.
- Actualizar informe con trazabilidad CU -> modulo -> endpoint -> pruebas.
## Foro 8 SonarQube

Pruebas2026@
token Analyze "easycheck-backend": sqp_508efdee148448400f630e9f737e2b95581e3d59 

1. Levantar docker

```bash
docker network create sonar-network

docker run -d \
  --name sonarqube \
  --network sonar-network \
  -p 9000:9000 \
  sonarqube:community
```
2.  Crear el proyecto en http://localhost:9000 y obtener su propio token 

Recordar que la clave y nombre de usuario es admin.

a modo de ejemplo de clave nueva y token generado

Pruebas2026@
token Analyze "easycheck-backend": sqp_508efdee148448400f630e9f737e2b95581e3d59 

3. Generar cobertura 

```bash
cd ~/ruta/del/proyecto/easycheck-backend
npm run test:cov
```
4. Correr el scanner con su propio token

La configuraciÃ³n vive en `easycheck-backend/sonar-project.properties` (sources,
tests y la ruta del lcov combinado). Por eso el scanner se ejecuta **desde
`easycheck-backend/`** y sÃ³lo hace falta pasarle el host y el token:

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

1. Comando docker compose up -d
2. Cobertura npm run test:cov
3. Ejecutar (desde `easycheck-backend/`, usa el `sonar-project.properties`).

```bash
docker run \
  --rm \
  --network easycheck-backend_sonar-network \
  -v "$(pwd):/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.token=sqp_508efdee148448400f630e9f737e2b95581e3d59 
  ```

