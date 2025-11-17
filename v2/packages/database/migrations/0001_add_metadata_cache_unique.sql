-- Migration: Add unique constraint to metadata_cache
-- This constraint is required for the ON CONFLICT clause in metadata caching

ALTER TABLE "metadata_cache" 
ADD CONSTRAINT "metadata_cache_source_identifier_unique" 
UNIQUE ("source", "identifier");
