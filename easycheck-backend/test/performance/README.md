# Rendimiento de EasyCheck

EasyCheck está proyectado para cerca de **10.000 estudiantes**. Los perfiles
k6 representan esa población mediante volumen de operaciones y una concurrencia;
no suponen que las 10.000 personas estén conectadas al mismo tiempo ni que
existan 10.000 identidades únicas en el seed actual.

## Qué se ejercita

Cada iteración selecciona uno de estos endpoints: login, consulta de asistencia
por RUT, consulta propia del estudiante, consulta del profesor o generación de
QR. `setup()` sincroniza una vez la Intranet simulada. Las altas, cambios de
estado y consumo del QR se prueban en E2E, porque repetirlos masivamente
provocaría conflictos de negocio esperados.

| Perfil | Volumen/concurrencia | Finalidad |
| --- | --- | --- |
| Carga Quick | 100 interacciones / 5 VUs | Comprobar configuración y endpoints |
| Carga Final | 10.000 interacciones / 100 VUs | Demanda normal representativa |
| Estrés Quick | 5 → 15 VUs | Comprobar el circuito en pocos segundos |
| Estrés Final | 100 → 300 VUs | Observar degradación bajo peak |

## Ejecución recomendada

1. Iniciar el backend en `http://localhost:3000`. Puede ser local, usando
   repositorios en memoria, o estar conectado a PostgreSQL.
2. Desde esta carpeta, ejecutar el helper de perfil:

```powershell
.\Invoke-K6.ps1 -Test Load -Profile Quick
.\Invoke-K6.ps1 -Test Stress -Profile Quick
```

Para los perfiles finales:

```powershell
.\Invoke-K6.ps1 -Test Load -Profile Final
.\Invoke-K6.ps1 -Test Stress -Profile Final
```

No hay que definir `$env:VUS`, `$env:TOTAL_STUDENT_OPERATIONS` ni las rampas
manualmente. `Invoke-K6.ps1` las aplica solamente al proceso k6 y no modifica la
consola del usuario.

Si el backend no está en `localhost:3000`, indicar la URL:

```powershell
.\Invoke-K6.ps1 -Test Load -Profile Quick -BaseUrl 'http://localhost:3010'
```

## Prometheus y Grafana (opcional)

Los perfiles funcionan sin observabilidad adicional. Para enviar métricas a la
instancia del compose de monitoring:

```powershell
.\Invoke-K6.ps1 -Test Load -Profile Final -WithPrometheus
.\Invoke-K6.ps1 -Test Stress -Profile Final -WithPrometheus
```

El compose de Prometheus/Grafana debe estar iniciado previamente. El helper
configura y restaura `K6_PROMETHEUS_RW_SERVER_URL` automáticamente.

## Resultados y umbrales

Los JSON completos se escriben en `test/performance/results/`:

- `load-summary.json`
- `stress-summary.json`

Umbrales configurados:

- carga: p95 menor a 1 s, errores menores a 1% y checks sobre 99%;
- estrés: p95 menor a 2 s, errores menores a 5% y checks sobre 95%.

Los resultados miden latencia, errores, checks, solicitudes e iteraciones. No se
debe presentar el perfil como prueba de 10.000 cuentas individuales mientras no
exista un seed de rendimiento con 10.000 estudiantes, asignaturas e
inscripciones.
