CREATE TABLE "track_progress" (
	"track_id" integer PRIMARY KEY NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"emoji" text,
	"description" text,
	"palette" text,
	"order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "tracks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "active_track_id" integer;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "track_id" integer;--> statement-breakpoint
ALTER TABLE "study_log" ADD COLUMN "track_id" integer;--> statement-breakpoint
ALTER TABLE "xp_events" ADD COLUMN "track_id" integer;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "track_id" integer;--> statement-breakpoint
ALTER TABLE "track_progress" ADD CONSTRAINT "track_progress_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_active_track_id_tracks_id_fk" FOREIGN KEY ("active_track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_log" ADD CONSTRAINT "study_log_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "xp_events_track_idx" ON "xp_events" USING btree ("track_id");--> statement-breakpoint
-- ===== Backfill: el mundo actual pasa a ser la ruta `backend-gcp`. No se borra nada. =====
INSERT INTO "tracks" ("slug","title","emoji","description","palette","order") VALUES
  ('backend-gcp','Backend & GCP','🗺️','La ruta original: Java, event-driven, datos y nube hasta estar listo para aplicar.','ctos',1);
--> statement-breakpoint
-- Zonas: las 9 técnicas entran a la ruta. Arena, English y Terminal Tundra quedan NULL = transversales.
UPDATE "zones" SET "track_id" = (SELECT id FROM "tracks" WHERE slug = 'backend-gcp')
  WHERE "slug" NOT IN ('interview-arena','english-track','terminal-tundra');
--> statement-breakpoint
-- Skills: transversales solo las que no tienen contenido fuera de las zonas transversales (linux,
-- ai_tools) más inglés. `git` se queda en la ruta: sus quests viven en zonas backend, y marcarlo
-- transversal dejaría la skill visible en toda ruta nueva sin una sola quest para subirla.
UPDATE "skills" SET "track_id" = (SELECT id FROM "tracks" WHERE slug = 'backend-gcp')
  WHERE "code" NOT IN ('english','linux','ai_tools');
--> statement-breakpoint
-- XP ya ganado: se atribuye a la ruta de su quest. Sin quest (repaso diario) queda NULL = transversal.
UPDATE "xp_events" e SET "track_id" = z."track_id"
  FROM "quests" q JOIN "levels" l ON l.id = q.level_id JOIN "zones" z ON z.id = l.zone_id
  WHERE e."quest_id" = q.id AND z."track_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "study_log" s SET "track_id" = z."track_id"
  FROM "quests" q JOIN "levels" l ON l.id = q.level_id JOIN "zones" z ON z.id = l.zone_id
  WHERE s."quest_id" = q.id AND z."track_id" IS NOT NULL;
--> statement-breakpoint
-- Puntuación por ruta, recalculada desde los eventos (no se confía en ningún caché).
INSERT INTO "track_progress" ("track_id","xp_total")
  SELECT t.id, COALESCE((SELECT SUM(e.amount) FROM "xp_events" e WHERE e."track_id" = t.id), 0)
  FROM "tracks" t WHERE t.slug = 'backend-gcp';
--> statement-breakpoint
UPDATE "profile" SET "active_track_id" = (SELECT id FROM "tracks" WHERE slug = 'backend-gcp') WHERE "id" = 1;
