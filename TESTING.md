# Ejecución de pruebas — EasyCheck

Esta guía indica qué servicio se necesita, qué comando ejecutar y qué resultado
esperar. La ruta rápida no requiere Docker. PostgreSQL, Prometheus/Grafana y
SonarQube son validaciones adicionales y se ejecutan por separado.

## Ruta rápida sin Docker

Desde la raíz del repositorio:

```powershell
Set-Location easycheck-backend
npm install
npm run build
npm run test:tdd -- --runInBand
npm run test:integration -- --runInBand
npm run test:bdd -- --runInBand
npm run test:e2e -- --runInBand
npm run start:dev
```

Con el backend ejecutándose, abrir otra consola en `easycheck-backend/`:

```powershell
.\test\scripts\Invoke-QrSmoke.ps1
.\test\performance\Invoke-K6.ps1 -Test Load -Profile Quick
.\test\performance\Invoke-K6.ps1 -Test Stress -Profile Quick
```

Esta ruta comprueba compilación, las cuatro suites Jest, el flujo QR y perfiles
pequeños de rendimiento. En este modo los repositorios son en memoria: los datos
se reinician al detener el backend.

## Configuración y `.env`

El `.env` de la raíz se usa únicamente para Docker/PostgreSQL. Las suites Jest,
el backend local y k6 sin Prometheus no necesitan editarlo. Para Docker:

```powershell
# Ejecutar desde la raíz del repositorio
Copy-Item .env.example .env
```

Editar la copia con credenciales locales. `.env` no se versiona.

No es necesario pegar líneas `$env:` para k6. El helper
`test/performance/Invoke-K6.ps1` configura internamente los perfiles Quick y
Final. El helper `test/scripts/Invoke-QrSmoke.ps1` lee `READER_API_KEY` desde el
`.env` cuando existe y usa `easycheck-local-reader-key` para el backend local.

## 1. Verificación estática y compilación

Desde `easycheck-backend/`:

```powershell
npm run build
npx eslint "{src,test}/**/*.ts"
```

`npm run lint` incorpora `--fix`, por lo que no se usa como verificación limpia.

## 2. Pruebas unitarias/TDD

```powershell
npm run test:tdd -- --runInBand
```

Validan servicios y reglas aisladas. Referencia: 12 suites y 51 pruebas.

## 3. Pruebas de integración

```powershell
npm run test:integration -- --runInBand
```

Validan módulos conectados y repositorios en memoria. Referencia: 9 suites y 74
pruebas, con cobertura de CU-01 a CU-09.

## 4. Escenarios BDD/Gherkin

```powershell
npm run test:bdd -- --runInBand
```

Ejecutan los escenarios funcionales escritos en `.feature`. Referencia: 9
suites y 19 escenarios.

## 5. Pruebas E2E

```powershell
npm run test:e2e -- --runInBand
```

Levantan `AppModule` y recorren un flujo HTTP por CU en modo in-memory.
Referencia: 9 suites y 9 flujos. No prueban la persistencia real.

## 6. Suite completa y cobertura

```powershell
npm run test:cov -- --runInBand
```

Genera `coverage/lcov.info`, utilizado posteriormente por SonarQube.

## 7. Smoke test QR

### 7A. Smoke QR local, sin Docker

En una consola iniciar el backend sin `DB_HOST`:

```powershell
Remove-Item Env:DB_HOST -ErrorAction SilentlyContinue
npm run start:dev
```

En otra consola, desde `easycheck-backend/`:

```powershell
.\test\scripts\Invoke-QrSmoke.ps1
```

El script ejecuta cuatro acciones: sincroniza la Intranet simulada, genera el QR
del estudiante `55555555-5` para la clase `1002`, registra la asistencia (HTTP
201) y reenvía el mismo QR (HTTP 409). Así valida firma, inscripción, estado de
clase, registro y rechazo de duplicados.

### 7B. Smoke QR con PostgreSQL

Desde la raíz, iniciar la base y el backend:

```powershell
docker compose up -d --build postgres backend
docker compose ps
docker compose logs --no-color --tail=160 backend
```

El log debe mostrar migraciones, seed y `Nest application successfully started`.
Luego, desde `easycheck-backend/`, ejecutar el mismo helper:

```powershell
.\test\scripts\Invoke-QrSmoke.ps1
```

Esta variante también valida TypeORM, migraciones y persistencia. El script no
borra datos. Si el primer registro responde 409, limpiar la base de pruebas o
usar un estudiante/clase que no tenga asistencia previa. Se puede indicar una
clave explícita con `-ReaderKey`.

## 8. Prometheus y Grafana (opcional)

Este paso no ejecuta pruebas. Solo almacena y grafica las métricas de k6, y
requiere Docker:

```powershell
docker compose `
  -f easycheck-backend/test/performance/monitoring/docker-compose.monitoring.yml `
  up -d
```

Abrir Grafana en `http://localhost:3001` (`admin` / `easycheck`) y seleccionar
`EasyCheck / EasyCheck - k6`. Prometheus queda en `http://localhost:9090`.

Si se omite este paso, k6 sigue mostrando el resumen por consola y genera JSON
locales. Solo se pierde el dashboard.

## 9. Prueba de carga k6

Qué mide: una mezcla repetible de login, consultas de asistencia y generación de
QR. El perfil Quick comprueba el circuito con 100 interacciones y 5 VUs. El
perfil Final procesa 10.000 interacciones con 100 VUs. Es volumen de operaciones,
no 10.000 cuentas únicas.

Con el backend iniciado:

```powershell
.\test\performance\Invoke-K6.ps1 -Test Load -Profile Quick
.\test\performance\Invoke-K6.ps1 -Test Load -Profile Final
```

El resultado queda en `test/performance/results/load-summary.json`. Para enviar
métricas al dashboard del paso 8:

```powershell
.\test\performance\Invoke-K6.ps1 -Test Load -Profile Final -WithPrometheus
```

El helper configura y restaura las variables de Prometheus automáticamente.

## 10. Prueba de estrés k6

Qué mide: degradación de latencia y errores cuando aumenta la concurrencia. El
perfil Quick escala de 5 a 15 VUs. El perfil Final escala de 100 a 300 VUs en
aproximadamente nueve minutos. No repite altas ni consumos de QR, porque esos
flujos producirían conflictos de negocio en vez de una medición útil.

```powershell
.\test\performance\Invoke-K6.ps1 -Test Stress -Profile Quick
.\test\performance\Invoke-K6.ps1 -Test Stress -Profile Final
```

El resultado queda en `test/performance/results/stress-summary.json`. Para
Prometheus:

```powershell
.\test\performance\Invoke-K6.ps1 -Test Stress -Profile Final -WithPrometheus
```

Registrar p95/p99, solicitudes por segundo, tasa de errores, VUs y el momento de
degradación. Los umbrales están definidos en los scripts k6.

## 11. SonarQube (opcional)

No es un test de endpoints. Analiza cobertura, bugs, vulnerabilidades, hotspots,
code smells, duplicación y quality gate. Requiere Docker y un token generado en
la interfaz de SonarQube:

```powershell
docker compose up -d sonarqube
```

Esperar `http://localhost:9000`, crear el proyecto `easycheck-backend` y copiar
el token. Desde la raíz:

```powershell
docker run --rm `
  --network easycheck-backend_sonar-network `
  -v "${PWD}\easycheck-backend:/usr/src" `
  -w /usr/src `
  sonarsource/sonar-scanner-cli `
  -Dsonar.host.url=http://sonarqube:9000 `
  -Dsonar.token=<TOKEN_SONAR>
```

Ejecutar antes el paso 6 para que exista `coverage/lcov.info`.

## 12. Evidencias finales

Conservar las salidas de Jest, `coverage/lcov.info`, ambos JSON de k6 y, si se
ejecutaron, capturas de Grafana y SonarQube.

## 13. Detener servicios

```powershell
docker compose down
docker compose `
  -f easycheck-backend/test/performance/monitoring/docker-compose.monitoring.yml `
  down
```

No usar `-v` salvo que se quiera eliminar deliberadamente la base de datos y sus
datos de prueba.
