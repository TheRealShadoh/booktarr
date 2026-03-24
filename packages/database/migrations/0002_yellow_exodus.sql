CREATE TABLE IF NOT EXISTS "library_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_id" uuid NOT NULL,
	"permission" varchar(10) DEFAULT 'view' NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"forced_by_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_shares_owner_id_shared_with_id_unique" UNIQUE("owner_id","shared_with_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"entity_name" text,
	"details" jsonb,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "download_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"host" text NOT NULL,
	"username" text,
	"password" text,
	"api_key" text,
	"category" text DEFAULT 'books',
	"priority" integer DEFAULT 0,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "download_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"series_id" uuid,
	"book_title" text NOT NULL,
	"volume_number" integer,
	"indexer_name" text,
	"download_client_id" uuid,
	"external_id" text,
	"status" text DEFAULT 'searching' NOT NULL,
	"size" bigint,
	"download_url" text,
	"release_title" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indexers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"api_key" text,
	"categories" text[],
	"supports_search" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"enabled" boolean DEFAULT true,
	"last_checked" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitoring_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"auto_monitor_new_series" boolean DEFAULT true,
	"search_on_add" boolean DEFAULT true,
	"default_format" text DEFAULT 'any',
	"notify_on_new_volume" boolean DEFAULT true,
	"notify_on_download_complete" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_config_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "monitored" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_shares" ADD CONSTRAINT "library_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_shares" ADD CONSTRAINT "library_shares_shared_with_id_users_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_clients" ADD CONSTRAINT "download_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_queue" ADD CONSTRAINT "download_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_queue" ADD CONSTRAINT "download_queue_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "download_queue" ADD CONSTRAINT "download_queue_download_client_id_download_clients_id_fk" FOREIGN KEY ("download_client_id") REFERENCES "public"."download_clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "indexers" ADD CONSTRAINT "indexers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitoring_config" ADD CONSTRAINT "monitoring_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_user_created_idx" ON "activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_event_type_idx" ON "activity_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_read_idx" ON "activity_log" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_clients_user_idx" ON "download_clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_clients_enabled_idx" ON "download_clients" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_queue_user_idx" ON "download_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_queue_status_idx" ON "download_queue" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_queue_series_idx" ON "download_queue" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_queue_external_id_idx" ON "download_queue" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indexers_user_idx" ON "indexers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indexers_enabled_idx" ON "indexers" USING btree ("user_id","enabled");