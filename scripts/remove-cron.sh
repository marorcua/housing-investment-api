#!/bin/bash
set -euo pipefail

TAG="# housing-investment-api backup"

if ! crontab -l 2>/dev/null | grep -F "$TAG" > /dev/null 2>&1; then
  echo "No cron job found."
  exit 0
fi

crontab -l 2>/dev/null | grep -v -F "housing-investment-api" | crontab - 2>&1
echo "Cron job removed."
