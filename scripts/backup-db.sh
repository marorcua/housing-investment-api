#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_PATH="$PROJECT_DIR/local.db"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/local.db.$DATE"

# skip if already backed up today
if [ -f "$BACKUP_FILE" ]; then
  echo "backup already exists for $DATE, skipping"
  exit 0
fi

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "backup created: $BACKUP_FILE"
else
  echo "no database found at $DB_PATH, skipping"
  exit 0
fi

find "$BACKUP_DIR" -name "local.db.*" -mtime +7 -delete
