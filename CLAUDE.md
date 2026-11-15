# CLAUDE.md

Las instrucciones para trabajar en este repo están en **[AGENTS.md](AGENTS.md)**, en un archivo
neutro para que sirvan a cualquier agente y no haya dos copias que se desincronicen.

**Léelo antes de escribir código.** Lo más fácil de olvidar:

- `docker compose up -d` **no** recompila. El código va horneado en la imagen: usa `--build`.
- No hay `node_modules` en el host. Todo pasa por contenedores (`docker build --target deps`).
- Los botones salen de `src/components/ui.ts` (`btnPrimary`). `.hud-btn` por sí solo no tiene
  borde ni fondo y no parece pulsable.
- En YAML, entrecomilla cualquier valor que contenga `": "` o romperás el parser y la app no
  arrancará.
- El seed nunca toca el progreso del usuario, y `track_id` NULL significa transversal.
