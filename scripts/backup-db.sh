#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_PATH="$PROJECT_DIR/local.db"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d)

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_DIR/local.db.$DATE"
  echo "backup created: $BACKUP_DIR/local.db.$DATE"
else
  echo "no database found at $DB_PATH, skipping"
  exit 0
fi

find "$BACKUP_DIR" -name "local.db.*" -mtime +7 -delete
