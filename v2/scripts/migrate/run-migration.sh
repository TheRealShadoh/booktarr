#!/bin/bash
set -e

echo "BookTarr v1 to v2 Migration Script"
echo "==================================="
echo ""

# Configuration
V1_DB_PATH=${1:-"../backend/database/booktarr.db"}
USER_ID=${2:-"default-user-id"}
MIGRATION_DIR="./migration-data"

# Step 1: Export v1 data
echo "Step 1: Exporting v1 data..."
npx tsx scripts/migrate/export-v1-data.ts "$V1_DB_PATH" "$MIGRATION_DIR"
echo ""

# Step 2: Transform data
echo "Step 2: Transforming data to v2 format..."
npx tsx scripts/migrate/transform-data.ts "$MIGRATION_DIR" "$MIGRATION_DIR/transformed"
echo ""

# Step 3: Import to v2
echo "Step 3: Importing data to v2..."
npx tsx scripts/migrate/import-v2-data.ts "$MIGRATION_DIR/transformed/transformed.json" "$USER_ID"
echo ""

echo "Migration complete!"
echo "Please verify the data in your v2 installation."
