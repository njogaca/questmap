# Restaura un respaldo creado con backup.ps1.
# Uso:  .\scripts\restore.ps1 backups\questmap_20261105_2130.sql
# ATENCIÓN: reemplaza TODO el contenido actual de la base de datos.
param(
    [Parameter(Mandatory = $true)][string]$File,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path $File)) { throw "No existe el archivo: $File" }

$user = 'questmap'; $dbName = 'questmap'
if (Test-Path .env) {
    foreach ($line in Get-Content .env) {
        if ($line -match '^\s*POSTGRES_USER=(.+)$') { $user = $Matches[1].Trim() }
        if ($line -match '^\s*POSTGRES_DB=(.+)$') { $dbName = $Matches[1].Trim() }
    }
}

if (-not $Force) {
    $answer = Read-Host "Esto reemplaza tu progreso actual con '$File'. Escribe SI para continuar"
    if ($answer -ne 'SI') { Write-Host 'Cancelado.'; exit 1 }
}

Write-Host 'Deteniendo la app para que nadie escriba durante la restauración...'
docker compose stop app | Out-Null

Write-Host "Restaurando $File ..."
Get-Content -Path $File -Raw -Encoding utf8 | docker compose exec -T db psql -U $user -d $dbName -v ON_ERROR_STOP=1 --quiet | Out-Null
$code = $LASTEXITCODE

Write-Host 'Arrancando la app (correrá migraciones y seed sin tocar tu progreso)...'
docker compose start app | Out-Null

if ($code -ne 0) { throw "psql falló (código $code). La app volvió a arrancar; revisa el archivo de respaldo." }
Write-Host 'Restauración completa.'
