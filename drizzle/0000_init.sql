CREATE TYPE "public"."content_status" AS ENUM('published', 'outline', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quest_progress_status" AS ENUM('locked', 'available', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."quest_type" AS ENUM('learn', 'glossary', 'lab', 'quiz', 'open_answer', 'interview', 'boss', 'micro');--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"tokens_approx" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "custom_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"language" text DEFAULT 'es' NOT NULL,
	"duration_min" integer,
	"cost" text DEFAULT 'included' NOT NULL,
	"notes" text,
	"quest_slug" text,
	"zone_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_srs" (
	"term_id" integer PRIMARY KEY NOT NULL,
	"ease" double precision DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"term" text NOT NULL,
	"zone_slug" text,
	"category" text,
	"definition_es" text NOT NULL,
	"definition_en" text NOT NULL,
	"example_en" text,
	"analogy_mq" text,
	"see_also" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "glossary_terms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"quest_id" integer,
	"mode" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"score" integer,
	"rubric" jsonb,
	"feedback_md" text,
	"mode_source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"mode" text NOT NULL,
	"title" text NOT NULL,
	"zone_slug" text,
	"payload" jsonb NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "interview_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "interview_turns" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"zone_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"story" text,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "levels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"streak_current_cache" integer DEFAULT 0 NOT NULL,
	"streak_best_cache" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_progress" (
	"quest_id" integer PRIMARY KEY NOT NULL,
	"status" "quest_progress_status" DEFAULT 'available' NOT NULL,
	"completed_at" timestamp with time zone,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"evidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_resources" (
	"quest_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "quest_resources_quest_id_resource_id_pk" PRIMARY KEY("quest_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "quest_skills" (
	"quest_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"weight" double precision NOT NULL,
	CONSTRAINT "quest_skills_quest_id_skill_id_pk" PRIMARY KEY("quest_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"level_id" integer NOT NULL,
	"type" "quest_type" NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"xp" integer NOT NULL,
	"estimated_min" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "quests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer" jsonb,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer NOT NULL,
	"score" integer,
	"passed" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"quest_id" integer NOT NULL,
	"type" text NOT NULL,
	"order" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "quiz_questions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_progress" (
	"resource_id" integer PRIMARY KEY NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"how_to_find" text,
	"language" text NOT NULL,
	"duration_min" integer,
	"cost" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"why" text,
	"verified" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"core" boolean DEFAULT false NOT NULL,
	"target_xp" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "skills_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "study_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"minutes" integer NOT NULL,
	"activity" text NOT NULL,
	"quest_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"badge_id" integer PRIMARY KEY NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"amount" integer NOT NULL,
	"quest_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zone_prerequisites" (
	"zone_id" integer NOT NULL,
	"requires_zone_id" integer NOT NULL,
	"requires_level_number" integer NOT NULL,
	CONSTRAINT "zone_prerequisites_zone_id_requires_zone_id_pk" PRIMARY KEY("zone_id","requires_zone_id")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"emoji" text,
	"story" text,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unlocked_from_start" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "zones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "glossary_srs" ADD CONSTRAINT "glossary_srs_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_turns" ADD CONSTRAINT "interview_turns_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_resources" ADD CONSTRAINT "quest_resources_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_resources" ADD CONSTRAINT "quest_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_skills" ADD CONSTRAINT "quest_skills_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_skills" ADD CONSTRAINT "quest_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_log" ADD CONSTRAINT "study_log_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_prerequisites" ADD CONSTRAINT "zone_prerequisites_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_prerequisites" ADD CONSTRAINT "zone_prerequisites_requires_zone_id_zones_id_fk" FOREIGN KEY ("requires_zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_usage_date_idx" ON "api_usage" USING btree ("date");--> statement-breakpoint
CREATE INDEX "glossary_srs_due_idx" ON "glossary_srs" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "interview_turns_session_idx" ON "interview_turns" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "levels_zone_idx" ON "levels" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "quests_level_idx" ON "quests" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "quiz_answers_attempt_idx" ON "quiz_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quest_idx" ON "quiz_attempts" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_quest_idx" ON "quiz_questions" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "study_log_date_idx" ON "study_log" USING btree ("date");--> statement-breakpoint
CREATE INDEX "xp_events_quest_idx" ON "xp_events" USING btree ("quest_id");