# Guía para agentes de IA

Este archivo es para cualquier IA que vaya a modificar QuestMap (Claude Code, Codex, Cursor, lo que sea).
Léelo **antes** de escribir código. Está escrito a partir de errores reales cometidos en este repo:
cada regla de aquí existe porque alguien ya se equivocó en eso.

`CLAUDE.md` solo apunta a este archivo.

---

## 1. Qué es esto, en diez líneas

App web local de **un solo usuario** para estudiar: un mapa de videojuego donde cada zona enseña,
practica y evalúa. Corre entera en Docker Compose.

- **Next.js 15 + React 19** (App Router, Server Components, Server Actions)
- **Postgres 16 + Drizzle ORM**, migraciones SQL en `drizzle/`
- **Tailwind 4**, temas por tokens CSS en `src/app/globals.css`
- **Contenido en YAML** (`content/`) validado con Zod y cargado por un seed idempotente
- Pruebas de lógica con `node:test`

Dos conceptos que ordenan todo lo demás:

- **Contenido** = lo que el seed escribe desde `content/`. Zonas, niveles, quests, skills, glosario.
- **Progreso** = lo que hace el usuario. `quest_progress`, `xp_events`, `study_log`, `glossary_srs`.
  **El seed jamás toca una fila de progreso.** Si una tarea tuya tendría que hacerlo, está mal planteada.

---

## 2. Requisitos técnicos

| Requisito | Para qué | Comprobar |
|---|---|---|
| **Docker Desktop abierto** | Es el único entorno de ejecución | `docker compose version` |
| Git | Historial | `git --version` |
| Node.js LTS | Opcional en el host, ver abajo | `node --version` |
| `.env` | `TZ` decide qué es "hoy" en la racha | `cat .env` |

**No hay `node_modules` en el host de este repo.** No asumas que puedes correr `npm run`, `tsc` o
`drizzle-kit` directamente. Todo pasa por contenedores. Si necesitas una herramienta de desarrollo,
construye la etapa `deps` del Dockerfile, que ya tiene las dependencias de desarrollo:

```bash
docker build --target deps -t questmap-deps .
```

En Git Bash sobre Windows, los montajes necesitan ruta estilo Windows y desactivar la conversión:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/src:/app/src" -w /app questmap-deps <comando>
```

---

## 3. El ciclo de trabajo

### `docker compose up -d` NO recompila

El servicio `app` es `build: .` y **no monta volúmenes**: el Dockerfile hace `COPY . .` y
`npm run build`, así que el código y el contenido quedan horneados en la imagen. Cualquier cambio en
`src/` o `content/` exige:

```bash
docker compose up -d --build
```

Sin `--build` reutilizas la imagen anterior y vas a creer que tu cambio no funcionó. Este es el error
número uno de este repo.

### Valida el contenido antes de reconstruir

Un build completo tarda minutos; validar el YAML tarda segundos. Hazlo siempre antes:

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/src:/app/src" -v "$(pwd -W)/content:/app/content" -w /app \
  questmap-deps npx tsx -e "import {loadContent} from './src/content/load'; const c=loadContent(); console.log('OK', c.zones.length, 'zonas')"
```

Detecta YAML malformado **y** referencias rotas (skill, recurso, término o plantilla inexistente).

### Si el seed falla, la app no arranca

El `CMD` encadena `db:migrate && db:seed && npm start`. Con `restart: unless-stopped`, un seed que
falla deja el contenedor en **bucle de reinicio**: la app queda caída, no degradada. Es deliberado —
contenido inválido no llega a servirse— pero significa que un YAML roto tumba la app entera.
Tras cualquier cambio de contenido, mira el log:

```bash
docker compose logs app --tail 20
```

Busca `[seed] OK` y la cuenta `quest_progress intacto: N filas`.

### Migraciones

`drizzle-kit generate` necesita los snapshots de `drizzle/meta/` para diffear bien, así que **no
escribas el SQL a mano sin generar también el snapshot**. Genera dentro del contenedor:

```bash
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/src:/app/src" -v "$(pwd -W)/drizzle:/app/drizzle" -v "$(pwd -W)/drizzle.config.ts:/app/drizzle.config.ts" \
  questmap-deps npx drizzle-kit generate --name <nombre>
```

Luego **añade el backfill a mano** al final del `.sql` generado, separando cada sentencia con
`--> statement-breakpoint`. Antes de aplicar una migración con backfill, saca una copia:

```bash
docker compose exec -T db pg_dump -U questmap -d questmap > respaldo.sql
```

---

## 4. Convenciones que se omiten con facilidad

Esta sección es el motivo de este archivo. Son cosas que ya existen en el repo y que es fácil
reinventar mal por no buscarlas primero.

### Botones: usa `src/components/ui.ts`

Hay tres clases compartidas: `btn`, `btnPrimary`, `btnGhost`. **Úsalas.**

```tsx
import { btnPrimary } from "@/components/ui";
<button className={btnPrimary}>Acción</button>
```

Trampa real: **`.hud-btn` no es un estilo de botón completo.** Solo recorta la esquina, pone
mayúsculas y espacia las letras — no trae borde ni fondo. Escribir `className="hud-btn px-3 py-1"`
produce texto en mayúsculas que no parece pulsable. `btnPrimary` es `hud-btn` **más** el borde, el
fondo y el relleno al pasar el ratón. Esto ya pasó una vez y hubo que rehacerlo.

Antes de escribir clases de un componente nuevo, revisa `src/components/ui.ts` y las clases `hud-*`
de `globals.css` (`hud-panel`, `hud-panel-done`, `hud-item`, `hud-label`, `hud-bar`, `hud-corners`).

### Colores: nunca literales

Todo sale de tokens en `:root` y sus variantes `html[data-theme="..."]`. Usa las utilidades
(`text-available`, `bg-surface-2`, `border-line`, `text-done`, `text-warn`), no `#hex` ni
`text-blue-500`. Un color a mano se rompe en las otras cinco paletas.

Para **añadir una paleta** hay que tocar **cuatro** sitios, y olvidar uno la deja medio rota:

1. `src/app/globals.css` — el bloque `html[data-theme="<id>"]` con los tokens
2. `src/components/effects/prefs.ts` — el tipo `Theme` y el array `THEMES`
3. `src/app/layout.tsx` — la lista blanca dentro de `BOOT_SCRIPT` (si falta, parpadea la paleta
   por defecto antes de aplicarse la tuya)
4. `src/content/schema.ts` — el `z.enum` de `palette` en `trackSchema`, o el seed rechaza una ruta
   que use esa paleta

La paleta **Animus** es la única clara. Si tocas colores, pruébala: es la que delata cualquier color
fijo que se te haya colado, porque el resto de paletas son oscuras y lo disimulan.

### Anchos de página: hay tres niveles, respétalos

| Nivel | Clase | Páginas |
|---|---|---|
| Lectura | `max-w-3xl` | quest, zone, level, glosario, ajustes |
| Tablero | `max-w-7xl` | inicio, arena, rutas |
| Mapa | `max-w-6xl` | mapa |

El mapa tiene su propio nivel **y no va a pantalla completa**, aunque sea tentador. Su SVG tiene un
`viewBox` fijo de 1000×640, así que más ancho no da más lienzo: da zoom. Los hexágonos y las
etiquetas crecen y las zonas no se separan. A pantalla completa llegó a 1540 px (1.54×) y se veía
inflado; con `max-w-6xl` el mapa queda en ~800 px y al panel de sector le tocan sus 300 px justos.
Para tener más lienzo de verdad hay que ampliar el viewBox y recolocar las zonas.

Si cambias el nivel tablero, cambia también `max-w-7xl` en `src/components/hud/HudNav.tsx` o la
cabecera deja de alinearse con el contenido, que se nota mucho más que el ancho en sí.

### YAML en español: entrecomilla los dos puntos

Esto tumbó la app una vez. En YAML, un `": "` dentro de un escalar sin comillas se interpreta como
mapa anidado, y escribir en español lleva a usar dos puntos explicativos todo el tiempo:

```yaml
# ROMPE el parser
definition_es: Los tres objetivos: confidencialidad, integridad y disponibilidad.

# Correcto
definition_es: "Los tres objetivos: confidencialidad, integridad y disponibilidad."
```

Los bloques `|` y `>` no tienen este problema: ahí puedes escribir libremente.

### Recursos: `verified: true` solo si abriste la URL

Regla escrita en `content/resources.yaml`. Si no la comprobaste en esa sesión, va `false`. Si no hay
URL, `url: null` **y** `how_to_find` obligatorio.

### `target_xp`: planeado, no publicado

`target_xp` es el XP cuando esté completo **todo** el contenido previsto de esa skill, incluido lo que
aún está en `outline`. El seed solo avisa cuando el target se queda **corto** respecto a lo ya
publicado (`actual > target * 1.15`), nunca por contenido pendiente. Así que no bajes el target para
callar un aviso: el aviso significa que el target estaba mal.

### Contenido incompleto va en `outline`, no inventado

`status: outline` existe para eso. Cuenta 0 en readiness y se muestra como "próximamente". Es
preferible una zona honesta a medio escribir que contenido de relleno.

---

## 5. Invariantes que no se pueden romper

1. **El seed nunca toca progreso.** Solo hace upsert por `slug` y marca `archived` lo que desaparece
   del YAML. Si una columna no está en el objeto `values` del upsert, el `ON CONFLICT DO UPDATE SET`
   **no la toca** — de eso depende que `track_id` sobreviva a cada reinicio.
2. **La racha es global y se deriva de `study_log.date`.** No la partas por ruta ni por nada: el
   usuario estudió ese día. `profile.streak*` es solo caché.
3. **La app escucha en `127.0.0.1`.** Nunca la publiques en `0.0.0.0`.
4. **`docker compose down -v` borra el progreso.** La `-v` elimina el volumen `questmap_pgdata`.
   No lo sugieras jamás.
5. **La zona horaria manda.** `localDate()` y `localWeekday()` usan `TZ`; no uses `new Date()` crudo
   para decidir qué día es.

---

## 6. Modelo de rutas (tracks)

Una **ruta** es un mundo propio: sus zonas, sus skills, su XP y su readiness.

**La regla central: `track_id` NULL significa TRANSVERSAL**, es decir que la fila vale para todas las
rutas. Se modela con NULL y no con un booleano `shared` para que no exista el estado contradictorio
"compartida pero además pertenece a la ruta 5". Aplica igual en `zones`, `skills`, `xp_events` y
`study_log`.

Hoy son transversales las zonas Interview Arena, English Track y Terminal Tundra, y las skills
`english`, `linux` y `ai_tools`.

Cómo leer contenido con la ruta aplicada:

- `loadWorld()` **sin argumentos** resuelve la ruta activa por dentro e incluye las transversales.
  Mantén esa firma: hay 13 llamadas que dependen de ella. El argumento explícito es solo para mirar
  otra ruta sin activarla.
- Niveles y quests heredan el recorte de sus zonas, en memoria.
- Un prerrequisito solo cuenta si **sus dos extremos** están en la ruta.
- `activeTrackTerms()` en `src/lib/glossary.ts` recorta el glosario. Está escrito **por exclusión**
  (fuera lo de otras rutas) y no por inclusión, para que entren solos los términos sin zona.

En el YAML de una zona o skill, el campo `track`:

- **ausente** → el seed no toca lo que ya haya en la base
- **`null`** → transversal explícito
- **`"<slug>"`** → esa ruta

Las rutas se definen en `content/tracks.yaml`. `palette` e `ui` son el **aspecto por defecto** de la
ruta y se aplican juntos al activarla (`TrackSwitch` los escribe en **una sola** llamada a
`writePrefs`: dos seguidas repintarían dos veces y la segunda leería un estado a medias). Son
valores por defecto, no imposiciones — el usuario puede sobrescribirlos en Ajustes y su elección
manda.

Cada interfaz dibuja el mapa a su manera: `hud` hexágonos, `terminal` un escaneo `nmap`, `retro`
un POST de BIOS. Con el ancho acotado de `max-w-6xl` las tres quedan bien sin reglas especiales.

### Añadir una interfaz

`.ui-hud` y `.ui-term` **no** significan "interfaz HUD" e "interfaz Terminal": significan pieza
**gráfica** y pieza **de texto** (barra de progreso contra barra ASCII, nav con corchetes contra
nav tipo tmux). Por eso la regla de visibilidad pregunta "¿es HUD?" y no "¿es Terminal?", y una
interfaz textual nueva hereda toda esa capa sin tocar nada.

Lo único propio de cada interfaz es la vista del mapa, en `src/components/map/`. Para añadir una:

1. Un componente nuevo en `src/components/map/` que reciba `MapViewProps`, con la clase
   `map-view map-<id>` en su raíz.
2. Renderizarlo en `WorldMap.tsx` junto a los demás.
3. En `globals.css`: `html:not([data-ui="<id>"]) .map-<id> { display: none !important; }` y el
   bloque `html[data-ui="<id>"]` con su estética.
4. Registrar el id en `prefs.ts` (tipo `Ui`, array `UIS` y la validación de `readPrefs`), en el
   `BOOT_SCRIPT` de `layout.tsx`, en el `z.enum` de `ui` en `src/content/schema.ts` y en el
   `DEFAULT_THEME` de `EffectsSettings.tsx`.

**Todas las vistas se renderizan y el CSS oculta las que no tocan.** Es a propósito: el
`BOOT_SCRIPT` fija `data-ui` antes del primer pintado, así que no hay parpadeo ni desajuste de
hidratación. Renderizar condicionalmente desde `localStorage` haría que se viera un instante la
interfaz por defecto antes de saltar a la tuya. Si algún día hay tantas vistas que el coste de DOM
pese, lo que hay que cambiar es *eso*, no el reparto en componentes.

---

## 7. Dónde está cada cosa

| Ruta | Qué hay |
|---|---|
| `src/db/schema.ts` | Esquema Drizzle. Contenido arriba, progreso abajo, separados por un comentario |
| `src/content/schema.ts` | Zod del YAML. Límites: máximo 5 niveles por zona, `map` en viewBox 1000×640 |
| `src/content/load.ts` | Carga y valida `content/`, incluida la integridad referencial |
| `scripts/seed.ts` | Seed idempotente |
| `src/lib/world.ts` | `loadWorld()`: contenido + progreso + estados, cacheado por petición |
| `src/lib/dashboard.ts` | Datos de la portada, incluida la misión diaria |
| `src/lib/track.ts` | Rutas: activa, listado, resumen |
| `src/lib/readiness.ts` | Cobertura y readiness real (dos métricas distintas, no las mezcles) |
| `src/lib/game.ts` | XP, insignias, racha. `addXp` deriva el `track_id` desde la zona de la quest |
| `src/lib/portability.ts` | Export/import de progreso por slug |
| `src/components/ui.ts` | **Clases de botón compartidas** |
| `SPEC.md` | Especificación original del proyecto |
| `docs/PLANTILLA-QUESTMAP.md` | Plantilla genérica para crear otro QuestMap |

---

## 8. Antes de decir que terminaste

- [ ] `docker compose up -d --build` y `docker compose logs app --tail 20` muestran `[seed] OK`
- [ ] `quest_progress intacto: N filas` con el N de antes
- [ ] Las páginas tocadas responden 200
- [ ] Si tocaste rutas, probaste el aislamiento **en los dos sentidos**, no solo en uno
- [ ] Si tocaste UI, lo miraste renderizado, no solo compilado

Y al verificar por `grep` sobre el HTML, elige cadenas distintivas: buscar `class` o un prefijo de
slug da falsos positivos en cada atributo del documento. Eso también ya pasó.
