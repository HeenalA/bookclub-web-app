#!/bin/bash
# autosave.sh — auto-commits all changes every 30 minutes
# Run this in a separate terminal tab: bash scripts/autosave.sh
# Stop it with Ctrl+C

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "🔄 Autosave started for: $PROJECT_DIR"
echo "   Committing every 30 minutes. Stop with Ctrl+C."

while true; do
  sleep 1800  # 30 minutes
  cd "$PROJECT_DIR"
  
  # Only commit if there are actual changes
  if ! git diff --quiet || ! git diff --staged --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add .
    git commit -m "chore: autosave $(date '+%Y-%m-%d %H:%M')"
    echo "✅ Autosaved at $(date '+%H:%M')"
  else
    echo "💤 No changes to save at $(date '+%H:%M')"
  fi
done
