#!/bin/bash
# update_session.sh — update SESSION_STATE.md with what was done this session
# Usage: bash scripts/update_session.sh "brief description of what was done"

DESCRIPTION="${1:-session update}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_FILE="$PROJECT_DIR/docs/SESSION_STATE.md"
TIMESTAMP=$(date '+%B %d, %Y at %H:%M')

# Update the "Last updated" line in SESSION_STATE.md
sed -i.bak "s/Last updated: .*/Last updated: $TIMESTAMP/" "$SESSION_FILE"
rm -f "$SESSION_FILE.bak"

# Stage SESSION_STATE.md
cd "$PROJECT_DIR"
git add docs/SESSION_STATE.md

echo "✅ SESSION_STATE.md updated: $TIMESTAMP"
echo "   Description: $DESCRIPTION"
echo ""
echo "Next step — commit with:"
echo "   git add . && git commit -m \"docs: $DESCRIPTION\" && git push"
