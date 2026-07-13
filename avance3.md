# Avance 3 — Evaluación de cumplimiento de objetivos

**Proyecto:** EasyCheck — Backend (API de control de asistencia, UFRO)

**Fecha de actualización:** 2026-07-13

**Alcance de esta evaluación:** backend (`Easycheck-backend/easycheck-backend/`)

**Método:** auditoría del código, inventario de artefactos y ejecución local de
compilación, lint y suites Jest. También se validaron Docker, PostgreSQL,
migraciones, seed, un flujo QR persistido y perfiles abreviados k6 con
Prometheus/Grafana. SonarQube permanece **(validar)**.

---

## 1. Objetivo

Completar la implementación funcional del **100% de los casos de uso
priorizados**, con una estrategia de calidad que incluya:

1. Cobertura mínima de **70%** de pruebas unitarias sobre el código de producción.
2. Pruebas de **integración** para todos los casos de uso.
3. Pruebas **E2E** para todos los casos de uso, cubriendo sus flujos principales.
4. Pruebas de **carga y estrés** sobre las APIs relevantes, monitorizadas con
   **Grafana**.
5. Evaluación de **mantenibilidad, fiabilidad y seguridad** con **SonarQube**.
6. **100% de los escenarios Gherkin** definidos, implementados y ejecutables.
7. Evidencias mediante informes, dashboards, ejecución automática y videos.

---

## 2. Resumen ejecutivo

| #   | Objetivo                                           | Estado actual                                                               |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| i   | 100% de CU priorizados implementados               | ✅ **Implementados 9/9; stack PostgreSQL, migración, seed y QR validados**  |
| 1   | Cobertura unitaria ≥ 70%                           | ✅ **Cumple**: 94,15% statements, 81,83% branches y 94,24% lines            |
| 2   | Integración para todos los CU                      | ✅ **Cumple**: 9/9 CU, 74 pruebas                                           |
| 3   | E2E para todos los CU                              | ✅ **Cumple**: 9/9 en Jest y smoke QR persistido en PostgreSQL              |
| 4   | Carga/estrés + Grafana                             | 🟡 **Ejecución abreviada validada; perfiles finales y capturas pendientes** |
| 5   | SonarQube (mantenibilidad, fiabilidad y seguridad) | 🟡 **Configurado; ejecución y quality gate (validar)**                      |
| 6   | Escenarios Gherkin implementados y ejecutables     | ✅ **Cumple**: 9/9 CU, 19 escenarios verdes                                 |
| 7   | Informe, dashboards y video                        | ❌ **Pendiente de recopilación y entrega**                                  |

**Leyenda:** ✅ cumple · 🟡 parcial o pendiente de validación externa · ❌ pendiente

---

## 3. Casos de uso priorizados

El sistema mantiene **9 casos de uso**. Las rutas canónicas toman la identidad
del token cuando corresponde, evitando que estudiantes o profesores actúen en
nombre de otro usuario.

| CU    | Descripción                                 | Endpoint principal                                                                  | Estado   |
| ----- | ------------------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| CU-01 | Inicio de sesión                            | `POST /api/v1/auth/login`                                                           | ✅ Local |
| CU-02 | Registro de cuenta local institucional      | `POST /api/v1/users/register`                                                       | ✅ Local |
| CU-03 | Asistencia de un estudiante por RUT         | `GET /api/v1/students/:rut/attendance`                                              | ✅ Local |
| CU-04 | Asistencia propia en una asignatura         | `GET /api/v1/students/me/subjects/:subjectId/attendance`                            | ✅ Local |
| CU-05 | Asistencia de estudiantes de una asignatura | `GET /api/v1/professors/me/subjects/:code/attendance`                               | ✅ Local |
| CU-06 | Generar QR y registrar asistencia           | `POST /api/v1/students/me/classes/:classId/qr` y `POST /api/v1/assistance/register` | ✅ Local |
| CU-07 | Cerrar el registro de una clase             | `PATCH /api/v1/professors/me/classes/:id/registration`                              | ✅ Local |
| CU-08 | Habilitar edición y corregir asistencia     | `PATCH .../classes/:id/editing` y `PATCH .../assistance/:id`                        | ✅ Local |
| CU-09 | Crear una asignatura local                  | `POST /api/v1/subjects`                                                             | ✅ Local |

### Decisiones funcionales y de seguridad actuales

- La API Intranet real no existe. Se usa un adaptador simulado para credenciales,
  personas, asignaturas, inscripciones, docencia y clases.
- CU-01 valida tanto las credenciales simuladas como la existencia y estado de
  la cuenta local unificada.
- Los tokens continúan siendo determinísticos y simulados. Esto permite probar
  roles y actores, pero debe declararse como deuda frente a un JWT real.
- CU-06 ya no acepta una firma arbitraria: el estudiante genera un QR firmado
  con HMAC-SHA256, expiración y nonce. El lector necesita `x-reader-key` y cada
  nonce se consume una sola vez.
- CU-07 y CU-08 separan `registrationStatus` de `editingStatus`. Habilitar la
  edición no vuelve a abrir el registro mediante QR.
- CU-09 crea asignaturas con origen `LOCAL`; la sincronización de Intranet usa
  origen `INTRANET` y preserva las asignaturas locales ante colisiones.
- El arranque Docker, la migración, el seed, la sincronización y el flujo QR se
  verificaron contra PostgreSQL. Falta ampliar esta validación persistida a una
  regresión automatizada de todos los CU.

---

## 4. Evaluación detallada por objetivo

### i) Implementación funcional de los CU — 🟡 Implementada localmente

Los 9 CU tienen rutas, controladores, servicios, repositorios en memoria,
validaciones de rol y pruebas automatizadas. Ya no existen los dos stubs inseguros
descritos en la versión anterior del documento: el login valida contraseña
simulada y el QR utiliza firma criptográfica, expiración y nonce.

La aplicación selecciona repositorios TypeORM cuando se define `DB_HOST`. El
esquema se administra mediante una migración versionada, con
`synchronize: false` y `migrationsRun: true`. Se verificaron el build de la
imagen, migración, seed y arranque del backend con PostgreSQL.

### 1) Cobertura de pruebas ≥ 70% — ✅ Cumple con margen

Resultado real de `npm run test:cov -- --runInBand`, ejecutado el 2026-07-12:

| Métrica    |            Resultado | ¿≥70%? |
| ---------- | -------------------: | :----: |
| Statements | **94,15%** (886/941) |   ✅   |
| Branches   | **81,83%** (392/479) |   ✅   |
| Functions  | **97,39%** (187/192) |   ✅   |
| Lines      | **94,24%** (802/851) |   ✅   |

La ejecución combinada terminó con **40 suites y 154 pruebas verdes**. La
cobertura fusiona unitarias, integración, E2E, BDD y TDD mediante los proyectos
definidos en `jest.config.js`.

Exclusiones justificadas actuales:

- bootstrap de Nest y módulos declarativos;
- seed de demostración;
- entidades y migraciones declarativas;
- adaptadores TypeORM, que no forman parte de las suites Jest en memoria; su
  arranque y flujo QR se validaron mediante Docker/PostgreSQL.

### 2) Pruebas de integración para todos los CU — ✅ Cumple (9/9)

Las pruebas integran controladores, servicios, guards, adaptadores simulados y
repositorios en memoria mediante Nest y `supertest`. Están organizadas por CU y
las regresiones que atraviesan varios CU se conservan en `test/CROSS_CUTTING`.

Resultado real:

| Indicador              |        Resultado |
| ---------------------- | ---------------: |
| Suites de integración  |            **9** |
| Pruebas de integración |           **74** |
| CU cubiertos           |          **9/9** |
| Estado                 | **Todas verdes** |

También se prueban sincronización de Intranet, seguridad transversal,
configuración del entorno y contrato de migración. Además se confirmó
manualmente la migración aplicada y un registro QR persistido en PostgreSQL.

### 3) Pruebas E2E para todos los CU — ✅ Cumple en modo local (9/9)

La antigua prueba del scaffold `GET /` fue reemplazada por una suite E2E por CU.
Cada prueba arranca `AppModule`, aplica el mismo `ValidationPipe` del bootstrap y
recorre el endpoint HTTP principal hasta los repositorios en memoria.

| CU    | Flujo E2E principal                                             |
| ----- | --------------------------------------------------------------- |
| CU-01 | Sincronizar Intranet e iniciar sesión con cuenta activa         |
| CU-02 | Administrador registra una nueva cuenta local institucional     |
| CU-03 | Director consulta asistencia del estudiante por RUT             |
| CU-04 | Estudiante consulta su asistencia usando la identidad del token |
| CU-05 | Profesor consulta estudiantes de su asignatura                  |
| CU-06 | Estudiante genera QR y lector registra la asistencia            |
| CU-07 | Profesor cierra el registro de su clase                         |
| CU-08 | Registrar, cerrar, habilitar edición y corregir asistencia      |
| CU-09 | Administrador crea una asignatura de origen local               |

**Resultado:** `npm run test:e2e -- --runInBand` → **9 suites / 9 pruebas
verdes**. Como comprobación adicional, se ejecutó generación, consumo y rechazo
de reutilización de QR contra PostgreSQL. Una suite automatizada específica de
persistencia sigue siendo una mejora posible.

### 4) Pruebas de carga, estrés y Grafana — 🟡 Validadas en perfil abreviado

Se incorporaron scripts k6 reutilizables:

- `test/performance/load-test.js`: carga normal configurable;
- `test/performance/stress-test.js`: ramp-up, carga normal, estrés y ramp-down;
- `test/performance/workload.js`: preparación y mezcla de flujos;
- resúmenes JSON en `test/performance/results/`;
- Prometheus como receptor de métricas k6;
- dashboard Grafana aprovisionado desde código.

APIs repetibles incluidas en la carga:

1. login;
2. asistencia por RUT;
3. asistencia propia por asignatura;
4. asistencia de la asignatura del profesor;
5. generación de QR.

Las altas y transiciones de estado CU-02, CU-07, CU-08 y CU-09 no se repiten
masivamente porque generarían conflictos de negocio esperados. CU-06 prueba la
generación de QR; el consumo repetido de un mismo estudiante/clase se excluye por
la protección de duplicados y nonce.

Umbrales configurados:

| Perfil |   p95 | Tasa de errores | Checks |
| ------ | ----: | --------------: | -----: |
| Carga  | < 1 s |            < 1% |  > 99% |
| Estrés | < 2 s |            < 5% |  > 95% |

El dashboard muestra solicitudes por segundo, p95 por endpoint, tasa de errores
y usuarios virtuales. Prometheus 3.4.1, Grafana 12.0.2 y el dashboard
`EasyCheck - k6` se levantaron correctamente.

Resultados de validación abreviada:

| Perfil |     VU | Duración | Iteraciones |       p95 | Errores | Checks |
| ------ | -----: | -------: | ----------: | --------: | ------: | -----: |
| Carga  |      5 |     15 s |         342 | 333,40 ms |      0% |   100% |
| Estrés | 5 → 15 |     15 s |         469 | 458,94 ms |      0% |   100% |

Estos resultados demuestran que scripts, exportación Prometheus y dashboard
funcionan, pero no sustituyen los perfiles finales de mayor duración. Faltan la
ejecución final, capturas y discusión de p95/p99/throughput/error rate para el
informe.

El perfil final se ajustó a una matrícula cercana a **10.000 estudiantes**:
la carga ejecuta 10.000 interacciones con 100 VUs y el estrés escala de 100 a
300 VUs. Esta configuración representa volumen y concurrencia de la población,
no 10.000 identidades distintas, ya que el seed de rendimiento masivo aún no
existe.

### 5) SonarQube — 🟡 Configurado, sin evidencia (validar)

- Existe `sonar-project.properties` con fuentes, tests y
  `coverage/lcov.info` combinado.
- Las exclusiones de cobertura están sincronizadas con Jest.
- El flujo de ejecución está documentado en el README.
- Falta ejecutar el scanner, revisar el quality gate y registrar:
  Maintainability, Reliability, Security, bugs, vulnerabilidades, code smells,
  duplicación y hotspots **(validar)**.
- También falta documentar las acciones tomadas frente a los hallazgos
  **(validar)**.

### 6) Escenarios Gherkin — ✅ Cumple (9/9 CU)

Todos los CU tienen al menos una feature con glue/steps ejecutable. Resultado
real de `npm run test:bdd -- --runInBand`:

| Indicador BDD             |        Resultado |
| ------------------------- | ---------------: |
| Features/CU automatizados |          **9/9** |
| Suites                    |            **9** |
| Escenarios                |           **19** |
| Estado                    | **Todos verdes** |

Los archivos se ubican en `test/CU_XX/bdd/features` y
`test/CU_XX/bdd/steps`, manteniendo juntos los escenarios y su implementación.

---

## 5. Matriz de cobertura CU × tipo de prueba

| CU                             | Unit/TDD | Integración | E2E | BDD |
| ------------------------------ | :------: | :---------: | :-: | :-: |
| CU-01 Login                    |    ✅    |     ✅      | ✅  | ✅  |
| CU-02 Registro                 |    ✅    |     ✅      | ✅  | ✅  |
| CU-03 Asistencia por RUT       |    ✅    |     ✅      | ✅  | ✅  |
| CU-04 Asistencia propia        |    ✅    |     ✅      | ✅  | ✅  |
| CU-05 Asistencia de asignatura |    ✅    |     ✅      | ✅  | ✅  |
| CU-06 Registro QR              |    ✅    |     ✅      | ✅  | ✅  |
| CU-07 Cierre de registro       |    ✅    |     ✅      | ✅  | ✅  |
| CU-08 Edición de asistencia    |    ✅    |     ✅      | ✅  | ✅  |
| CU-09 Crear asignatura         |    ✅    |     ✅      | ✅  | ✅  |

Resumen por nivel:

| Nivel                   | Suites | Pruebas/escenarios | Estado   |
| ----------------------- | -----: | -----------------: | -------- |
| Unit/TDD                |     12 |                 51 | ✅ Verde |
| Integración             |      9 |                 74 | ✅ Verde |
| BDD                     |      9 |                 19 | ✅ Verde |
| E2E                     |      9 |                  9 | ✅ Verde |
| Combinado con cobertura |     40 |                154 | ✅ Verde |

---

## 6. Infraestructura, persistencia y configuración

| Componente               | Estado                     | Observación                                                          |
| ------------------------ | -------------------------- | -------------------------------------------------------------------- |
| PostgreSQL               | ✅ Validado                | Conexión TypeORM, datos y registro QR persistido                     |
| Migraciones              | ✅ Validada                | `InitialIntegratedSchema1760000000000` aplicada                      |
| Docker Compose principal | ✅ Validado                | PostgreSQL y backend construyen y arrancan correctamente             |
| API Intranet             | ✅ Simulada por diseño     | La API real no existe; sincronización idempotente probada en memoria |
| Seguridad QR             | ✅ Implementada localmente | HMAC, expiración, nonce y API key de lector                          |
| Autorización             | ✅ Implementada localmente | Cuenta local activa, rol y actor derivados del token                 |
| Tokens                   | 🟡 Simulados               | Determinísticos; JWT real queda como deuda técnica                   |
| Grafana/Prometheus       | ✅ Validados               | Servicios, datasource, dashboard y métricas k6 operativos            |
| SonarQube                | 🟡 Configurado             | Scanner, métricas y quality gate **(validar)**                       |

---

## 7. Brechas restantes para la entrega

| Prioridad | Brecha                               | Acción requerida                                                              |
| --------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| 🟠 Media  | Regresión PostgreSQL no automatizada | Convertir los smoke tests persistidos en una suite repetible                  |
| 🔴 Alta   | Rendimiento final sin evidencia      | Ejecutar perfiles completos y guardar JSON/capturas de Grafana                |
| 🔴 Alta   | SonarQube sin evidencia              | Ejecutar scanner, revisar hallazgos y capturar quality gate **(validar)**     |
| 🔴 Alta   | Informe final                        | Actualizar PDF con trazabilidad, arquitectura, resultados y conclusiones      |
| 🔴 Alta   | Video                                | Grabar pruebas, rendimiento/Grafana y SonarQube en ≤10 minutos                |
| 🟠 Media  | README raíz desactualizado           | Corregir rutas antiguas, payload QR y referencia a `x-user-role`              |
| 🟠 Media  | Evidencia TDD                        | Seleccionar 1–2 ciclos red–green–refactor y respaldarlos con commits/capturas |
| 🟠 Media  | Métricas por módulo                  | Incorporar cobertura por módulo y justificar exclusiones en el informe        |
| 🟡 Baja   | Autenticación productiva             | Reemplazar tokens simulados por JWT o proveedor institucional cuando exista   |

---

## 8. Entregables del Avance 3

| Entregable                      | Estado actual                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Código fuente completo          | ✅ Implementado y validado con Docker/PostgreSQL                                |
| Unitarias, integración y E2E    | ✅ Completas y verdes                                                           |
| Features Gherkin + glue/steps   | ✅ 9/9 CU y 19 escenarios verdes                                                |
| Scripts de ejecución de pruebas | ✅ Disponibles en `package.json`                                                |
| Scripts de carga/estrés         | ✅ Implementados y ejecutados en modo abreviado                                 |
| Export de rendimiento           | ✅ JSON de carga y estrés generados                                             |
| Configuración SonarQube         | ✅ Disponible                                                                   |
| Evidencia SonarQube             | 🟡 **(validar)**                                                                |
| Dashboard Grafana               | ✅ Provisionado desde JSON                                                      |
| Evidencia Grafana               | 🟡 Métricas recibidas; faltan capturas de la ejecución final                    |
| README completo                 | 🟡 Instrucciones de pruebas/rendimiento presentes; contrato raíz por actualizar |
| Informe PDF final               | ❌ Pendiente                                                                    |
| Video(s) ≤10 min                | ❌ Pendiente                                                                    |
| Link del repositorio y anexos   | ❌ Pendiente de entrega                                                         |

---

## 9. Cómo reproducir las métricas locales

Desde `Easycheck-backend/easycheck-backend/`:

```bash
npm install
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
- E2E: 9 suites / 9 pruebas;
- cobertura combinada: 40 suites / 154 pruebas;
- statements 94,15%, branches 81,83%, functions 97,39%, lines 94,24%.

Para rendimiento, consultar `test/performance/README.md`. k6, Prometheus,
Grafana y Docker/PostgreSQL fueron validados con perfiles abreviados. SonarQube
y las ejecuciones finales de rendimiento permanecen **(validar)**.

---

_Evaluación actualizada a partir del estado integrado del backend. Los frontends
web y móvil no forman parte de esta auditoría de calidad de API._
