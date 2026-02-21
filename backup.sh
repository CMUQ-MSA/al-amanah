#!/bin/bash
# Backup Al-Amanah SQLite database
# Run via cron, e.g.: 0 3 * * * /path/to/al-amanah/backup.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_FILE="$PROJECT_DIR/data/msa_tracker.db"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M)
cp -a "$DB_FILE" "$BACKUP_DIR/msa_tracker_${TIMESTAMP}.db"

# Keep only last 7 days
find "$BACKUP_DIR" -name "msa_tracker_*.db" -mtime +7 -delete