# QuestMap

Mapa de logros (estilo Neon Atlas) para prepararte para la oferta de Home Depot — Backend & Distributed Systems. Ver [SPEC.md](SPEC.md).

## Requisitos

- Windows + Docker Desktop (WSL2) + PowerShell.
- Recomendado: clonar el repo dentro del sistema de archivos de WSL2 (más rápido).

## Arrancar

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Abre http://127.0.0.1:3000. Al arrancar, la app corre las migraciones y el seed automáticamente.

## Comandos útiles

```powershell
docker compose logs -f app           # ver logs
docker compose down                  # detener (los datos NO se pierden: volumen questmap_pgdata)
docker compose up -d --build         # reconstruir tras cambiar código o contenido
```

## Contenido

Todo vive en `content/` (YAML). Edita o agrega archivos y reconstruye; el seed hace upsert por `slug`, nunca duplica ni borra tu progreso, y lo que quites del YAML queda `archived`.

## Pendiente (siguientes fases)

Guía de Tailscale (`tailscale serve`), backup/restore y export/import se documentan en las fases 4 y 6.
