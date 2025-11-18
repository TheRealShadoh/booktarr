CREATE TABLE IF NOT EXISTS "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"bio" text,
	"image_url" text,
	"website" varchar(500),
	"goodreads_id" varchar(100),
	"google_books_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'author',
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"subtitle" varchar(500),
	"description" text,
	"language" varchar(10) DEFAULT 'en',
	"publisher" varchar(255),
	"published_date" date,
	"page_count" integer,
	"categories" text[],
	"google_books_id" varchar(100),
	"open_library_id" varchar(100),
	"goodreads_id" varchar(100),
	"metadata_source" varchar(50),
	"metadata_last_updated" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"isbn_10" varchar(10),
	"isbn_13" varchar(13),
	"asin" varchar(10),
	"format" varchar(50),
	"pages" integer,
	"edition" varchar(100),
	"publisher" varchar(255),
	"published_date" date,
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"cover_url" text,
	"cover_thumbnail_url" text,
	"in_print" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metadata_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"ttl" integer DEFAULT 2592000,
	"last_fetched" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'owned' NOT NULL,
	"acquisition_date" date,
	"acquisition_price" numeric(10, 2),
	"location" varchar(255),
	"condition" varchar(50),
	"signed" boolean DEFAULT false,
	"first_edition" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"token_type" varchar(50),
	"scope" text,
	"id_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"name" varchar(255),
	"image" text,
	"password_hash" text,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"total_volumes" integer,
	"status" varchar(50) DEFAULT 'ongoing',
	"type" varchar(50),
	"anilist_id" integer,
	"myanimelist_id" integer,
	"google_books_id" varchar(100),
	"metadata_source" varchar(50),
	"metadata_last_updated" timestamp,
	"manual_override" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"volume_number" integer NOT NULL,
	"volume_name" varchar(500),
	"part_number" integer,
	"arc_name" varchar(255),
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series_volumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"volume_number" integer NOT NULL,
	"title" varchar(500),
	"description" text,
	"cover_url" text,
	"release_date" timestamp,
	"isbn_13" varchar(13),
	"book_id" uuid,
	"announced" boolean DEFAULT false,
	"released" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pre_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"source" varchar(100) NOT NULL,
	"order_number" varchar(255),
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"ordered_at" date NOT NULL,
	"expected_release_date" date,
	"received_at" date,
	"status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"source" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"url" text,
	"in_stock" varchar(50) DEFAULT 'unknown',
	"condition" varchar(50) DEFAULT 'new',
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reading_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"target_books" integer NOT NULL,
	"target_pages" integer,
	"books_read" integer DEFAULT 0,
	"pages_read" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'want_to_read' NOT NULL,
	"current_page" integer DEFAULT 0,
	"total_pages" integer,
	"progress_percentage" integer DEFAULT 0,
	"started_at" timestamp,
	"finished_at" timestamp,
	"last_read_at" timestamp,
	"rating" integer,
	"review" text,
	"review_public" varchar(50) DEFAULT 'private',
	"reading_sessions" integer DEFAULT 0,
	"total_reading_time" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"priority" integer DEFAULT 3,
	"price_limit" numeric(10, 2),
	"target_date" date,
	"notify_on_price_drop" varchar(50) DEFAULT 'never',
	"price_drop_threshold" numeric(10, 2),
	"notify_on_release" varchar(50) DEFAULT 'never',
	"notes" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editions" ADD CONSTRAINT "editions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_books" ADD CONSTRAINT "user_books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_books" ADD CONSTRAINT "user_books_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_books" ADD CONSTRAINT "series_books_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_books" ADD CONSTRAINT "series_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_volumes" ADD CONSTRAINT "series_volumes_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_volumes" ADD CONSTRAINT "series_volumes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pre_orders" ADD CONSTRAINT "pre_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pre_orders" ADD CONSTRAINT "pre_orders_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_tracking" ADD CONSTRAINT "price_tracking_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authors_name_idx" ON "authors" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_authors_book_idx" ON "book_authors" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_authors_author_idx" ON "book_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_title_idx" ON "books" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_google_id_idx" ON "books" USING btree ("google_books_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_openlibrary_id_idx" ON "books" USING btree ("open_library_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editions_book_idx" ON "editions" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editions_isbn10_idx" ON "editions" USING btree ("isbn_10");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editions_isbn13_idx" ON "editions" USING btree ("isbn_13");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editions_asin_idx" ON "editions" USING btree ("asin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metadata_cache_source_identifier_idx" ON "metadata_cache" USING btree ("source","identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metadata_cache_expires_idx" ON "metadata_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_books_user_idx" ON "user_books" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_books_edition_idx" ON "user_books" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_books_status_idx" ON "user_books" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_name_idx" ON "series" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_anilist_idx" ON "series" USING btree ("anilist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_books_series_idx" ON "series_books" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_books_book_idx" ON "series_books" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_books_volume_idx" ON "series_books" USING btree ("series_id","volume_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_volumes_series_volume_idx" ON "series_volumes" USING btree ("series_id","volume_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_volumes_book_idx" ON "series_volumes" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_orders_user_idx" ON "pre_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_orders_status_idx" ON "pre_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pre_orders_release_idx" ON "pre_orders" USING btree ("expected_release_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_tracking_book_date_idx" ON "price_tracking" USING btree ("book_id","checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reading_goals_user_year_idx" ON "reading_goals" USING btree ("user_id","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reading_progress_user_book_idx" ON "reading_progress" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reading_progress_status_idx" ON "reading_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reading_progress_finished_idx" ON "reading_progress" USING btree ("user_id","finished_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_user_idx" ON "wishlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_book_idx" ON "wishlists" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_priority_idx" ON "wishlists" USING btree ("user_id","priority");