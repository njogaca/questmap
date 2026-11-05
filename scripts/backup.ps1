# Respaldo de la base de datos de QuestMap.
# Uso (desde la carpeta del repo):  .\scripts\backup.ps1
# Genera backups\questmap_YYYYMMDD_HHmm.sql con pg_dump ejecutado DENTRO del contenedor "db".
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$user = 'questmap'; $dbName = 'questmap'
if (Test-Path .env) {
    foreach ($line in Get-Content .env) {
        if ($line -match '^\s*POSTGRES_USER=(.+)$') { $user = $Matches[1].Trim() }
        if ($line -match '^\s*POSTGRES_DB=(.+)$') { $dbName = $Matches[1].Trim() }
    }
}

New-Item -ItemType Directory -Force backups | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$file = Join-Path 'backups' "questmap_$stamp.sql"

Write-Host "Creando respaldo en $file ..."
# --clean --if-exists: el archivo puede restaurarse sobre una BD que ya tiene tablas.
docker compose exec -T db pg_dump -U $user -d $dbName --clean --if-exists --no-owner | Set-Content -Path $file -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló (código $LASTEXITCODE). ¿Está corriendo 'docker compose up -d'?" }

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Host "Listo: $file ($size KB)"
