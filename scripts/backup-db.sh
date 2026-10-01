#!/bin/bash
set -euo pipefail

BACKUP_DIR="$HOME/homepage/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
COMPOSE_DIR="$HOME/homepage"
RETENTION_DAYS=14

# .env laden für POSTGRES_USER und POSTGRES_DB
set -a
source "$COMPOSE_DIR/.env"
set +a

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

cd "$COMPOSE_DIR"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
    | gzip > "$BACKUP_FILE"

# Alte Backups löschen
find "$BACKUP_DIR" -name "db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup erfolgreich: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
