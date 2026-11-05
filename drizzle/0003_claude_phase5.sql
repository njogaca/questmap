CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer,
	"kind" text NOT NULL,
	"answer" text NOT NULL,
	"prompt" text NOT NULL,
	"raw_response" text,
	"score" integer,
	"rubric" jsonb,
	"mode_source" text,
	"api_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"source" text NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "api_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluations_quest_idx" ON "evaluations" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "review_queue_done_idx" ON "review_queue" USING btree ("done_at");