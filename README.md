# QuestMap

Mapa de logros (estilo Neon Atlas) para prepararte para la oferta de Home Depot — Software Engineer, Backend & Distributed Systems. La especificación completa está en [SPEC.md](SPEC.md).

## Requisitos

- Windows + Docker Desktop (WSL2) + PowerShell 7.
- Recomendado: clonar el repo dentro del sistema de archivos de WSL2 (más rápido).

## Arrancar

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Abre http://127.0.0.1:3000. Al arrancar, la app corre las migraciones y el seed automáticamente.

Revisa en `.env` que `TZ` sea tu zona horaria (`America/New_York` para Atlanta): de ella depende qué cuenta como "hoy" en la racha.

## Comandos útiles

```powershell
docker compose logs -f app           # ver logs (incluye el resultado del seed)
docker compose down                  # detener (los datos NO se pierden: volumen questmap_pgdata)
docker compose up -d --build         # reconstruir tras cambiar código o contenido
npm test                             # pruebas de la lógica (racha, SRS, XP, quiz, readiness, desbloqueo)
```

## Contenido

Todo vive en `content/` (YAML):

| Carpeta | Qué hay |
|---|---|
| `skills.yaml` | Las 14 skills con su `target_xp` (y el cálculo comentado) |
| `resources.yaml` | Recursos de estudio. Solo `verified: true` si la URL se abrió; si no, `url: null` + `how_to_find` |
| `zones/*.yaml` | Zonas → niveles → quests (learn, glossary, lab, quiz, micro, open_answer, interview, boss) |
| `glossary/*.yaml` | Términos con definición en español, en inglés, ejemplo y analogía |

Edita o agrega archivos y reconstruye. El seed valida todo con Zod (si algo está mal, el log dice el archivo y el campo), hace upsert por `slug`, nunca duplica ni borra tu progreso, y lo que quites del YAML queda `archived`.

## Acceso desde otro dispositivo (opcional, Tailscale)

La app solo escucha en `127.0.0.1`. Si algún día quieres abrirla desde el celular o desde otra PC fuera de casa, usa Tailscale (gratis) **sin** abrir puertos:

1. Instala Tailscale en esta PC y en el otro dispositivo, e inicia sesión con la misma cuenta.
2. En el panel de Tailscale (DNS) activa **MagicDNS** y **HTTPS Certificates**.
3. En PowerShell, en esta PC:

```powershell
tailscale serve --bg 3000
```

4. Abre `https://<nombre-de-tu-pc>.<tu-tailnet>.ts.net` desde el otro dispositivo.

Para ver el estado o apagarlo:

```powershell
tailscale serve status
```

```powershell
tailscale serve --https=443 off
```

Reglas de seguridad: nunca publiques el puerto en `0.0.0.0`, nunca uses port forwarding en el router y nunca uses `tailscale funnel` (eso sí lo expondría a internet). Limitación: la PC debe estar encendida y Docker corriendo.
