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
npm test                             # pruebas de la lógica (racha, SRS, XP, quiz, readiness, desbloqueo, parser de Claude)
npm run test:db                      # pruebas de integración con Postgres (seed idempotente, export); requiere docker compose up
```

## Respaldo (no pierdas tu progreso)

Tu progreso vive en el volumen de Docker `questmap_pgdata`: sobrevive a `docker compose down` y a reconstruir. Aun así, haz respaldos:

```powershell
.\scripts\backup.ps1
```

Crea `backups\questmap_AAAAMMDD_HHmm.sql`. Para restaurarlo (reemplaza todo el progreso actual):

```powershell
.\scripts\restore.ps1 backups\questmap_20261105_2130.sql
```

Segunda red de seguridad: en **Ajustes → Respaldo** puedes **exportar** tu progreso a JSON (guárdalo en OneDrive o Google Drive) e **importarlo** después. El JSON usa slugs, así que sirve aunque la base se recree desde cero. Ahí también puedes **reiniciar una zona** (con confirmación).

Nunca uses `docker compose down -v`: la `-v` borra el volumen con tu progreso.

## Claude (calificaciones y entrevistas)

- **Modo A (por defecto, $0):** la app genera un prompt; lo pegas en claude.ai y pegas la respuesta de vuelta.
- **Modo B (API):** pon tu clave en `.env` y reconstruye. Todo ocurre dentro de la app; la clave nunca llega al navegador.

```powershell
notepad .env   # ANTHROPIC_API_KEY=sk-ant-...   CLAUDE_MODEL=claude-sonnet-5-5   MAX_API_CALLS_PER_DAY=50
```

```powershell
docker compose up -d --build
```

En **Ajustes** ves si la API está activa, las llamadas de hoy contra el tope y los tokens aproximados por sesión. Si la API falla o llegas al tope, la app cae al Modo A sin perder lo que escribiste.

## Contenido

Todo vive en `content/` (YAML):

| Carpeta | Qué hay |
|---|---|
| `skills.yaml` | Las 14 skills con su `target_xp` (y el cálculo comentado) |
| `resources.yaml` | Recursos de estudio. Solo `verified: true` si la URL se abrió; si no, `url: null` + `how_to_find` |
| `zones/*.yaml` | Zonas → niveles → quests (learn, glossary, lab, quiz, micro, open_answer, interview, boss) |
| `glossary/*.yaml` | Términos con definición en español, en inglés, ejemplo y analogía |
| `interviews/*.yaml` | Plantillas del Interview Arena (conductuales, técnicas por zona, system design, take-home) |

Edita o agrega archivos y reconstruye. El seed valida todo con Zod (si algo está mal, el log dice el archivo y el campo), hace upsert por `slug`, nunca duplica ni borra tu progreso, y lo que quites del YAML queda `archived`.

### Completar las zonas "próximamente" (content:new)

Las zonas 4–9 y los niveles 2–5 del Arena tienen niveles y quests esqueleto. Para escribir un nivel completo:

1. Genera el prompt (queda en `content\_drafts\`):

```powershell
npm run content:new -- --zone observability-observatory --level 1
```

2. Dáselo a Claude: pégalo en claude.ai (o pídeselo a Claude Code) y guarda el bloque YAML de la respuesta como `content\_drafts\observability-observatory-1.yaml`. Con la API configurada puedes saltarte este paso con `--api`.
3. Valídalo e intégralo (si algo falla, no se escribe nada):

```powershell
npm run content:apply -- --file content\_drafts\observability-observatory-1.yaml
```

4. Reconstruye: `docker compose up -d --build`. Revisa el log del seed: si avisa que un `target_xp` se aleja más de 15 % del contenido real, ajústalo en `skills.yaml`.

Para validar sin escribir agrega `--dry-run`.

## Efectos

En **Ajustes → Efectos** puedes apagar las animaciones (glitch al ganar XP, línea de escaneo del mapa, texto que se descifra) y activar los sonidos (apagados por defecto). Los sectores bloqueados del mapa aparecen como "datos cifrados" y se van descifrando a medida que cumples sus requisitos.

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
