#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRON_LOG="$PROJECT_DIR/backups/cron.log"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-db.sh"
TAG="# housing-investment-api backup"
ENTRY="0 3 * * * /bin/bash $BACKUP_SCRIPT >> $CRON_LOG 2>&1"

mkdir -p "$PROJECT_DIR/backups"

if crontab -l 2>/dev/null | grep -F "$TAG" > /dev/null 2>&1; then
  echo "Cron job already installed."
  exit 0
fi

(crontab -l 2>/dev/null; echo "$TAG"; echo "$ENTRY") | crontab - 2>&1 && {
  echo "Cron job installed: $(basename $PROJECT_DIR) backup runs daily at 3:00 AM"
  echo "  Log: $CRON_LOG"
  echo "  Verify: crontab -l"
  echo "  Remove: npm run remove-cron"
  exit 0
}

echo "Failed to install cron job."
echo "On macOS, grant Full Disk Access to your terminal:"
echo "  System Settings > Privacy & Security > Full Disk Access > add your terminal app"
