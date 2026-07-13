[CmdletBinding()]
param(
  [ValidateSet('Load', 'Stress')]
  [string]$Test = 'Load',

  [ValidateSet('Quick', 'Final')]
  [string]$Profile = 'Quick',

  [string]$BaseUrl = 'http://localhost:3000',

  [switch]$WithPrometheus,

  [string]$PrometheusUrl = 'http://localhost:9090/api/v1/write'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
  throw 'No se encontró k6 en PATH. Instálalo y verifica con: k6 version'
}

$scriptName = if ($Test -eq 'Load') { 'load-test.js' } else { 'stress-test.js' }
$scriptPath = Join-Path $PSScriptRoot $scriptName
$k6Arguments = @('run', '-e', "BASE_URL=$BaseUrl")

if ($Profile -eq 'Quick') {
  if ($Test -eq 'Load') {
    # Perfil seguro para comprobar la instalación y los endpoints antes del final.
    $k6Arguments += @(
      '-e', 'TOTAL_STUDENT_OPERATIONS=100',
      '-e', 'VUS=5',
      '-e', 'MAX_DURATION=1m'
    )
  } else {
    $k6Arguments += @(
      '-e', 'NORMAL_VUS=5',
      '-e', 'STRESS_VUS=15',
      '-e', 'RAMP_UP=10s',
      '-e', 'NORMAL_HOLD=15s',
      '-e', 'STRESS_RAMP=10s',
      '-e', 'STRESS_HOLD=15s',
      '-e', 'RAMP_DOWN=10s'
    )
  }
}

$previousPrometheusUrl = $env:K6_PROMETHEUS_RW_SERVER_URL
$previousTrendStats = $env:K6_PROMETHEUS_RW_TREND_STATS
try {
  if ($WithPrometheus) {
    # La salida Prometheus de k6 se configura por variables de proceso, por eso
    # el script las aplica y las restaura automáticamente.
    $env:K6_PROMETHEUS_RW_SERVER_URL = $PrometheusUrl
    $env:K6_PROMETHEUS_RW_TREND_STATS = 'p(95),p(99),min,max'
    $k6Arguments += @('-o', 'experimental-prometheus-rw')
  }

  Write-Host "Ejecutando $Test ($Profile) contra $BaseUrl..." -ForegroundColor Cyan
  & k6 @k6Arguments $scriptPath
  $exitCode = $LASTEXITCODE
} finally {
  $env:K6_PROMETHEUS_RW_SERVER_URL = $previousPrometheusUrl
  $env:K6_PROMETHEUS_RW_TREND_STATS = $previousTrendStats
}

exit $exitCode
