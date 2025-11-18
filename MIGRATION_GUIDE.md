# Migration Guide: BookTarr v1 to v2

This guide explains how to migrate your data from BookTarr v1 to v2.

## Prerequisites

- Node.js 20+
- Access to your v1 SQLite database
- v2 installation with PostgreSQL running

## Migration Steps

### 1. Backup Your Data

**IMPORTANT**: Before starting the migration, back up your v1 database:

```bash
cp /path/to/v1/database/booktarr.db booktarr.db.backup
```

### 2. Prepare v2 Environment

Ensure v2 is properly set up and the database is initialized:

```bash
cd v2
npm install
docker-compose up -d postgres redis
npm run db:push --workspace=packages/database
```

### 3. Run Migration Script

The migration script will:
1. Export data from v1 SQLite database
2. Transform data to v2 format
3. Import data into v2 PostgreSQL database

```bash
# From the v2 directory
chmod +x scripts/migrate/run-migration.sh

# Run migration (replace paths as needed)
./scripts/migrate/run-migration.sh \
  ../backend/database/booktarr.db \
  your-user-id
```

### 4. Verify Migration

After migration completes, verify the data:

```bash
# Start the v2 application
npm run dev

# Check the following:
# - Visit http://localhost:3000/library
# - Verify books are displayed
# - Check series page
# - Verify reading progress
```

## Manual Migration Steps

If you prefer to run each step manually:

### Step 1: Export v1 Data

```bash
npx tsx scripts/migrate/export-v1-data.ts \
  /path/to/v1/database/booktarr.db \
  ./migration-data
```

This creates JSON files in `./migration-data/`:
- `books.json`
- `series.json`
- `reading_progress.json`
- `metadata_cache.json`

### Step 2: Transform Data

```bash
npx tsx scripts/migrate/transform-data.ts \
  ./migration-data \
  ./migration-data/transformed
```

This creates `./migration-data/transformed/transformed.json` with v2-compatible data.

### Step 3: Import to v2

```bash
npx tsx scripts/migrate/import-v2-data.ts \
  ./migration-data/transformed/transformed.json \
  your-user-id
```

## Data Mapping

### Books

- **v1**: Single table with all book data
- **v2**: Separated into `books` (metadata) and `editions` (format-specific)

### Authors

- **v1**: Comma-separated string in books table
- **v2**: Normalized `authors` table with many-to-many relationship

### Series

- **v1**: Fields in books table
- **v2**: Separate `series` and `series_books` tables with proper relationships

### Reading Progress

- **v1**: Basic status tracking
- **v2**: Enhanced with page progress, ratings, reviews, and reading sessions

## Troubleshooting

### Migration fails with "Database connection error"

Ensure PostgreSQL is running:

```bash
docker-compose ps
docker-compose up -d postgres
```

### "Cannot find v1 database"

Verify the path to your v1 database:

```bash
ls -la /path/to/v1/database/booktarr.db
```

### Duplicate entries

If you run the migration multiple times, clear the v2 database first:

```bash
npm run db:drop --workspace=packages/database
npm run db:push --workspace=packages/database
```

### Missing cover images

v2 stores cover images differently. Re-fetch metadata to update covers:

1. Go to each book in v2
2. Click "Refresh Metadata"

Or run the bulk refresh script:

```bash
npx tsx scripts/refresh-all-metadata.ts
```

## Post-Migration Tasks

1. **Verify all data**: Check books, series, reading progress
2. **Re-authenticate**: Log in with your credentials
3. **Update settings**: Configure metadata sources and preferences
4. **Refresh metadata**: Optional - refresh book metadata from external APIs
5. **Set reading goals**: Configure your reading goals for the current year

## Rollback

If you need to rollback to v1:

1. Stop v2 application
2. Restore v1 database from backup:
   ```bash
   cp booktarr.db.backup /path/to/v1/database/booktarr.db
   ```
3. Restart v1 application

## Support

If you encounter issues during migration:

1. Check the logs: `docker-compose logs app`
2. Review the migration output for errors
3. Open an issue on GitHub with:
   - Error messages
   - Migration log output
   - v1 and v2 versions

## What's Not Migrated

The following are NOT migrated automatically:

- **User accounts**: You'll need to create a new account in v2
- **Settings/preferences**: Reconfigure in v2 settings
- **Wishlist price tracking history**: Only current status is migrated
- **Custom tags/labels**: v2 uses a different categorization system

You can manually recreate these in v2 after migration.
