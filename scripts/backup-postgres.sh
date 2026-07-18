#!/bin/bash
set -euo pipefail

# Geolyt PostgreSQL backup script
#
# Usage:
#   POSTGRES_HOST=localhost POSTGRES_USER=geolyt POSTGRES_PASSWORD=geolyt \
#     POSTGRES_DB=geolyt BACKUP_DIR=/mnt/backups ./scripts/backup-postgres.sh
#
# For Docker containers:
#   POSTGRES_HOST=geolyt-postgres ./scripts/backup-postgres.sh

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_USER="${POSTGRES_USER:-geolyt}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-geolyt}"
POSTGRES_DB="${POSTGRES_DB:-geolyt}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="geolyt-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating backup of ${POSTGRES_DB}@${POSTGRES_HOST}..."

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --clean \
  --create \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Backup created: ${BACKUP_DIR}/${FILENAME}"

echo "Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name 'geolyt-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Done."
