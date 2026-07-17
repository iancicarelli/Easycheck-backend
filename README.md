# EasyCheck Backend

API REST de control de asistencia para la UFRO, desarrollada con NestJS,
TypeORM y PostgreSQL. El proyecto implementa los casos de uso CU-01 a CU-09,
una API Intranet simulada y registro de asistencia mediante QR firmado.

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Guía completa de pruebas: [`TESTING.md`](TESTING.md)
- Contratos de integración:
  [`easycheck-backend/docs/integration-contracts.md`](easycheck-backend/docs/integration-contracts.md)
- Estado del Avance 3: [`avance3.md`](avance3.md)

> La raíz Git contiene `docker-compose.yml`; el proyecto NestJS está dentro de
> `easycheck-backend/`. Los comandos Docker se ejecutan desde la raíz y los
> comandos npm desde `easycheck-backend/`.

## Requisitos

- Node.js 22 y npm.
- Docker Desktop con Docker Compose, para PostgreSQL y el despliegue completo.
- k6, o la imagen Docker `grafana/k6`, para carga y estrés.

## Arranque completo con Docker

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
```

Editar `.env` antes de arrancar. Como mínimo:

```dotenv
POSTGRES_USER=easycheck
POSTGRES_PASSWORD=una-clave-local
POSTGRES_DB=easycheck
POSTGRES_HOST_PORT=5433
QR_SIGNING_SECRET=una-clave-qr-de-al-menos-32-caracteres
QR_TTL_SECONDS=300
READER_API_KEY=una-clave-de-lector-de-al-menos-16-caracteres
```

Luego:

```powershell
docker compose up -d --build postgres backend
docker compose ps
docker compose logs -f backend
```

El arranque realiza automáticamente:

1. espera de PostgreSQL;
2. ejecución de migraciones TypeORM;
3. seed idempotente de demostración;
4. inicio del backend en el puerto 3000.

PostgreSQL queda publicado en `localhost:5433`. Para detener sin borrar datos:

```powershell
docker compose down
```

Para borrar el volumen y validar una migración desde cero:

```powershell
docker compose down -v
docker compose up -d --build postgres backend
```

## Arranque local en memoria

Sin `DB_HOST`, Nest usa repositorios en memoria. Este modo es rápido y se usa en
las suites Jest, pero los datos desaparecen al detener la aplicación.

```powershell
Set-Location easycheck-backend
npm install
npm run start:dev
```

## Autenticación simulada

La Intranet real aún no existe. El adaptador simulado valida las credenciales de
demostración y entrega un token determinístico. Las rutas protegidas reciben:

```http
Authorization: Bearer <token>
```

No se usa `x-user-role`: el rol y el RUT se extraen del token y se comparan con
una cuenta local `ACTIVE`.

Credenciales de demostración (`password: demo`):

| RUT          | Rol           | Estado        |
| ------------ | ------------- | ------------- |
| `11111111-1` | estudiante    | activo        |
| `22222222-2` | profesor      | activo        |
| `33333333-3` | director      | activo        |
| `44444444-4` | administrador | activo        |
| `77777777-7` | estudiante    | deshabilitado |

Ejemplo de login:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri 'http://localhost:3000/api/v1/auth/login' `
  -ContentType 'application/json' `
  -Body '{"rut":"11111111-1","password":"demo"}'

$studentToken = $login.token
```

Para importar el snapshot de la Intranet simulada en la cuenta local y la base:

```powershell
$headers = @{ Authorization = 'Bearer mock-token-44444444-4-administrador' }
Invoke-RestMethod `
  -Method Post `
  -Uri 'http://localhost:3000/api/v1/api-intranet/sync' `
  -Headers $headers
```

La sincronización es idempotente y agrega/actualiza usuarios, estudiantes,
profesores, asignaturas, inscripciones, docencia y clases.

## Casos de uso y rutas canónicas

| CU    | Operación                          | Método y ruta                                            | Rol                      |
| ----- | ---------------------------------- | -------------------------------------------------------- | ------------------------ |
| CU-01 | Iniciar sesión                     | `POST /api/v1/auth/login`                                | Público con credenciales |
| CU-02 | Registrar cuenta local             | `POST /api/v1/users/register`                            | Administrador            |
| CU-03 | Consultar estudiante por RUT       | `GET /api/v1/students/:rut/attendance`                   | Director/administrador   |
| CU-04 | Consultar asistencia propia        | `GET /api/v1/students/me/subjects/:subjectId/attendance` | Estudiante               |
| CU-05 | Consultar asistencia de asignatura | `GET /api/v1/professors/me/subjects/:code/attendance`    | Profesor                 |
| CU-06 | Generar QR                         | `POST /api/v1/students/me/classes/:classId/qr`           | Estudiante               |
| CU-06 | Consumir QR                        | `POST /api/v1/assistance/register`                       | Lector con API key       |
| CU-07 | Cerrar registro                    | `PATCH /api/v1/professors/me/classes/:id/registration`   | Profesor                 |
| CU-08 | Abrir/cerrar edición               | `PATCH /api/v1/professors/me/classes/:id/editing`        | Profesor                 |
| CU-08 | Corregir asistencia                | `PATCH /api/v1/professors/me/assistance/:id`             | Profesor                 |
| CU-09 | Crear asignatura local             | `POST /api/v1/subjects`                                  | Administrador            |

Swagger contiene los DTO y respuestas principales. Las rutas antiguas que
incluyen el RUT del profesor se conservan temporalmente como compatibilidad, pero
las aplicaciones nuevas deben usar las rutas `/me`.

## Flujo QR para app lector QR

### 1. El estudiante genera el QR

```http
POST /api/v1/students/me/classes/1002/qr
Authorization: Bearer mock-token-55555555-5-estudiante
```

Respuesta `201`:

```json
{
  "studentRut": "55555555-5",
  "classId": 1002,
  "subjectId": "INF-301",
  "qrToken": "<claims-base64url>.<firma-hmac>",
  "expiresAt": "2026-07-13T05:14:02.824Z"
}
```

El endpoint valida:

1. token Bearer válido;
2. cuenta local existente, activa y con rol estudiante;
3. estudiante existente;
4. `classId` entero y clase existente;
5. estudiante inscrito en la asignatura de la clase;
6. registro de la clase en estado `ENABLED`.

El token contiene `studentRut`, `classId`, `subjectId`, `issuedAt`, `expiresAt`
y un `nonce` UUID. Se firma con HMAC-SHA256 usando `QR_SIGNING_SECRET`. Su
duración predeterminada es de 300 segundos, configurable con
`QR_TTL_SECONDS`.

Actualmente no se valida cercanía física, fecha/hora de la clase ni dispositivo
del estudiante. Si esos requisitos forman parte de la demostración, deben
definirse antes de ampliar el contrato.

### 2. La mini app escanea y consume el QR

La app debe enviar el texto completo escaneado, sin modificarlo ni construir sus
propios claims:

```http
POST /api/v1/assistance/register
Content-Type: application/json
x-reader-key: <READER_API_KEY>

{
  "qrToken": "<texto completo leído desde el QR>"
}
```

Respuesta `201`:

```json
{
  "message": "Assistance registered successfully",
  "recordId": 4,
  "studentRut": "55555555-5",
  "classId": 1002
}
```

El backend valida, en este orden lógico:

1. `x-reader-key` coincide con `READER_API_KEY`;
2. el body contiene solamente un `qrToken` string;
3. formato del token, firma HMAC y estructura de claims;
4. token no expirado y `issuedAt` no más de 30 segundos en el futuro;
5. clase existente y asignatura del token igual a la clase;
6. registro de la clase todavía `ENABLED`;
7. estudiante aún inscrito;
8. ausencia de asistencia previa para estudiante/clase;
9. nonce no utilizado;
10. inserción de la asistencia como `present: true`.

Respuestas que debe manejar la mini app:

| HTTP | Significado                                          | Acción sugerida                                   |
| ---: | ---------------------------------------------------- | ------------------------------------------------- |
|  201 | Asistencia registrada                                | Mostrar confirmación y bloquear reenvío           |
|  400 | QR malformado, alterado o expirado                   | Solicitar al estudiante generar otro QR           |
|  401 | API key de lector ausente/incorrecta                 | Mostrar error de configuración del lector         |
|  403 | Estudiante no inscrito                               | Informar que no puede registrar esa clase         |
|  404 | Clase inexistente                                    | Informar QR/clase no disponible                   |
|  409 | Registro cerrado, asistencia duplicada o nonce usado | No reintentar automáticamente; mostrar el mensaje |

Recomendaciones para la mini app:

- detener o pausar el escáner mientras la petición está en curso;
- aplicar debounce para no enviar varias veces el mismo frame;
- no reintentar automáticamente respuestas 4xx;
- usar timeout y permitir reintento manual solo ante fallos de red/5xx;
- no registrar el `qrToken` ni la API key en logs;
- mantener `READER_API_KEY` fuera del repositorio y del código fuente;
- en una app pública, no distribuir una API key compartida: usar identidad por
  lector/dispositivo y rotación de credenciales;
- si la mini app es web y corre en otro origen, será necesario configurar CORS
  en el backend. Una aplicación móvil nativa no tiene esa restricción del
  navegador.

## Pruebas y calidad

La secuencia completa, incluyendo unitarias, integración, BDD, E2E,
PostgreSQL, k6/Grafana y SonarQube, está en [`TESTING.md`](TESTING.md).

El perfil de rendimiento final toma como referencia una matrícula de 10.000
estudiantes: procesa 10.000 interacciones con 100 VUs en carga normal y escala
de 100 a 300 VUs en estrés. La explicación de qué representa cada operación y
sus límites está en
[`test/performance/README.md`](easycheck-backend/test/performance/README.md).

Comandos rápidos desde `easycheck-backend/`:

```powershell
npm run build
npm run test:tdd -- --runInBand
npm run test:integration -- --runInBand
npm run test:bdd -- --runInBand
npm run test:e2e -- --runInBand
npm run test:cov -- --runInBand
```

Resultados de referencia actuales:

- TDD: 12 suites / 51 pruebas;
- integración: 9 suites / 74 pruebas;
- BDD: 9 suites / 19 escenarios;
- E2E: 9 suites / 11 pruebas;
- combinado: 40 suites / 156 pruebas;
- cobertura: 93,37% statements, 80,69% branches y 93,47% lines.

## Limitaciones conocidas

- La Intranet y los tokens de sesión son simulados; no existe aún API real ni
  JWT productivo.
- La API key actual identifica al conjunto de lectores, no a cada dispositivo.
- El modo Jest usa repositorios en memoria. La validación Docker/PostgreSQL debe
  ejecutarse además de la suite automatizada.
- No se valida geolocalización ni que el horario actual coincida con la clase.
