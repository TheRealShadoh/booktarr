ALTER TABLE "series" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "metadata_cache" ADD CONSTRAINT "metadata_cache_source_identifier_unique" UNIQUE("source","identifier");