CREATE TABLE IF NOT EXISTS "import_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"source_config" jsonb,
	"auto_monitor" boolean DEFAULT true,
	"last_synced" timestamp,
	"sync_interval" integer DEFAULT 24,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"format_preferences" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "quality_profile_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_lists" ADD CONSTRAINT "import_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_profiles" ADD CONSTRAINT "quality_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_lists_user_idx" ON "import_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_lists_enabled_idx" ON "import_lists" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_lists_last_synced_idx" ON "import_lists" USING btree ("last_synced");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quality_profiles_user_idx" ON "quality_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quality_profiles_user_default_idx" ON "quality_profiles" USING btree ("user_id","is_default");