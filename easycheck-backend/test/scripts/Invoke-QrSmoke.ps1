[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$ReaderKey
)

$ErrorActionPreference = 'Stop'

function Get-ReaderKey {
  param([string]$ProvidedKey)

  if ($ProvidedKey) {
    return $ProvidedKey
  }

  # El .env pertenece al compose, pero reutilizamos su clave si existe para no
  # pedir que se copie una credencial en el comando de smoke.
  $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
  $envFile = Join-Path $repositoryRoot '.env'
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object {
      $_ -match '^\s*READER_API_KEY\s*='
    } | Select-Object -First 1

    if ($line) {
      $value = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
      if ($value) {
        return $value
      }
    }
  }

  # Es la clave por defecto del backend cuando se ejecuta localmente sin Docker.
  return 'easycheck-local-reader-key'
}

function Get-HttpStatusCode {
  param([System.Management.Automation.ErrorRecord]$ErrorRecord)

  if ($ErrorRecord.Exception.Response) {
    return [int]$ErrorRecord.Exception.Response.StatusCode
  }
  return $null
}

$readerKey = Get-ReaderKey $ReaderKey
$adminHeaders = @{ Authorization = 'Bearer mock-token-44444444-4-administrador' }
$studentHeaders = @{ Authorization = 'Bearer mock-token-55555555-5-estudiante' }
$readerHeaders = @{ 'x-reader-key' = $readerKey }

Write-Host "1/4 Sincronizando la Intranet simulada..."
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/api-intranet/sync" -Headers $adminHeaders | Out-Null

Write-Host "2/4 Generando QR para el estudiante 55555555-5 y clase 1002..."
$qr = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/students/me/classes/1002/qr" -Headers $studentHeaders

$body = @{ qrToken = $qr.qrToken } | ConvertTo-Json -Compress
Write-Host "3/4 Registrando la asistencia (se espera HTTP 201)..."
try {
  $created = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/v1/assistance/register" `
    -Headers $readerHeaders `
    -ContentType 'application/json' `
    -Body $body
} catch {
  if ((Get-HttpStatusCode $_) -eq 409) {
    throw 'La asistencia de 55555555-5 para la clase 1002 ya existe. Reinicia el backend local o usa una base de datos de prueba limpia antes de repetir el smoke completo.'
  }
  throw
}

if (-not $created.recordId) {
  throw 'El endpoint respondió sin recordId; no se puede considerar aprobado el registro de asistencia.'
}

Write-Host "4/4 Repitiendo el mismo QR (se espera HTTP 409 por duplicado)..."
try {
  Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/v1/assistance/register" `
    -Headers $readerHeaders `
    -ContentType 'application/json' `
    -Body $body | Out-Null
  throw 'El QR duplicado fue aceptado; se esperaba HTTP 409.'
} catch {
  if ((Get-HttpStatusCode $_) -ne 409) {
    throw
  }
}

Write-Host "Smoke QR aprobado: asistencia creada con recordId $($created.recordId) y duplicado rechazado con HTTP 409." -ForegroundColor Green
