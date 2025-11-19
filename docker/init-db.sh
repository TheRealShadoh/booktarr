#!/bin/bash
set -e

# Initialize PostgreSQL database for BookTarr
# This script runs automatically when the PostgreSQL container is first created

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension for primary keys
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Enable trigram extension for fuzzy text search
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- Grant all privileges on database to booktarr user
    GRANT ALL PRIVILEGES ON DATABASE booktarr TO booktarr;

    -- Log successful initialization
    \echo 'BookTarr database initialized successfully'
EOSQL

echo "PostgreSQL initialization complete!"
