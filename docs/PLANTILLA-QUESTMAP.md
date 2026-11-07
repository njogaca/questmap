# QuestMap — Plantilla genérica (spec para Claude Code)

> **Antes de empezar, necesitas tener instalado** (lista completa en la sección "Dependencias"):
> - **Docker** (Docker Desktop en Windows/macOS, con WSL2 en Windows) — corre la app y la base de datos. Ábrelo antes de usar Claude Code.
> - **Git** — historial y commits por fase.
> - **Node.js LTS** (incluye npm) — para los comandos de contenido (`content:new`, `content:apply`) y las pruebas desde tu PC.
> - **Claude Code** — el que construye todo.
> - Opcional: una **API key de Anthropic con créditos** (sin ella todo funciona en modo copiar/pegar) y **Tailscale** (solo si usarás el celular).
>
> **Cómo usar este archivo**
> 1. Copia este archivo en una carpeta vacía con el nombre `SPEC.md`.
> 2. Rellena **solo la sección 0 (Brief)**. Todo lo demás es genérico y ya está probado.
> 3. Abre Claude Code en esa carpeta y escribe:
>    `Lee SPEC.md completo y empieza por la Fase 0. Después de que apruebe el currículo, construye las fases en orden sin preguntarme detalles menores.`
>
> **Instrucciones para Claude Code:** lee todo el archivo antes de escribir código. Solo hay **un punto de parada obligatorio**: la aprobación del currículo al final de la Fase 0. Después decide los detalles menores tú mismo. Haz un commit al terminar cada fase y verifica que `docker compose up -d --build` funciona antes de pasar a la siguiente.

---

## 0. Brief (RELLENAR)

```yaml
objetivo:
  tipo: job            # job | skills
  # Si tipo = job: pega la URL y TAMBIÉN el texto completo de la oferta (las URLs caducan).
  oferta_url: ""
  oferta_texto: |
    (pegar aquí la descripción completa: responsabilidades, required, preferred)
  # Si tipo = skills: lista de lo que quieres dominar y para qué.
  skills_deseadas: []  # ej. ["Rust", "Kubernetes", "SQL avanzado"]
  meta_final: ""       # ej. "Pasar entrevistas de Backend Senior" o "Construir y publicar una app en Rust"
  fecha_objetivo: ""   # opcional, ej. 2027-03-01

usuario:
  nombre: ""
  experiencia_previa: |
    (rol actual, años, tecnologías que ya domina. Sirve para "puentear" en vez de repetir.)
  idioma_ui: es        # idioma de la interfaz y las explicaciones
  idioma_objetivo: en  # idioma de entrevistas / documentación (puede ser igual a idioma_ui)
  nivel_idioma_objetivo: "funcional"   # básico | funcional | fluido
  preferencias_explicacion: "simple, analogías cotidianas (no forzadas a mi trabajo actual)"

tiempo:
  rato_corto_min: 15         # micro-sesiones (ej. en el trabajo)
  sesion_larga_horas: 3      # bloque profundo
  dia_bloque_largo: ""       # ej. jueves, o vacío
  horario_notas: ""          # ej. "trabajo 10am–7pm"

entorno:
  sistema_operativo: Windows   # Windows | macOS | Linux
  shell: PowerShell            # PowerShell | bash | zsh
  docker: "Docker Desktop"
  zona_horaria: "America/New_York"   # IANA
  dispositivos: [pc]           # pc | pc+celular (si celular → Tailscale serve + PWA opcional)
  herramientas_instaladas: []  # ej. ["Java 21", "Node 22", "Python 3.12"] — para labs locales

claude:
  usar_api: opcional           # no | opcional
  modelo: "claude-sonnet-5-5"  # modelo económico por defecto; se configura en CLAUDE_MODEL
  max_llamadas_dia: 50

estilo_visual:
  tema: "Neon Atlas (HUD hacker cyberpunk sobre un mapa de reinos)"   # o "fantasía", "espacio", "minimal"...
  fuentes: "Rajdhani (títulos), Inter (texto), JetBrains Mono (código)"
```

---

## 1. Objetivo del sistema

Sistema web **local, de un solo usuario**, que corre en Docker y convierte el estudio en un **mapa de videojuego**. Cada nivel enseña, practica y evalúa lo necesario para alcanzar la `meta_final` del Brief.

- Si `tipo: job`: las skills salen de la oferta. El último rango del juego se llama como la meta (ej. "<Empresa> Ready").
- Si `tipo: skills`: las skills salen de `skills_deseadas`, más las bases que esas skills necesitan. El último rango se llama como la meta.

El sistema es una herramienta para estudiar, no el objetivo: **entrega primero lo mínimo para empezar a estudiar** (Fases 1–4) y deja el pulido para después.

---

## 2. Fase 0 — Análisis y currículo (antes de escribir código)

0. **Revisa las dependencias y avisa al usuario** (sección 2b). Comprueba cuáles ya están instaladas (ej. `docker --version`, `docker compose version`, `git --version`, `node --version`) y que Docker esté **corriendo**. Si falta algo, **para y díselo** con el enlace oficial de descarga y el comando de instalación para su SO (ej. `winget install ...` en Windows). No sigas hasta que esté listo.
1. **Extrae las skills.**
   - Para `job`: lee la oferta y separa required / preferred / implícitas (lo que la oferta asume sin decirlo, ej. "sistemas distribuidos" detrás de "alto throughput").
   - Añade los **riesgos reales del usuario** aunque no estén en la oferta (ej. inglés de entrevista si `nivel_idioma_objetivo` no es fluido).
   - Resultado: 8–16 skills con `code` (snake_case), nombre, y `core: true/false`. `core` = lo que decide si estás listo.
2. **Diseña las zonas.** Una zona por área grande (agrupa skills pequeñas). Típicamente:
   - 6–9 zonas técnicas,
   - 1 **Capstone** (proyecto de portafolio que une todas las core),
   - 1 **Arena** final (si `job`: entrevistas; si `skills`: "Proving Grounds" = retos, publicación y defensa del proyecto),
   - 1 pista transversal si hay idioma objetivo distinto (ej. "English Track", micro-quests diarias).
3. **Grafo de prerrequisitos.** Qué zona necesita qué nivel de qué otra. Al menos 2 zonas desbloqueadas desde el inicio (para no bloquear al usuario). El nivel 1 de la Arena y la pista de idioma, abiertos desde el inicio.
4. **Puentes.** Para cada zona, qué parte ya conoce el usuario por su `experiencia_previa`. Esos niveles **puentean** ("lo que hacías con X ahora se hace con Y") en lugar de empezar de cero. Usa el puente solo cuando ayuda de verdad; las analogías del glosario deben ser variadas y cotidianas.
5. **Currículo por zona:** qué enseña cada uno de los 5 niveles (ver sección 3).
6. **Escribe `CURRICULUM.md`** con: tabla de skills (code, nombre, core, por qué), lista de zonas con emoji/historia de una línea/prerrequisitos/skills, y el currículo de cada nivel.
7. En `CURRICULUM.md`, incluye una tabla **"Herramientas por zona"**: qué necesita instalar el usuario para los labs de cada zona (ej. JDK 21 para una zona de Java, `gcloud` CLI para GCP, k6 para pruebas de carga, una cuenta gratuita de algún servicio), si es gratis, y en qué nivel se empieza a necesitar.
8. **Para y pide aprobación** del currículo. Es la única pregunta obligatoria. Después de aprobarlo, copia el currículo final dentro de este `SPEC.md` (sección "Currículo") y sigue sin parar.

---

## 2b. Dependencias (avisar siempre al usuario)

**Para construir y correr la app:**

| Dependencia | Para qué | Obligatoria | Cómo comprobar |
|---|---|---|---|
| Docker Desktop (WSL2 en Windows) o Docker Engine + Compose | Correr la app y Postgres | Sí | `docker --version` y `docker compose version`; Docker debe estar abierto |
| Git | Repo y commits por fase | Sí | `git --version` |
| Node.js LTS + npm | `content:new`, `content:apply`, pruebas, typecheck desde el host | Sí | `node --version` |
| Claude Code | Construir el sistema y el contenido | Sí | `claude --version` |
| API key de Anthropic con créditos | Modo B (calificación dentro de la app) | No (Modo A funciona sin ella) | — |
| Tailscale | Abrir la app desde el celular | Solo si `dispositivos` incluye celular | `tailscale status` |

**Para los labs:** dependen del currículo (tabla "Herramientas por zona" de la Fase 0). Reglas:
- Prioriza lo que corre **dentro de Docker** (bases de datos, emuladores, Prometheus/Grafana) para no instalar nada extra.
- Cada nivel cuyo lab necesite algo nuevo empieza con un aviso visible **"Necesitas: …"** con el comando para comprobarlo y el enlace oficial de instalación.
- Si el lab necesita una cuenta en la nube, dilo antes, aclara si pide tarjeta y si existe una opción gratis/sandbox.
- El README tiene una sección **"Requisitos"** con la tabla de arriba y la de herramientas por zona.

---

## 3. Mecánicas del juego

**Estructura:** Mundo → **Zonas** → **Niveles** (5 por zona) → **Quests** (3–8 por nivel).

**Los 5 niveles de cada zona (de cero a pro):**
1. **Novice** — conceptos y vocabulario.
2. **Apprentice** — laboratorio guiado.
3. **Journeyman** — construir de forma independiente.
4. **Expert** — fallos, rendimiento, troubleshooting, trade-offs.
5. **Pro / Boss** — nivel examen/entrevista: quiz difícil + tarea evaluada + mini-entrevista o defensa.

**Tipos de quest:**
- `learn` — recursos (sección 4). Se completa marcando los recursos requeridos como vistos **y** escribiendo una nota de 2–3 líneas con sus palabras (prueba de comprensión).
- `glossary` — N términos; se completa al pasar su repaso (flashcards).
- `lab` — práctica con pasos, comandos en el `shell` del Brief, resultado esperado, checklist y **evidencia** (salida pegada o URL de commit). Self-attest + revisión opcional por Claude.
- `quiz` — autocalificado (mcq, tf, order, fill). Aprobar con ≥ 80 %. Reintentos ilimitados, preguntas barajadas, historial guardado.
- `open_answer` — pregunta abierta calificada con rúbrica por Claude (sección 8). Aprueba con ≥ 70.
- `interview` — mini-simulación (sección 9). Aprueba con ≥ 70.
- `boss` — jefe del nivel 5: entregable del usuario + sesión de evaluación. Aprueba con ≥ 70; el quiz final del nivel aporta el ≥ 80 %.
- `micro` — tarea de ≤ `rato_corto_min` (flashcards, 5 preguntas rápidas, una frase en el idioma objetivo). Alimentan la Daily Quest.

**Completar un nivel:** todas las quests `required` completadas. Las `optional` dan XP extra. El nivel N+1 de una zona se desbloquea al completar el N.

**XP:** `learn` 20, `glossary` 15, `lab` 50, `quiz` 40 (+10 si ≥ 95 %), `open_answer` 40, `interview` 60, `boss` 150, `micro` 10. Nivel completado +100; zona completada +300 e insignia. Ver una pista resta 20 % del XP de esa quest (sin bloquear).

**Rangos globales por XP:** 5–6 rangos temáticos que terminan en la meta (ej. Novice → … → "<Meta> Ready").

**Racha diaria (derivada, nunca guardada):**
- Un día cuenta si hay ≥ 10 min en `study_log` en esa fecha, calculada en la `zona_horaria` (no en UTC).
- Completar una quest registra sus `estimated_min`; también hay un botón para sumar minutos a mano.
- 1 congelación automática por semana (lunes–domingo): el primer día sin estudio la consume; el segundo rompe la racha.
- La racha es una **función pura** que recorre `study_log`; la caché en `profile` es opcional.

**Job/Goal Readiness (pantalla más importante):** radar + barras con todas las skills, y **dos métricas siempre separadas**:
- **Cobertura:** XP completado / XP posible del contenido **publicado**.
- **Readiness real:** por skill, `min(100, XP ponderado completado / target_xp)`. Las zonas esqueleto cuentan como 0 y nunca se excluyen.
- `target_xp` = XP ponderado de **todas** las quests `required` de **todas** las zonas que entrenan esa skill (sin bonos ni optional). Al principio se **estima** con la plantilla típica de un nivel (≈ 2 learn + 1 glossary + 1 lab + 1 quiz; boss en el nivel 5), con el cálculo comentado en `skills.yaml`. Cuando todas las zonas de una skill están publicadas, se reemplaza por el valor real.
- El seed avisa (sin fallar) si el XP real de una skill completamente publicada difiere > 15 % de su `target_xp`.
- La frase "Estás listo" usa **solo Readiness real**: todas las skills `core` ≥ 60 %. Si no, muestra las core por debajo y la siguiente quest recomendada para cada una.

**Repetición espaciada:** cada término del glosario tiene estado SM-2 simplificado (again/hard/good/easy). El repaso diario es la micro por defecto.

**Daily Quest (inicio):** 1 micro de glosario, 1 micro de idioma (si aplica), refuerzos pendientes y la siguiente quest recomendada que quepa en el tiempo del día ("hoy ~15 min" / "hoy es <dia_bloque_largo>: bloque de N h").

---

## 4. Recursos e integridad

Campos: `slug`, `title`, `type` (docs | video | course | book | channel | article | lab), `url` (o null), `language`, `duration_min`, `cost` (free | paid | included), `required`, `why` (1 línea), `verified`.

**Regla de integridad (no negociable):**
- **No inventes URLs.** Usa búsqueda web, abre la página y marca `verified: true` solo si la abriste.
- Si no puedes confirmar la URL exacta: `url: null` y cómo encontrarla ("buscar en YouTube: <título> — <canal>").
- Prioriza documentación oficial y recursos gratis; lo de pago va como `optional`.
- Antes de escribir un lab, verifica las **versiones actuales** de las herramientas (librerías, imágenes Docker, GitHub Actions) y anótalas con la fecha.
- La UI permite que el usuario agregue recursos propios (cursos que ya tiene → `cost: included`).

---

## 5. Contenido dirigido por datos

```
content/
  skills.yaml                # code, name, core, target_xp (+ cálculo comentado)
  resources.yaml
  zones/NN-<slug>.yaml       # zona → niveles → quests
  glossary/<zona>.yaml
  interviews/*.yaml          # plantillas de entrevista / retos
  _drafts/                   # borradores por nivel antes de aplicarlos
```

**Seed (`npm run db:seed`):**
- **Idempotente**: upsert por `slug` estable; correrlo N veces no duplica nada.
- **Nunca toca tablas de progreso.** Si una quest desaparece del YAML, se marca `archived`.
- Valida todo con **Zod** y con referencias cruzadas (skills, recursos, términos y plantillas que existan; slugs únicos; quiz publicado con preguntas). El error debe ser legible y señalar archivo + ruta.

**Zona (ejemplo mínimo):**
```yaml
slug: zone-slug
title: Nombre de la Zona
order: 1
emoji: "🌲"
status: published          # published | outline
story: "Una línea de historia temática."
prerequisites: []          # [{zone: otra-zona, level: 2}]
skills: [skill_a, skill_b]
levels:
  - slug: zone-1-novice
    number: 1
    title: Novice — tema
    status: published
    story: "..."
    quests:
      - slug: zone-1-learn-basics
        type: learn
        title: ...
        required: true
        estimated_min: 30
        skills: {skill_a: 1.0}
        resources: [{ref: res-algo}]
        payload: {summary_md: "..."}
```
- `estimated_min` obligatorio. Por defecto: micro 10, glossary 10, quiz 15, learn 30, open_answer 30, interview 30, lab 60, boss 90.
- **Pregunta de quiz:** `slug`, `type` (mcq | tf | order | fill), `prompt`, `options`, `answer`, `explanation` (siempre el porqué), `skill`, `difficulty` (1–3), `hint`. Mínimo **8 preguntas** por quiz.
- **Término de glosario:** `slug`, `term` (en el idioma técnico), `category`, `definition_<idioma_ui>` (simple, 1–3 frases), `definition_<idioma_objetivo>` (1–2 frases), `example_<idioma_objetivo>` (frase corta), `analogy` (cotidiana, variada), `analogy_bridge` (opcional y poco frecuente: equivalente en la experiencia previa del usuario, solo si ayuda), `see_also`.

**Contenido mínimo de la v1:**
- Las **3 primeras zonas** completas (5 niveles, quizzes ≥ 8 preguntas, ≥ 25 términos por zona).
- La pista de idioma completa (≥ 30 micro-quests), si aplica.
- Nivel 1 de la Arena completo.
- El resto de zonas como **esqueleto** (`status: outline`): título, historia, niveles y quests vacías, visibles como "próximamente". Se rellenan después con `content:new` (sección 10).

---

## 6. Modelo de datos (Postgres)

**Contenido (lo reescribe el seed):** `skills`, `zones`, `zone_prerequisites`, `levels`, `quests` (type, order, required, xp, estimated_min, payload JSONB, status), `quest_skills` (weight), `resources`, `quest_resources`, `glossary_terms`, `quiz_questions` (payload JSONB), `interview_templates`, `badges`.

**Progreso (el seed NUNCA lo toca):** `profile`, `quest_progress` (status, completed_at, xp_awarded, hints_used, notes, evidence), `resource_progress`, `quiz_attempts`, `quiz_answers`, `glossary_srs`, `interview_sessions` (mode, score, rubric JSONB, feedback_md, mode_source api|manual), `interview_turns`, `evaluations`, `review_queue` (gaps → refuerzos), `xp_events`, `user_badges`, `study_log` (date, minutes, activity), `custom_resources`.

Todas con `created_at/updated_at`. Índices por `quest_id`, `due_at`, `date`. El progreso se referencia por **slug** al exportar/importar.

---

## 7. Stack, Docker y seguridad

- **App:** Next.js (App Router) + TypeScript + Tailwind. Un solo servicio full-stack (route handlers / server actions).
- **BD:** PostgreSQL en contenedor con **volumen nombrado** (`<proyecto>_pgdata`).
- **ORM:** Drizzle + drizzle-kit (migraciones en el repo). **Validación:** Zod. **Contenido:** `yaml`. **Scripts:** `tsx`.
- Fija versiones compatibles entre sí (ej. no subas TypeScript a una major que el framework no soporte) y anota el porqué.
- Dependencias mínimas: sin Redis, colas ni microservicios propios.

**docker-compose.yml:**
- `db`: healthcheck `pg_isready`, `restart: unless-stopped`, puerto **solo en `127.0.0.1`** y en un puerto poco común (ej. `127.0.0.1:5433:5432`).
- `app`: build multi-stage, `depends_on: db (service_healthy)`, puerto `127.0.0.1:3000:3000`, al arrancar: migraciones → seed → start. Pasa `TZ`.
- El archivo de config del framework debe poder leerse en la imagen de runtime (ej. `next.config.mjs`, no `.ts`).

**Seguridad (no negociable):**
- La app **nunca** se expone a internet: nunca `0.0.0.0`, nunca port forwarding, nunca Tailscale Funnel. Si `dispositivos` incluye celular → documentar `tailscale serve --bg 3000` (solo tailnet, HTTPS automático).
- La API key solo en `.env`, solo en el servidor; nunca llega al navegador ni se imprime. `.env` nunca se versiona (`.env.example` sí).
- **Nunca** `docker compose down -v` en este proyecto (borra el progreso). Los labs que levanten contenedores usan **otro nombre de proyecto** (`docker compose -p <lab> ...`) y otros puertos.

**Archivos extra:** `.env.example` (`DATABASE_URL`, `ANTHROPIC_API_KEY=` vacío, `CLAUDE_MODEL=`, `MAX_API_CALLS_PER_DAY=`, `TZ=`), `scripts/backup` y `scripts/restore` (pg_dump dentro del contenedor → `backups/`), export/import JSON en Ajustes, `README.md` corto con todos los comandos en el `shell` del Brief. Fase 1 empieza con `git init` y `.gitignore` (`.env`, `backups/`, `node_modules/`, build).

---

## 8. Integración con Claude (dos modos)

**Modo A — sin API (por defecto, $0):** para `open_answer`, `interview`, evidencia de `lab` y `boss`, la app genera un **prompt listo para copiar** (contexto de la quest + rúbrica + respuesta del usuario + instrucción de devolver un bloque JSON al final). El usuario lo pega en claude.ai y pega la respuesta de vuelta; la app extrae el JSON. Si no hay JSON, guarda la transcripción y ofrece un segundo prompt de evaluación.

**Modo B — con API:** si hay `ANTHROPIC_API_KEY`, los mismos flujos corren en el servidor con el SDK oficial. Modelo desde `CLAUDE_MODEL` (nunca hardcodeado; por defecto el económico del Brief). Tope diario de llamadas, estimación de tokens visible en Ajustes. Si la API falla, cae al Modo A **sin perder la respuesta del usuario**.

**Rúbrica (JSON estricto):**
```json
{
  "score": 0,
  "criteria": [{"name": "correctness", "score": 0, "comment": "..."},
               {"name": "depth"}, {"name": "clarity"}, {"name": "tradeoffs"}],
  "language_feedback": [{"original": "...", "better": "...", "why": "..."}],
  "gaps": ["tema a repasar"],
  "next_step": "..."
}
```
- Los `gaps` crean refuerzos en `review_queue` que aparecen en la Daily Quest.
- El parser del JSON es tolerante (bloque ```json, texto alrededor) y tiene pruebas.
- Reglas de los prompts: directo y crítico (sin adulación), errores explicados en `idioma_ui` simple, correcciones de idioma con versión mejor + porqué. En simulaciones, pasar la oferta/meta como contexto.

---

## 9. Arena final

**Si `tipo: job` → Interview Arena** (en `idioma_objetivo`, feedback en `idioma_ui`):
- Modos: `behavioral` (STAR), `technical_screen` por zona (5–8 preguntas con repreguntas), `system_design` (30–45 min, texto + Mermaid), `coding_task` (take-home 60–90 min), `mock_loop` (secuencia completa, se desbloquea al vencer a los jefes de las zonas core).
- Plantillas en `content/interviews/*.yaml`: ≥ 15 conductuales y ≥ 10 técnicas por zona (elige 6 al azar por sesión). Las quests pueden fijar `payload.template` (validado) o `mode: mock_loop`.
- Niveles: 1) presentación personal + historia puente desde la experiencia previa; 2) STAR + banco de historias; 3) screens técnicos por zona + uso responsable de asistentes de IA; 4) system design + take-home; 5) proceso de contratación, preguntas para el entrevistador, negociación, mock loop y jefe final.
- Modo B: Claude actúa como entrevistador de la empresa (profesional, repregunta, pide trade-offs, no da la respuesta). Modo A: un único prompt con el guion turno a turno + prompt de evaluación.

**Si `tipo: skills` → Proving Grounds:** retos cronometrados, code review de código con fallos plantados, publicar el Capstone (README, demo, post técnico) y una defensa oral del proyecto.

Cada sesión: temporizador opcional, turnos guardados, rúbrica final, gráfico de progreso por criterio y "Top 3 cosas a mejorar".

---

## 10. Herramientas de contenido

- `npm run content:new -- --zone <slug> --level <n>` → genera el prompt (o llama a la API con `--api`) para producir el YAML de ese nivel siguiendo la sección 5, y lo escribe en `content/_drafts/`.
- `npm run content:apply -- --file content/_drafts/<x>.yaml` → valida con Zod (quiz ≥ 8 preguntas con slug, referencias existentes), publica el nivel en el archivo de zona, añade términos al glosario y recursos nuevos a `resources.yaml`, corre la validación global y **deshace todo si algo falla**.
- Documenta en el README la forma exacta de los flags (`--file ruta`, separado por espacio).
- Un script para generar quests esqueleto de las zonas `outline`.

---

## 11. Pantallas

1. **Mapa del mundo** (`/mapa`): SVG ligero, nodos conectados; estados bloqueado / disponible / en progreso / completado. Hover: progreso y skills. Las aristas de prerrequisito muestran qué nivel se requiere. Debajo, lista de "Sectores".
2. **Zona:** 5 niveles como etapas verticales con la historia.
3. **Nivel:** pestañas Aprender · Glosario · Práctica · Quiz · Jefe.
4. **Quest:** vista por tipo (lector de recursos con notas, lab con pasos/comandos copiables/checklist/evidencia, quiz con feedback y explicación, respuesta abierta con calificación A/B, entrevista).
5. **Glosario:** búsqueda, filtros, flashcards SRS.
6. **Arena** (sección 9).
7. **Dashboard** (`/`): Readiness (radar), Cobertura, XP, rango, racha, Daily Quest, horas por semana, 3 siguientes acciones.
8. **Ajustes:** estado de la API, backup/export/import, reiniciar zona (con confirmación), tema, sonidos.

**Render de texto del contenido:** un componente único (`BlockText`) para summaries, pasos de lab y prompts: bloques ```lang, `código` inline y **negrita**. Define en el spec qué Markdown se soporta y no uses en el contenido lo que no se soporta (ej. tablas, fences anidados).

**Estilo visual** (según `estilo_visual` del Brief): tokens CSS de color en `:root` (fondo, disponible, en progreso, bloqueado, completado), fuentes del Brief, todo con SVG + CSS (sin ilustraciones).
- **v1 (Fases 1–4):** solo tema, paleta, fuentes y estados. Si una decisión de diseño toma más de unos minutos, elige lo simple.
- **Fase 6:** animaciones cortas (glitch al ganar XP, scanline, "decrypt" al subir de rango) y la mecánica de **zonas bloqueadas como datos cifrados**: el nombre se muestra con glifos de forma determinista; empieza ~15 % revelado y sube hasta ~70 % según los prerrequisitos cumplidos; se descifra con animación al desbloquear. **Una sola función compartida** (`encrypt` + `decryptRatio`) y aplicada en **todos** los lugares donde aparece el nombre de una zona bloqueada (mapa, lista, título de página), con `aria-label` con el nombre real. Sin sonidos por defecto. Respeta `prefers-reduced-motion`.
- Prioridad de layout según `dispositivos` (solo PC → escritorio primero).

---

## 12. Fases de implementación

- **Fase 0 — Currículo:** sección 2. Parada para aprobación.
- **Fase 1 — Cimientos:** git, Dockerfile, compose, Drizzle + migraciones, seed idempotente, `skills.yaml` con `target_xp` estimado y comentado, `TZ`, `estimated_min` en el esquema, una zona de prueba, tema básico. *Criterio:* levanta con `docker compose up -d --build` y los datos persisten tras `down` + `up`.
- **Fase 2 — Mapa y navegación:** mapa, zona, nivel, desbloqueo por prerrequisitos (lógica pura con pruebas), estado de progreso.
- **Fase 3 — Quests de aprendizaje:** learn, glossary+SRS, quiz con historial, micro, XP, rangos, racha (función pura con pruebas), insignias, Dashboard (Cobertura + Readiness), Daily Quest.
- **Fase 4 — Contenido real:** sección 5 (3 zonas, pista de idioma, Arena 1, resto esqueleto) + vista básica de lab. **Aquí el usuario ya puede empezar a estudiar.**
- **Fase 5 — Claude y Arena:** Modo A y B, open_answer, evidencia de lab, boss, Arena, historial y gráficos.
- **Fase 6 — Robustez y pulido:** backup/restore, export/import, `content:new` + `content:apply`, pruebas (seed idempotente, desbloqueo, XP, Cobertura vs Readiness, racha/congelación, parser JSON, integración con BD), animaciones y mecánica de cifrado. PWA offline solo si hay celular.
- **Después — Completar zonas:** un nivel a la vez con el flujo de la sección 13. Commit por zona. Al terminar cada zona, recalcular `target_xp` de sus skills con el XP real.

---

## 13. Reglas para escribir contenido (lecciones aprendidas)

- **Un nivel por borrador:** escribir `content/_drafts/<zona>-<n>.yaml` → `content:apply` → rebuild → revisar que el seed no avise → siguiente nivel.
- **Ejecuta los labs antes de escribirlos.** Si las herramientas están en `herramientas_instaladas`, corre cada lab en local y copia el resultado esperado de esa ejecución real (no de memoria). Si no se puede correr, dilo en el lab ("resultado aproximado").
- Labs con contenedores: nombre de proyecto propio (`-p <lab>`), puertos en `127.0.0.1` que no choquen, y un paso final de limpieza (`docker compose -p <lab> down -v` **solo** para el lab).
- Comandos en el `shell` del Brief. Salida de programas en ASCII si la consola puede romper acentos. Comandos que pueden quedarse esperando (long-poll, streams) llevan timeout.
- Quizzes: preguntas sin ambigüedad (si un número depende de una suposición, escríbela en el enunciado); `explanation` siempre explica el porqué; mezcla de tipos y dificultades.
- Glosario: definiciones simples; analogías cotidianas y variadas; el puente con la experiencia previa solo cuando aporta.
- El **Capstone** es un único repo de portafolio construido en ~10 milestones (cada uno un `lab` con evidencia = commit/URL) y termina con una defensa oral. Regla visible: se puede usar Claude Code, pero hay que poder explicar cada parte.
- Verifica versiones y URLs con la fecha de hoy; las docs cambian de sitio.
- Antes de cada commit: `docker compose up -d --build`, typecheck y pruebas pasan, y abre al menos una página afectada para comprobarla.

---

## 14. Criterios de aceptación

- El README lista todas las dependencias (app y labs) con cómo comprobarlas e instalarlas, y cada lab avisa lo que necesita antes del primer paso.
- `docker compose up -d --build` funciona desde cero en el SO del Brief sin pasos manuales extra (aparte de instalar las dependencias).
- Reconstruir contenedores o re-correr el seed **no** pierde ni duplica progreso.
- El mapa muestra todas las zonas y bloquea/desbloquea según los prerrequisitos.
- Las 3 primeras zonas se pueden completar de principio a fin (recursos → glosario → lab → quiz → jefe).
- Dashboard: Cobertura y Readiness real separadas; las zonas esqueleto cuentan como 0; "listo" depende solo de Readiness real de las skills core.
- La racha usa la `zona_horaria`, se deriva de `study_log` y aplica 1 congelación por semana. Estudiar de 11:30 pm a 12:15 am no gasta una congelación.
- `skills.yaml` tiene `target_xp` en todas las skills con el cálculo comentado.
- Ningún recurso tiene una URL inventada.
- Sin API key todo funciona en Modo A; con la key funciona el Modo B y la key nunca llega al navegador.
- Los puertos solo escuchan en `127.0.0.1`; `.env` no está en git; hay commits por fase.
- UI y explicaciones en `idioma_ui` simple; términos técnicos y simulaciones en `idioma_objetivo`; comandos en el `shell` del Brief.
