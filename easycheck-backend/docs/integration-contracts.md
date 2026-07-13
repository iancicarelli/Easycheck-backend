# Contratos de integración de EasyCheck

## Propósito

Este documento fija el alcance y los contratos que se utilizarán para integrar
`avance-fran` sobre la rama `integracion`, cuya base es `avance-ian`. Su objetivo
es evitar que cada caso de uso adopte rutas, actores o modelos de datos
incompatibles.

## Baseline del Bloque 0

- Rama de trabajo: `integracion`.
- Base funcional: `avance-ian` (`4300167`).
- Build: aprobado con `npm run build`.
- Suite actual: 11 suites y 71 pruebas aprobadas.
- Docker Compose: configuración válida mediante `docker compose config --quiet`.
- Runtime usado en la validación: Node.js `v24.14.1` y npm `11.11.0`.
- Instalación: `npm ci` instala 756 paquetes y reporta 9 vulnerabilidades de
  dependencias (6 moderadas y 3 altas). Se revisarán en el bloque de calidad,
  sin ejecutar actualizaciones forzadas durante la integración funcional.

## Decisiones de alcance

1. Los casos de uso comprometidos son CU-01 a CU-09.
2. El registro mediante TUI queda fuera de este alcance hasta que sea aprobado
   como caso de uso priorizado.
3. La exportación PDF/CSV mencionada como nota de CU-05 queda diferida hasta
   completar el flujo principal de los nueve CU.
4. La API Intranet real no existe. Se implementará como un adaptador simulado,
   pero los datos que entregue se persistirán en PostgreSQL.
5. Intranet es la fuente de verdad de cuentas y datos académicos. EasyCheck es
   la fuente de verdad de asistencia, estados locales y eventos pendientes de
   sincronización.

## Identidad y autorización

- CU-01 recibe RUT y contraseña.
- La contraseña se valida en el adaptador simulado de Intranet y no se guarda
  en PostgreSQL.
- EasyCheck mantiene una cuenta local con RUT, correo, nombre, rol y estado.
- CU-01 emite un token de EasyCheck con RUT y rol.
- Los CU protegidos obtienen la identidad desde el token. El RUT del actor no
  debe confiarse a un parámetro enviado por el cliente.
- Roles canónicos: `estudiante`, `profesor`, `director` y `administrador`.
- `x-user-role` será solo una compatibilidad temporal de desarrollo y deberá
  retirarse de los flujos finales.

## Contrato del QR

El QR lo genera el estudiante autenticado desde la aplicación móvil. El backend
genera y firma el contenido cuando el estudiante solicita el QR para una clase.

Flujo acordado:

1. El estudiante inicia sesión.
2. Solicita un QR para una clase en la que está matriculado.
3. El backend valida identidad, matrícula, asignatura, clase y horario.
4. El backend devuelve un QR firmado y con expiración.
5. El lector físico escanea el QR y envía su firma al endpoint de registro.
6. El backend vuelve a validar firma, expiración, estado de la clase y
   duplicidad antes de persistir la asistencia.

El payload deberá representar como mínimo:

```text
studentRut, classId, subjectId, issuedAt, expiresAt, nonce
```

La ruta canónica propuesta para generar el QR es:

```http
POST /api/v1/students/me/classes/:classId/qr
Authorization: Bearer <token>
```

El lector registrará la asistencia mediante:

```http
POST /api/v1/assistance/register
```

No se admitirán firmas especiales de prueba como
`VALID_SIGNATURE_ABC123` en el flujo final.

## Estados de asistencia

Para no confundir CU-07 con CU-08 se distinguen dos conceptos:

- `registrationStatus`: permite o impide nuevos registros de asistencia.
- `editingStatus`: permite o impide modificaciones manuales del profesor.

CU-07 cierra el registro. CU-08 habilita una ventana de edición y modifica un
registro existente. Si durante la implementación se decide utilizar un solo
estado para reducir cambios, deberá demostrarse que no reabre registros nuevos
cuando solo se pretendía habilitar edición.

## Rutas canónicas objetivo

| CU | Actor | Ruta objetivo |
| --- | --- | --- |
| CU-01 | Todos | `POST /api/v1/auth/login` |
| CU-02 | Administrador | `POST /api/v1/users/register` |
| CU-03 | Director/administrador | `GET /api/v1/students/:rut/attendance` |
| CU-04 | Estudiante | `GET /api/v1/students/me/subjects/:subjectId/attendance` |
| CU-05 | Profesor | `GET /api/v1/professors/me/subjects/:subjectId/attendance` |
| CU-06 | Estudiante/lector | `POST /api/v1/students/me/classes/:classId/qr` y `POST /api/v1/assistance/register` |
| CU-07 | Profesor | `PATCH /api/v1/professors/me/classes/:classId/registration` |
| CU-08 | Profesor | `PATCH /api/v1/professors/me/classes/:classId/editing` y `PATCH /api/v1/professors/me/assistance/:recordId` |
| CU-09 | Administrador | `POST /api/v1/subjects` |
| Sincronización | Administrador | `POST /api/v1/api-intranet/sync` |

Las rutas antiguas podrán mantenerse como alias durante la integración, pero no
se agregarán nuevas reglas de negocio a dos rutas equivalentes.

## Definición funcional de terminado

Un CU se considerará funcionalmente terminado cuando:

1. Tiene endpoint y contrato HTTP documentado.
2. Verifica token y rol cuando corresponda.
3. Aplica todas sus reglas de negocio principales.
4. Usa el adaptador TypeORM en modo Docker.
5. Persiste efectos y estos sobreviven a un reinicio.
6. Devuelve errores HTTP consistentes.
7. Funciona con datos provenientes del mock de Intranet.
8. Compila y no rompe el baseline existente.

La ampliación formal de pruebas unitarias, integración PostgreSQL, BDD y E2E se
realizará después de cerrar los nueve CU funcionales, aunque cada bloque tendrá
smoke tests y verificaciones mínimas antes de continuar.

## Comandos de verificación del baseline

Desde `easycheck-backend/`:

```bash
npm ci
npm run build
npm test -- --runInBand --no-cache
```

Desde la raíz del repositorio:

```bash
docker compose config --quiet
docker compose up --build
```

La ejecución de `docker compose up --build` debe reservarse para las puertas de
validación con PostgreSQL, ya que crea contenedores y volúmenes locales.

## Estado del Bloque 1

- CU-01 y CU-02 utilizan el mismo puerto y repositorio local de cuentas.
- La entidad `users` contiene perfil, rol y estado `ACTIVE/DISABLED`.
- La tabla separada `auth_users` fue retirada del modelo activo.
- La contraseña solo se conserva en el adaptador simulado de Intranet.
- El login valida cuenta local, estado y credenciales institucionales.
- El login devuelve token, perfil, rol y ruta de redirección.
- CU-02 crea cuentas `ACTIVE` que pueden iniciar sesión mediante CU-01.
- CU-02 exige un token con rol `administrador`.
- Se validó build, lint, 21 pruebas de integración dirigidas, 12 escenarios
  BDD de CU-01/CU-02 y la suite global de 71 pruebas.
- El smoke test Docker/PostgreSQL queda pendiente de iniciar Docker Desktop; la
  configuración Compose sí fue validada correctamente.
