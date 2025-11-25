#!/bin/bash
set -e

#######################################
# Database Restore Script
# Restores from a backup created by backup.sh
#######################################

echo "🔄 BookTarr Restore Script"
echo "=========================="
echo ""

# Check if backup timestamp provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup-timestamp>"
  echo ""
  echo "Available backups:"
  ls -1 ./backups/ 2>/dev/null || echo "No backups found"
  exit 1
fi

BACKUP_DIR="./backups"
TIMESTAMP="$1"
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# Check if backup exists
if [ ! -d "$BACKUP_PATH" ]; then
  echo "❌ Backup not found: $BACKUP_PATH"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR" 2>/dev/null || echo "No backups found"
  exit 1
fi

# Show backup info
echo "📦 Backup Information"
echo "===================="
if [ -f "$BACKUP_PATH/manifest.txt" ]; then
  cat "$BACKUP_PATH/manifest.txt"
else
  echo "Backup: $TIMESTAMP"
  echo "Path: $BACKUP_PATH"
fi
echo ""

# Confirmation
read -p "⚠️  This will overwrite current data. Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled"
  exit 0
fi

# Stop services
echo ""
echo "🛑 Stopping services..."
docker-compose stop app

# Restore PostgreSQL
if [ -f "$BACKUP_PATH/database.sql.gz" ]; then
  echo ""
  echo "🗄️  Restoring PostgreSQL database..."

  # Drop and recreate database
  docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS booktarr;"
  docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE booktarr OWNER booktarr;"

  # Restore from backup
  gunzip -c "$BACKUP_PATH/database.sql.gz" | docker-compose exec -T postgres psql -U booktarr booktarr

  echo "✅ Database restored"
else
  echo "⚠️  Database backup not found, skipping"
fi

# Restore Redis
if [ -f "$BACKUP_PATH/redis.rdb" ]; then
  echo ""
  echo "🔴 Restoring Redis data..."

  docker-compose stop redis
  docker cp "$BACKUP_PATH/redis.rdb" booktarr-redis:/data/dump.rdb
  docker-compose start redis

  echo "✅ Redis restored"
else
  echo "⚠️  Redis backup not found, skipping"
fi

# Restore MinIO
if [ -f "$BACKUP_PATH/minio-data.tar.gz" ]; then
  echo ""
  echo "📦 Restoring MinIO storage..."

  docker-compose stop minio
  docker-compose exec -T minio sh -c "rm -rf /data/*" 2>/dev/null || true
  docker cp "$BACKUP_PATH/minio-data.tar.gz" booktarr-minio:/tmp/backup.tar.gz
  docker-compose exec -T minio sh -c "cd / && tar xzf /tmp/backup.tar.gz && rm /tmp/backup.tar.gz"
  docker-compose start minio

  echo "✅ MinIO storage restored"
else
  echo "⚠️  MinIO backup not found, skipping"
fi

# Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Verify database
echo ""
echo "🔍 Verifying database..."
docker-compose exec -T postgres psql -U booktarr -d booktarr -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'" | grep -q "table_count" && echo "✅ Database verification passed" || echo "⚠️  Database verification failed"

# Summary
echo ""
echo "════════════════════════════════════════"
echo "✨ Restore Complete!"
echo "════════════════════════════════════════"
echo "Restored from: $BACKUP_PATH"
echo ""
echo "Application should be available at: http://localhost:3000"
echo ""
