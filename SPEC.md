# QuestMap — Mapa de logros para conseguir el trabajo (Spec para Claude Code)

> Lee este archivo completo antes de escribir código. Decide los detalles menores tú mismo, no preguntes. Construye por fases (ver sección 13), haz commit al terminar cada fase y verifica que `docker compose up` funciona antes de pasar a la siguiente.

## 1. Objetivo

Sistema web LOCAL, de un solo usuario, que corre en Docker y convierte el estudio en un mapa de videojuego. Cada nivel enseña, practica y evalúa lo necesario para ser el mejor candidato a esta oferta:

**Home Depot — Software Engineer, Backend & Distributed Systems (REMOTE), Req197061**
https://careers.homedepot.com/job/24056210/software-engineer-backend-distributed-systems-remote-remote/

Requisitos "preferred" de la oferta (cada uno es una **skill** medible en el sistema):

| Código | Skill |
|---|---|
| `java` | Lenguaje orientado a objetos (preferiblemente Java) |
| `eda` | Event-driven y colas/streaming (Google Cloud Pub/Sub) |
| `cassandra` | NoSQL, Apache Cassandra, alto throughput |
| `bigquery_sql` | BigQuery y SQL, datasets grandes |
| `observability` | Prometheus + Grafana, métricas y alertas |
| `ai_tools` | Uso de herramientas de IA (Claude, asistentes LLM) en el desarrollo |
| `microservices_gcp` | Microservicios y cloud (GCP preferido) |
| `cicd` | CI/CD y pipelines de despliegue |
| `git` | Control de versiones |
| `debugging_rca` | Debugging y análisis de causa raíz |
| `security` | Autenticación y autorización de usuarios y servicios |
| `testing` | Pruebas unitarias, funcionales, destructivas y de performance |
| `english` | Comunicación y entrevistas en inglés (no está en la oferta, pero es el mayor riesgo real) |
| `distributed_systems` | Teoría de sistemas distribuidos (base para todo lo anterior) |

## 2. Usuario y contexto (importante para el diseño)

- Un solo usuario: Johan. Integration Engineer con 8+ años en IBM IIB y IBM MQ, banca Tier-1, DataPower, WSRR, Docker/OpenShift, CI/CD, Git. Viene de middleware, no de Java moderno ni de GCP.
- Su idioma principal es el español. Su inglés es funcional pero limitado. Por eso:
  - UI y explicaciones en **español simple**.
  - Los términos técnicos se muestran en inglés (como aparecen en entrevistas y documentación) con definición en español simple y una frase de ejemplo corta en inglés simple.
  - El Interview Arena es en inglés, con retroalimentación de lenguaje en español.
- Tiene poco tiempo: trabaja 10am–7pm, llega a casa ~8:10pm. Su día libre es el jueves (bloque profundo de ~4 h). Tiene ratos de 10–15 min durante el trabajo. El sistema debe soportar **micro-quests de ≤15 min** y sesiones largas de ~1–4 h.
- Ya conoce mensajería (MQ), Docker, CI/CD y Git: los niveles de esas áreas deben puentear lo que ya sabe ("tu equivalente en MQ es…") en vez de repetirlo desde cero.
- Usa Windows + Docker Desktop (WSL2) + PowerShell. Todos los comandos en README y en el contenido de las lecciones deben darse en PowerShell (continuación de línea con acento grave `` ` ``, o en una sola línea). Recomienda clonar el repo dentro del sistema de archivos de WSL2 por rendimiento.

## 3. Stack

- **App:** Next.js 15 (App Router) + TypeScript + Tailwind CSS. Full-stack en un solo servicio (route handlers / server actions).
- **BD:** PostgreSQL 16 en contenedor con **volumen nombrado** (`questmap_pgdata`) para no perder datos.
- **ORM/migraciones:** Drizzle ORM + drizzle-kit (migraciones versionadas en el repo).
- **Contenido:** archivos YAML/Markdown versionados en `content/`, cargados a la BD con un seed idempotente (sección 7).
- **Sin autenticación** (solo local). La app nunca se expone a internet. El acceso desde el celular fuera de casa es por **Tailscale** (ver sección 4).
- **Claude (opcional):** SDK oficial de Anthropic (`@anthropic-ai/sdk`) usado solo en el servidor. El nombre del modelo va en la variable de entorno `CLAUDE_MODEL` (nunca hardcodeado). Ver sección 9.
- Dependencias mínimas. No agregues Redis, colas, ni microservicios propios. No sobre-ingenierices.

## 4. Docker

`docker-compose.yml` con dos servicios:

- `db`: `postgres:16`, volumen `questmap_pgdata:/var/lib/postgresql/data`, healthcheck con `pg_isready`, `restart: unless-stopped`. Puerto publicado solo en localhost y en `5433` (evita choques con otros contenedores): `127.0.0.1:5433:5432`.
- `app`: build multi-stage del Dockerfile, `depends_on: db (service_healthy)`, puerto `127.0.0.1:3000:3000`, `restart: unless-stopped`. Al arrancar corre automáticamente migraciones y luego el seed (`npm run db:migrate && npm run db:seed && npm start`).

Archivos adicionales:
- `.env.example` con `DATABASE_URL`, `ANTHROPIC_API_KEY=` (vacío = modo sin API), `CLAUDE_MODEL=`, `TZ=` (zona horaria IANA del usuario, el usuario vive en Atlanta, Georgia: `America/New_York`; se pasa al contenedor `app` y se usa para calcular "hoy" en racha, Daily Quest y `study_log`. Si está vacía, la app muestra un aviso en Settings y usa UTC).
- `scripts/backup.ps1`: ejecuta `pg_dump` dentro del contenedor y guarda `backups/questmap_YYYYMMDD_HHmm.sql`.
- `scripts/restore.ps1 <archivo>`: restaura un backup.
- Botón "Exportar progreso (JSON)" e "Importar" en Settings, como segunda red de seguridad.
- `README.md` corto: requisitos, `docker compose up -d --build`, URL, backup/restore, cómo agregar contenido. Todo en PowerShell.
- **Git:** la Fase 1 empieza con `git init` y un `.gitignore` que excluye `.env`, `backups/`, `node_modules/` y `.next/`.

**Acceso remoto (Tailscale):**
- Los micro-quests ocurren en el trabajo (desde el celular), no en casa. El README debe documentar cómo instalar Tailscale (gratis) en el PC y en el celular, y cómo exponer la app **solo al tailnet** con `tailscale serve`:
  ```powershell
  tailscale serve --bg 3000
  ```
  La app se abre desde el celular en `https://<nombre-del-pc>.<tailnet>.ts.net` (HTTPS con certificado automático; activar MagicDNS y HTTPS en el panel de Tailscale). Documentar también `tailscale serve status` y `tailscale serve --https=443 off` para apagarlo.
- Seguridad: Docker publica el puerto **solo** en `127.0.0.1:3000` (el `docker-compose.yml` no cambia y no depende de la IP de Tailscale). `tailscale serve` hace de proxy desde el tailnet hacia localhost. Nunca `0.0.0.0`, nunca port forwarding del router, **nunca Tailscale Funnel**.
- Por qué así: no hay riesgo de que una variable vacía publique en todas las interfaces, no falla si Docker arranca antes que Tailscale, y el HTTPS es requisito para la PWA opcional de la Fase 6 (los service workers no funcionan sobre `http://` a una IP remota).
- Limitación a documentar: el PC debe estar encendido y Docker corriendo para que funcione fuera de casa.

## 5. Mecánicas del juego

**Estructura:** Mundo → **Zonas** (10) → **Niveles** (5 por zona) → **Quests** (3–8 por nivel).

**Niveles dentro de cada zona (de cero a pro):**
1. **Novice** — conceptos y vocabulario
2. **Apprentice** — laboratorio guiado
3. **Journeyman** — construir de forma independiente
4. **Expert** — fallos, rendimiento, troubleshooting, trade-offs
5. **Pro / Boss** — nivel entrevista: examen final + tarea evaluada por Claude + mini-entrevista de la zona

**Tipos de quest:**
- `learn` — leer/ver recursos (ver 6). Se completa marcando cada recurso requerido como visto y escribiendo una nota de 2–3 líneas con sus palabras (obligatoria; es la prueba de comprensión).
- `glossary` — aprender N términos; se completa al pasar su mini-repaso (flashcards).
- `lab` — ejercicio práctico con pasos, comandos en PowerShell, resultado esperado y checklist. Se completa con checklist completo + **evidencia** (salida de comando pegada, o URL de commit/repo). En v1 la verificación es self-attest + evidencia revisada opcionalmente por Claude.
- `quiz` — examen corto autocalificado (opción múltiple, verdadero/falso con justificación, ordenar pasos, completar espacio). Aprobar con ≥ 80 %. Reintentos ilimitados; las preguntas se barajan; se guarda historial.
- `open_answer` — pregunta abierta calificada con rúbrica por Claude (ver 9).
- `interview` — mini-simulación de entrevista (ver 10).
- `boss` — jefe del nivel Pro: combina quiz difícil + tarea de código/diseño + mini-entrevista. Requiere ≥ 80 % y rúbrica aprobada.
- `micro` — tarea de ≤ 15 min (flashcards, 5 preguntas rápidas, leer un artículo corto, 1 frase en inglés). Estas alimentan la "Daily Quest".

**Regla de completar un nivel:** todas las quests `required` completadas (+ quiz ≥ 80 % + boss si aplica). Las quests `optional` dan XP extra.

**XP y rangos:**
- XP: `learn` 20, `glossary` 15, `lab` 50, `quiz` 40 (+10 si ≥ 95 %), `open_answer` 40, `interview` 60, `boss` 150, `micro` 10. Completar nivel: +100; completar zona: +300 y una insignia.
- Rangos globales por XP total: Novice → Apprentice → Junior Dev → Backend Dev → Distributed Systems Engineer → **Home Depot Ready**.
- **Racha diaria (streak):** un día cuenta si hay ≥ 10 min registrados en `study_log` para esa fecha (fecha calculada en la zona horaria `TZ`, no en UTC). Al completar una quest se registran automáticamente sus `estimated_min` (campo de cada quest, ver sección 7); además hay un botón para agregar minutos manualmente. Hay 1 congelación automática por semana (lunes–domingo): el primer día sin estudio de la semana la consume y la racha no se rompe; el segundo día sin estudio la rompe. El jueves no tiene trato especial: es el día del bloque largo y cuenta igual que los demás.
- **La racha se calcula, no se guarda:** `streak_current`, `streak_best` y las congelaciones usadas se derivan recorriendo `study_log` día por día (una función pura, fácil de probar). `profile` puede guardar una copia en caché, pero la fuente de verdad es `study_log`. Así no hay contadores desincronizados ni campos de "semana actual" que resetear.
- Insignias: una por zona, más las de racha (7/30 días), "primer quiz perfecto", "primera entrevista aprobada", "primer lab sin pistas".
- Pistas (hints) en labs y quizzes: ver una pista reduce el XP de esa quest un 20 %, sin bloquear el avance.

**Job Readiness (la pantalla más importante):** gráfico radar + barras con las 14 skills de la sección 1. Cada quest se vincula a una o más skills con un peso. Se muestran **dos métricas, siempre juntas y claramente separadas:**

- **Cobertura:** XP completado / XP posible del contenido **publicado** (quests con `status: published`). Mide qué tan al día vas con lo que ya existe.
- **Readiness real:** progreso contra las 14 skills completas. Cada skill tiene un XP objetivo fijo definido en `skills.yaml` (`target_xp`), independiente de cuánto contenido exista. Las zonas en `outline` cuentan como 0 y **nunca se excluyen del cálculo**. Score por skill = min(100, XP ponderado completado / `target_xp`).

**Cómo se define `target_xp`:** es el XP ponderado que tendría esa skill si estuvieran completas **todas** las quests `required` de **todas** las zonas que la entrenan (sus 5 niveles, más su parte del Capstone y del Interview Arena), sin contar bonos de nivel/zona ni quests `optional`. Como las zonas 4–10 son esqueleto en la v1, el valor inicial se **estima** con el XP base de la sección 5 y la plantilla típica de un nivel (≈ 2 `learn` + 1 `glossary` + 1 `lab` + 1 `quiz`, y el `boss` en el nivel 5), y se anota en `skills.yaml` con un comentario que muestre el cálculo. El seed avisa en consola (sin fallar) si la suma real de una skill completamente publicada difiere en más de 15 % de su `target_xp`, y `content:new` muestra ese aviso para que el valor se ajuste a mano. Así el 60 % de "listo para aplicar" significa "dominé el 60 % de lo que la oferta pide", no "completé el 60 % de lo que alcancé a escribir".

La frase "Estás listo para aplicar" usa **solo Readiness real**: aparece cuando todas las skills `core` están ≥ 60 %. Mientras no se cumpla, muestra cuáles skills core están por debajo y la siguiente quest recomendada para cada una. Marca como `core`: `java`, `eda`, `cassandra`, `observability`, `bigquery_sql`, `microservices_gcp`, `english`.

**Repetición espaciada:** cada término del glosario tiene estado SRS simple (algoritmo SM-2 simplificado: again/hard/good/easy). Un repaso diario de glosario es la `micro` quest por defecto.

**Daily Quest (pantalla de inicio):** propone 1 micro de glosario, 1 micro de inglés, y la siguiente quest recomendada del mapa. Muestra el presupuesto de tiempo: "Hoy tienes ~15 min / hoy es jueves: bloque de 4 h".

## 6. Recursos

Cada quest `learn` y cada nivel referencian recursos. Campos: `title`, `type` (docs | video | course | book | channel | article | lab), `url` (puede ser null), `language` (es | en), `duration_min`, `cost` (free | paid | included), `required` (bool), `why` (1 línea), `verified` (bool).

**Regla de integridad:** NO inventes URLs. Usa solo dominios/URLs que puedas confirmar (usa búsqueda web para verificarlas) y marca `verified: true` solo si las abriste. Si no puedes confirmar una URL exacta, deja `url: null` y describe cómo encontrarla (por ejemplo "buscar en YouTube: <título> — <canal>"). Prioriza gratis; lo de pago (libros) va como `optional`.

Fuentes base sugeridas (confirma las URLs exactas):
- **Java:** Java Programming MOOC (Univ. de Helsinki, gratis), guías de spring.io, Baeldung, libro *Effective Java* (Bloch, opcional).
- **Event-driven / Pub/Sub:** documentación oficial de Cloud Pub/Sub, *Designing Data-Intensive Applications* (Kleppmann, cap. 11), Google Cloud Skills Boost.
- **Cassandra:** documentación de Apache Cassandra, DataStax Academy / DataStax Skills (gratis), *Cassandra: The Definitive Guide* (opcional).
- **Observabilidad:** documentación de Prometheus, Grafana University / tutorials (gratis), documentación de Micrometer, canal TechWorld with Nana.
- **BigQuery:** documentación de BigQuery, BigQuery Sandbox (gratis, sin tarjeta), Google Cloud Skills Boost.
- **Sistemas distribuidos:** clases de Martin Kleppmann (Cambridge, YouTube), canales Hussein Nasser, ByteByteGo, Gaurav Sen.
- **Inglés técnico:** Pronunciación y vocabulario de entrevistas; permite al usuario agregar sus propios recursos desde la UI.
- Los cursos que él ya posee (Udemy, Pildoras de Programación: GCP Data Engineer, Git & GitHub, cursos de Anthropic/Claude, Docker) pueden marcarse `cost: included`, y la UI debe permitir añadir un recurso propio con un formulario.

## 7. Contenido y seed (diseño dirigido por datos)

Todo el contenido vive en `content/` y se carga a la BD con `npm run db:seed`:

```
content/
  skills.yaml
  zones/
    01-java-forest.yaml
    02-event-harbor.yaml
    ...
  glossary/
    java.yaml, eda.yaml, cassandra.yaml, ...
  interviews/
    behavioral.yaml, technical-java.yaml, ...
```

Reglas del seed:
- **Idempotente:** hace *upsert* por `slug` estable. Correrlo muchas veces no duplica nada.
- **Nunca borra ni modifica tablas de progreso.** Si una quest desaparece del YAML, se marca `archived`, no se elimina.
- Contenido y progreso en tablas separadas (ver 8).

Formato de zona (ejemplo mínimo):

```yaml
slug: java-forest
title: Java Forest
order: 1
emoji: "🌲"
prerequisites: []
skills: [java, git]
levels:
  - slug: java-1-novice
    number: 1
    title: Novice — Java y OOP
    story: "Entras al bosque. Los árboles son clases y objetos..."
    quests:
      - slug: java-1-learn-oop
        type: learn
        title: Conceptos de OOP en Java
        required: true
        estimated_min: 45
        skills: {java: 1.0}
        resources: [ {ref: res-java-mooc-part1} ]
      - slug: java-1-quiz
        type: quiz
        estimated_min: 15
        questions: [ ... ]   # ver formato abajo
```

`estimated_min` es obligatorio en cada quest (el esquema Zod lo valida). Valores por defecto si el YAML no lo define: `micro` 10, `glossary` 10, `quiz` 15, `learn` 30, `open_answer` 30, `interview` 30, `lab` 60, `boss` 90. Se usa para la racha (sección 5) y para que la Daily Quest elija quests que quepan en el tiempo disponible del día.

Formato de pregunta de quiz: `type` (mcq | tf | order | fill), `prompt`, `options`, `answer`, `explanation` (siempre explica por qué), `skill`, `difficulty` (1–3), `hint`.

Formato de término de glosario: `term`, `category`, `definition_es` (simple, 1–3 frases), `definition_en` (simple, 1–2 frases), `example_en` (frase corta), `analogy` (opcional: analogía cotidiana o de cualquier tipo que ayude a recordarlo), `analogy_mq` (opcional y poco frecuente: equivalente en IBM MQ/IIB/DataPower solo cuando realmente ayuda, por ejemplo en el mapa MQ → Pub/Sub), `see_also`. No forzar analogías con MQ/IIB: el usuario prefiere analogías variadas.

**Cantidad mínima de contenido inicial (v1):**
- Zonas 1, 2 y 3 completas (5 niveles, quests, quizzes de ≥ 8 preguntas por nivel, ≥ 25 términos por zona).
- **English Track completo** (≥ 30 micro-quests de inglés: vocabulario técnico de las zonas 1–3, frases para hablar, shadowing). El inglés es el mayor riesgo real del usuario, por eso va en la v1.
- **Zona 10, nivel 1 completo** ("Tell me about yourself", la historia puente IIB/MQ → event-driven, vocabulario base de entrevista).
- El resto de las zonas 4–10 con título, historia, niveles y quests definidos como esqueleto (`status: outline`), que se ven en el mapa como "próximamente" y se completan después con la herramienta de generación de contenido (ver 11).

### Currículo por zona (qué enseña cada nivel)

Prerrequisitos de desbloqueo (por defecto): el nivel N+1 de una zona se desbloquea al completar el nivel N. Zonas:

**Z1 🌲 Java Forest** (inicio, desbloqueada) — skills: `java`, `git`, `testing`
1. Novice: sintaxis, tipos, clases/objetos, herencia, interfaces, encapsulación
2. Apprentice: colecciones, generics, streams, lambdas, `Optional`, records, Java 17/21 features
3. Journeyman: excepciones, concurrencia básica (threads, `ExecutorService`, `CompletableFuture`), JUnit 5, Mockito
4. Expert: Spring Boot REST, configuración y profiles, validación, manejo de errores, logging
5. Boss: construir un servicio REST con pruebas + code review Q&A

**Z2 ⚓ Event Harbor** (requiere Z1 nivel 2) — skills: `eda`, `distributed_systems`
1. Novice: mensajería asíncrona, pub/sub vs colas, **mapa IBM MQ → Pub/Sub** (queue manager, queue, channel ↔ topic, subscription)
2. Apprentice: Cloud Pub/Sub (topics, subscriptions, pull/push, ack deadline) con el emulador en Docker
3. Journeyman: confiabilidad: reintentos, dead-letter, idempotencia, ordering keys, "exactly-once" (mitos), semánticas de entrega
4. Expert: evolución de esquemas, backpressure/flow control, consumidores en Spring, pruebas de fallos
5. Boss: diseñar un flujo de eventos + entrevista técnica

**Z3 🕳️ Cassandra Caverns** (requiere Z1 nivel 2) — skills: `cassandra`, `distributed_systems`
1. Novice: NoSQL, wide-column, anillo, partición, replicación
2. Apprentice: CQL, modelado orientado a consultas, clustering keys
3. Journeyman: niveles de consistencia, tombstones, TTL, cluster de 3 nodos en Docker Compose
4. Expert: alto throughput, hot partitions, bucketing, compaction, `nodetool`, qué pasa si cae un nodo
5. Boss: modelar un caso real (orders/eventos por tiempo) + escenario de fallo + entrevista

**Z4 🔭 Observability Observatory** (requiere Z1 nivel 3) — skills: `observability`, `debugging_rca`
1. Novice: métricas/logs/trazas, golden signals
2. Apprentice: Prometheus, exporters, Micrometer
3. Journeyman: PromQL, dashboards de Grafana
4. Expert: alertas, Alertmanager, SLO/SLI, burn rate
5. Boss: diagnosticar un incidente a partir de dashboards (RCA)

**Z5 🌊 BigQuery Bay** (desbloqueada desde el inicio) — skills: `bigquery_sql`
1. Novice: repaso de SQL (joins, agregaciones)
2. Apprentice: BigQuery Sandbox, datasets públicos, consultas
3. Journeyman: particiones, clustering, costo por consulta
4. Expert: window functions, nested/repeated fields, optimización
5. Boss: análisis sobre un dataset grande + preguntas de entrevista de SQL

**Z6 ☁️ GCP & Microservices Peaks** (requiere Z1 nivel 3) — skills: `microservices_gcp`, `cicd`, `security`
1. Novice: conceptos de nube, IAM, regiones, costos y free tier
2. Apprentice: Cloud Run / GKE a nivel básico, contenedores
3. Journeyman: patrones (API gateway, circuit breaker, saga, outbox), GitHub Actions para CI/CD
4. Expert: auth servicio-a-servicio, secretos, configuración, despliegue
5. Boss: desplegar un microservicio en GCP con pipeline

**Z7 🏰 Security & Testing Fortress** (requiere Z1 nivel 4 y Z2 nivel 3) — skills: `security`, `testing`, `debugging_rca`
1. Novice: authn vs authz, OAuth2, OIDC, JWT (puente con DataPower: "lo que hacía el gateway, ahora lo hace…")
2. Apprentice: proteger una API con JWT, roles
3. Journeyman: pirámide de pruebas, Testcontainers, pruebas funcionales
4. Expert: pruebas de performance (k6), pruebas destructivas/chaos, técnicas de RCA
5. Boss: auditar y probar un servicio dado

**Z8 🧠 Distributed Systems Citadel** (requiere Z2 nivel 2 y Z3 nivel 2) — skills: `distributed_systems`
1. Novice: qué es un sistema distribuido, latencia, fallos
2. Apprentice: CAP/PACELC, modelos de consistencia
3. Journeyman: replicación, particionamiento, idempotencia, relojes
4. Expert: consenso (a nivel intuición), sagas, backpressure
5. Boss: preguntas de diseño de sistemas

**Z9 🏯 Capstone Castle** (requiere Z1 nivel 4, Z2 nivel 3, Z3 nivel 3, Z4 nivel 3) — todas las skills core
Un único proyecto de portafolio en milestones (cada milestone es una quest `lab` con evidencia = commit/URL):
1. Servicio Spring Boot (API de órdenes) → 2. publica eventos a Pub/Sub (emulador) → 3. consumidor idempotente con DLQ → 4. persistencia en Cassandra (3 nodos) → 5. exportación a BigQuery → 6. métricas Prometheus + dashboard Grafana + 2 alertas → 7. GitHub Actions (build, test, deploy a Cloud Run) → 8. JWT + pruebas Testcontainers + k6 → 9. README en inglés con diagrama de arquitectura y "decisiones técnicas" → 10. **Final del castillo:** defender el proyecto en una mini-entrevista.
Regla visible en la quest: se puede usar Claude Code, pero hay que poder explicar cada parte (la mini-entrevista lo verifica).

**Z10 🎯 Interview Arena** (nivel 1 desbloqueado desde el inicio; el resto se desbloquea con el progreso) — skills: `english`, `ai_tools`
1. Novice: "Tell me about yourself" y la historia puente (IIB/MQ → event-driven), vocabulario base
2. Apprentice: preguntas conductuales con método STAR, en inglés
3. Journeyman: screens técnicos por zona (Java, Pub/Sub, Cassandra, Prometheus, SQL)
4. Expert: system design (ej. pipeline de eventos de órdenes), mini take-home bajo tiempo
5. Boss: **Mock Loop completo** (45–60 min: técnico + conductual + diseño) + negociación y preguntas para hacer al entrevistador
Incluye una quest sobre uso responsable de asistentes de IA en el desarrollo (revisar código generado, pruebas, seguridad), porque la oferta lo menciona explícitamente.

**Pista transversal 🗣️ English Track:** `micro` quests diarias (vocabulario técnico, una frase hablada de 20–30 s para grabar y pegar su transcripción, shadowing de un video corto). Alimenta la skill `english`. Implementación: es una zona más (`english-track`, desbloqueada desde el inicio) con 5 niveles de 6 micro-quests que se desbloquean en cadena. Para las micro de hablar se usa el dictado de Windows (Win + H) como transcriptor, porque el usuario estudia siempre desde la PC.

## 8. Modelo de datos (Postgres)

Contenido (lo reescribe el seed):
`skills` (code, name, core, target_xp), `zones`, `zone_prerequisites`, `levels`, `quests` (type, order, required, xp, estimated_min, payload JSONB, status), `quest_skills` (quest_id, skill_id, weight), `resources`, `quest_resources`, `glossary_terms`, `quiz_questions` (quest_id, type, payload JSONB), `interview_templates`, `badges`.

Progreso (el seed NUNCA lo toca):
`profile` (una sola fila: xp_total, created_at; opcionalmente una caché de streak_current/streak_best que se recalcula desde `study_log`), `quest_progress` (quest_id, status: locked|available|in_progress|completed, completed_at, xp_awarded, hints_used, notes, evidence), `resource_progress` (resource_id, seen, note), `quiz_attempts` (quest_id, score, passed, started_at, finished_at), `quiz_answers` (attempt_id, question_id, answer, correct), `glossary_srs` (term_id, ease, interval_days, due_at, reps, lapses), `interview_sessions` (template_id, mode, started_at, finished_at, score, rubric JSONB, feedback_md, mode_source: api|manual), `interview_turns` (session_id, role, content, created_at), `xp_events` (reason, amount, quest_id, created_at), `user_badges`, `study_log` (date, minutes, activity), `custom_resources` (recursos agregados por el usuario).

Todas las tablas de progreso con `created_at/updated_at`. Índices por `quest_id`, `due_at`, `date`.

## 9. Integración con Claude (dos modos, ambos obligatorios)

**Modo A — sin API (por defecto, costo $0):** para `open_answer`, `interview`, revisión de evidencia de labs y `boss`, la app genera un **prompt listo para copiar** (botón "Copiar prompt para Claude") que incluye: el contexto de la quest, la rúbrica, la respuesta del usuario y la instrucción de devolver un bloque JSON de calificación al final. El usuario lo pega en Claude (claude.ai) y luego pega la respuesta de vuelta en la app; la app extrae y guarda el JSON (score, rúbrica por criterio, feedback, siguiente paso).

**Modo B — con API:** si `ANTHROPIC_API_KEY` está definida, los mismos flujos se ejecutan dentro de la app (route handlers en el servidor; la clave nunca llega al navegador). Estimación de uso visible en Settings (tokens aproximados por sesión) y un tope configurable `MAX_API_CALLS_PER_DAY`. Si la API falla, caer al Modo A sin perder la respuesta del usuario.

Rúbrica de calificación (JSON esperado, salida estricta):
```json
{
  "score": 0-100,
  "criteria": [{"name": "correctness", "score": 0-100, "comment": "..."},
               {"name": "depth", ...}, {"name": "clarity", ...}, {"name": "tradeoffs", ...}],
  "english_feedback": [{"original": "...", "better": "...", "why_es": "..."}],
  "gaps": ["tema a repasar", "..."],
  "next_step": "..."
}
```
Los `gaps` crean automáticamente tarjetas de glosario o quests de refuerzo (`micro`) en la cola del día.

Reglas de los prompts a Claude: ser directo y crítico (sin adulación), explicar errores en español simple, y dar las correcciones de inglés con la versión mejor + por qué. Pasar la oferta de trabajo como contexto en las simulaciones.

## 10. Simulaciones de entrevista y pruebas técnicas

Pantalla **Interview Arena** con estos modos:
- `behavioral` (STAR, en inglés)
- `technical_screen` por zona (preguntas verbales; 5–8 preguntas, con repreguntas)
- `system_design` (enunciado, 30–45 min, entrega: texto + diagrama en texto/Mermaid)
- `coding_task` (enunciado tipo take-home de 60–90 min; entrega: enlace al repo o código pegado)
- `mock_loop` (secuencia completa de los anteriores, solo desbloqueada al final)

Cada sesión tiene: temporizador visible (opcional), turnos guardados, rúbrica final, comparación con sesiones previas (gráfico de progreso por criterio) y "Top 3 cosas a mejorar". Modo B: Claude actúa como entrevistador de Home Depot (tono profesional, repreguntas, pide trade-offs, no da la respuesta). Modo A: se genera un único prompt que contiene el guion completo y pide a Claude hacerlo turno a turno en el chat; luego el usuario pega la transcripción y recibe la calificación con el prompt de evaluación.

Las plantillas de preguntas viven en `content/interviews/*.yaml` (≥ 15 conductuales, ≥ 10 técnicas por cada zona 1–3 en v1).

## 11. Herramienta de generación de contenido (para completar las zonas esqueleto)

Comando `npm run content:new -- --zone <slug> --level <n>` (o una página de admin en Settings): genera el prompt para que Claude Code (o Claude vía API) produzca el YAML de ese nivel siguiendo el esquema de la sección 7, y lo valida con un esquema (Zod) antes de guardarlo en `content/`. Cada archivo generado debe pasar la validación y el seed lo carga sin tocar el progreso. Esto permite crecer el sistema nivel por nivel sin reescribir código.

## 12. Pantallas

1. **Mapa del mundo:** SVG o canvas ligero con nodos conectados por caminos; estados: bloqueado (gris), disponible (brillante), en progreso, completado (insignia). Al pasar el mouse sobre una zona se ve su progreso y sus skills.
2. **Zona:** los 5 niveles como etapas verticales con la historia de la zona.
3. **Nivel:** pestañas Aprender · Glosario · Práctica · Quiz · Jefe, con la lista de quests y el estado de cada una.
4. **Quest:** vista según tipo (lector de recursos con notas, laboratorio con checklist y campo de evidencia, quiz con feedback inmediato y explicación, respuesta abierta con botón de calificación Modo A/B).
5. **Glosario:** búsqueda, filtro por zona/categoría, modo flashcards (SRS) y la analogía con IBM MQ/IIB.
6. **Interview Arena** (sección 10).
7. **Dashboard:** Job Readiness radar, XP, rango, racha, Daily Quest, horas estudiadas por semana, siguientes 3 acciones recomendadas.
8. **Settings:** estado de la API de Claude (configurada o no), backup/exportar/importar, reiniciar zona (con confirmación), tema.

**Estilo visual: "Neon Atlas".** Un HUD táctico tipo hacker sobre un mapa de reinos: el usuario es un hacker infiltrándose en un reino; el mapa es un holograma, cada zona es un "sector" y completar un nivel es "comprometer un nodo". Todo con SVG + CSS, sin ilustraciones ni assets dibujados a mano.
- **Paleta (tokens CSS):** fondo casi negro (`#07090d` aprox.), cian = disponible, magenta = en progreso, gris = bloqueado, verde = completado. Contraste suficiente para leer en el celular.
- **Fuentes (Google Fonts):** Rajdhani para títulos, Inter para lecciones y contenido (legible en español), JetBrains Mono para comandos, código y quizzes.
- **v1 (Fases 1–4):** solo el tema, la paleta, las fuentes y los estados de los nodos. Transiciones básicas de CSS como máximo. El estilo visual no debe frenar las Fases 1–4: si una decisión de diseño toma más de unos minutos, elige lo simple y sigue.
- **Fase 6 (después):** animaciones de glitch corto al ganar XP, línea de escaneo, texto "decrypt" al subir de rango, y la mecánica de zonas bloqueadas como "datos cifrados" que se descifran con el progreso. Sin sonidos por defecto; opción para activarlos.
- Diseño responsive. Actualización (2026-11-05): el usuario usará la app siempre desde la PC, así que la prioridad es el escritorio; el acceso por Tailscale queda como opción documentada, no como requisito.

## 13. Fases de implementación

**Fase 1 — Cimientos:** `git init` + `.gitignore`, Dockerfile multi-stage, `docker-compose.yml` (app + db con volumen), Drizzle + migraciones, seed idempotente, `skills.yaml` (con `target_xp` por skill y su cálculo comentado), `TZ` en `.env`, `estimated_min` en el esquema de quests, una zona de prueba, tema Neon Atlas básico (tokens de color y fuentes). Criterio: `docker compose up -d --build` levanta, la BD persiste tras `docker compose down` + `up`.

**Fase 2 — Mapa y navegación:** mapa del mundo, zona, nivel, desbloqueo por prerrequisitos, estado de progreso.

**Fase 3 — Quests de aprendizaje:** `learn` con recursos y notas, `glossary` con SRS, `quiz` autocalificado con historial, `micro`, XP, rangos, racha (con la regla de congelación de la sección 5), insignias, Dashboard con Cobertura + Readiness real, Daily Quest mobile-first.

**Fase 4 — Contenido real:** zonas 1, 2 y 3 completas (sección 7), glosarios y quizzes; English Track completo; Zona 10 nivel 1 completo; resto de zonas 4–10 como esqueleto. README con la guía de Tailscale (`tailscale serve`, MagicDNS y HTTPS). Incluye la vista básica de `lab` (pasos, comandos copiables, checklist y evidencia self-attest), porque los niveles 2–4 la necesitan; la revisión de evidencia por Claude sigue en la Fase 5.

**Fase 5 — Claude y entrevistas:** Modo A (prompts copiar/pegar) y Modo B (API), `open_answer`, `lab` con evidencia, `boss`, Interview Arena, historial y gráficos de progreso.
Decisiones de implementación: `open_answer` y `boss`/`interview` se aprueban con rúbrica ≥ 70; el `boss` es una sesión de entrevista con el entregable del usuario (el examen final del nivel aporta el ≥ 80 %). En Modo A, el prompt de entrevista pide a Claude calificar al final con el JSON; si lo pegado no trae JSON, la app guarda la transcripción y ofrece el prompt de evaluación (paso 2). Los `gaps` van a la tabla `review_queue` y aparecen como "refuerzos" en la Daily Quest. Tablas nuevas: `evaluations` y `review_queue`. El `mock_loop` se desbloquea al vencer a los jefes de las zonas 1–3. En Modo B se activa `fallbacks: "default"` en los modelos que lo soportan.

**Fase 6 — Robustez y pulido:** scripts de backup/restore, export/import JSON, herramienta `content:new`, pruebas básicas (seed idempotente, desbloqueo de niveles, cálculo de XP, Cobertura vs Readiness real, regla de racha/congelación, parser del JSON de Claude). Animaciones de Neon Atlas y mecánica de "datos cifrados" (sección 12). **Opcional:** PWA con caché offline de la Daily Quest (flashcards y preguntas del día) que sincroniza al volver la conexión, para cuando el PC esté apagado o no haya señal.

**Tiempo máximo de construcción:** el sistema es una herramienta para estudiar, no el objetivo. Entrega las Fases 1–4 primero para que el usuario pueda empezar a estudiar de inmediato; las Fases 5–6 pueden hacerse después, mientras él estudia la Zona 1.

## 14. Criterios de aceptación

- `docker compose up -d --build` funciona desde cero en Windows/WSL2 sin pasos manuales extra.
- Reiniciar o reconstruir contenedores NO pierde progreso (volumen nombrado). Volver a correr el seed no duplica ni borra progreso.
- El mapa muestra las 10 zonas y bloquea/desbloquea según los prerrequisitos definidos.
- Las zonas 1–3 se pueden completar de principio a fin (recursos → glosario → laboratorio → quiz → jefe).
- El Dashboard muestra Cobertura y Readiness real por separado; las zonas `outline` cuentan como 0 en Readiness real y la frase "listo para aplicar" depende solo de Readiness real.
- La racha cuenta días con ≥ 10 min (en la zona horaria `TZ`), se deriva de `study_log` y aplica 1 congelación automática por semana sin tratar el jueves como especial. Estudiar de 11:30 pm a 12:15 am no gasta una congelación.
- `skills.yaml` tiene `target_xp` en las 14 skills, con el cálculo comentado.
- El English Track y la Zona 10 nivel 1 se pueden completar en la v1.
- Desde el celular, conectado por Tailscale fuera de casa, se abre la Daily Quest por `https://…ts.net` (vía `tailscale serve`); Docker solo publica en `127.0.0.1` y la app no es accesible desde internet público.
- El repo tiene historial de commits por fase y `.env` no está versionado.
- Ningún recurso tiene una URL inventada: todas las URLs son verificadas o están en `null` con instrucciones de búsqueda.
- Sin `ANTHROPIC_API_KEY`, todo funciona con Modo A. Con la clave, funciona el Modo B y la clave nunca llega al navegador.
- Los comandos en README y lecciones están en PowerShell.
- Los textos de la UI y las definiciones están en español simple; los términos técnicos y las simulaciones de entrevista, en inglés.
