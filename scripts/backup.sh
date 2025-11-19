#!/bin/bash
set -e

#######################################
# Automated Backup Script
# Backs up PostgreSQL database, Redis data, and MinIO storage
#######################################

echo "💾 BookTarr Backup Script"
echo "========================="
echo ""

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "📦 Starting backup at $(date)"
echo "Backup location: $BACKUP_PATH"
echo ""

# Backup PostgreSQL
echo "🗄️  Backing up PostgreSQL database..."
if docker-compose ps postgres | grep -q "Up"; then
  docker-compose exec -T postgres pg_dump -U booktarr booktarr | gzip > "$BACKUP_PATH/database.sql.gz"
  DB_SIZE=$(du -h "$BACKUP_PATH/database.sql.gz" | cut -f1)
  echo "✅ Database backed up ($DB_SIZE)"
else
  echo "⚠️  PostgreSQL container is not running, skipping database backup"
fi

# Backup Redis (optional)
echo ""
echo "🔴 Backing up Redis data..."
if docker-compose ps redis | grep -q "Up"; then
  docker-compose exec -T redis redis-cli --rdb - > "$BACKUP_PATH/redis.rdb" 2>/dev/null || true
  if [ -f "$BACKUP_PATH/redis.rdb" ]; then
    REDIS_SIZE=$(du -h "$BACKUP_PATH/redis.rdb" | cut -f1)
    echo "✅ Redis backed up ($REDIS_SIZE)"
  else
    echo "⚠️  Redis backup failed or no data to backup"
  fi
else
  echo "⚠️  Redis container is not running, skipping Redis backup"
fi

# Backup MinIO/S3 storage
echo ""
echo "📦 Backing up MinIO storage..."
if docker-compose ps minio | grep -q "Up"; then
  # Copy MinIO data using docker cp
  docker-compose exec -T minio sh -c "tar czf - /data" > "$BACKUP_PATH/minio-data.tar.gz" 2>/dev/null || true
  if [ -f "$BACKUP_PATH/minio-data.tar.gz" ]; then
    MINIO_SIZE=$(du -h "$BACKUP_PATH/minio-data.tar.gz" | cut -f1)
    echo "✅ MinIO storage backed up ($MINIO_SIZE)"
  else
    echo "⚠️  MinIO backup failed"
  fi
else
  echo "⚠️  MinIO container is not running, skipping storage backup"
fi

# Backup configuration files
echo ""
echo "⚙️  Backing up configuration files..."
tar czf "$BACKUP_PATH/config.tar.gz" \
  .env.example \
  .env.production.example \
  docker-compose.yml \
  docker-compose.production.yml \
  nginx.conf \
  2>/dev/null || echo "Some config files not found"

CONFIG_SIZE=$(du -h "$BACKUP_PATH/config.tar.gz" | cut -f1)
echo "✅ Configuration backed up ($CONFIG_SIZE)"

# Create backup manifest
echo ""
echo "📋 Creating backup manifest..."
cat > "$BACKUP_PATH/manifest.txt" <<EOF
BookTarr Backup Manifest
========================
Timestamp: $TIMESTAMP
Date: $(date)
Host: $(hostname)

Contents:
- database.sql.gz: PostgreSQL database dump
- redis.rdb: Redis data snapshot
- minio-data.tar.gz: MinIO/S3 storage
- config.tar.gz: Configuration files

Versions:
- BookTarr: 2.0.0
- PostgreSQL: $(docker-compose exec -T postgres psql -U booktarr -t -c 'SELECT version()' 2>/dev/null | head -1 || echo "N/A")
- Redis: $(docker-compose exec -T redis redis-server --version 2>/dev/null || echo "N/A")

EOF

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "✅ Manifest created"

# Cleanup old backups
echo ""
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
REMAINING=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo "✅ Cleanup complete ($REMAINING backups remaining)"

# Summary
echo ""
echo "════════════════════════════════════════"
echo "✨ Backup Complete!"
echo "════════════════════════════════════════"
echo "Location: $BACKUP_PATH"
echo "Total size: $TOTAL_SIZE"
echo "Retention: $RETENTION_DAYS days"
echo ""
echo "To restore this backup, run:"
echo "  ./scripts/restore.sh $TIMESTAMP"
echo ""
