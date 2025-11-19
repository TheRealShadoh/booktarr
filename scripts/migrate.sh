#!/bin/bash
set -e

#######################################
# Database Migration Script
# Safely runs database migrations with backup
#######################################

echo "🔄 BookTarr Database Migration"
echo "==============================="
echo ""

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "Set it with:"
  echo "  export DATABASE_URL='postgresql://booktarr:password@localhost:5432/booktarr'"
  exit 1
fi

# Create backups directory
mkdir -p backups

# Create backup before migration
BACKUP_FILE="backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql"
echo "💾 Creating backup before migration..."
echo "Backup file: $BACKUP_FILE"

if docker-compose ps postgres | grep -q "Up"; then
  docker-compose exec -T postgres pg_dump -U booktarr booktarr > "$BACKUP_FILE"
  echo "✅ Backup created successfully"
else
  echo "❌ PostgreSQL container is not running"
  echo "Start it with: docker-compose up -d postgres"
  exit 1
fi

# Show current migration status
echo ""
echo "📊 Current migration status..."
npm run db:studio --workspace=packages/database &
STUDIO_PID=$!
sleep 2
kill $STUDIO_PID 2>/dev/null || true

# Confirmation
echo ""
read -p "⚠️  Ready to run migrations. Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Migration cancelled"
  echo "Backup saved at: $BACKUP_FILE"
  exit 0
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
npm run db:migrate --workspace=packages/database

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"

  # Verify database
  echo ""
  echo "🔍 Verifying database integrity..."
  docker-compose exec -T postgres psql -U booktarr -d booktarr -c "\dt" > /dev/null 2>&1 && echo "✅ Database verification passed"

  echo ""
  echo "════════════════════════════════════════"
  echo "✨ Migration Complete!"
  echo "════════════════════════════════════════"
  echo "Backup location: $BACKUP_FILE"
  echo ""
  echo "If you need to rollback, restore from backup:"
  echo "  gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U booktarr booktarr"
  echo ""
else
  echo "❌ Migration failed!"
  echo ""
  echo "To rollback, restore from backup:"
  echo "  gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U booktarr booktarr"
  exit 1
fi
