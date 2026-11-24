#!/usr/bin/env bash
# ============================================================================
# start.sh — run the app locally.
# ============================================================================
# The app is a Vite + React project living in frontend/. This script installs
# dependencies on first run, checks the environment file exists, and starts
# the dev server (which opens a browser on http://localhost:3000).
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (first run only)…"
  npm install
fi

if [[ ! -f .env.local ]]; then
  echo
  echo "⚠  No frontend/.env.local found."
  echo "   The app will start, but it will show the 'Not connected yet' screen"
  echo "   until you create that file. Copy frontend/.env.example and fill in"
  echo "   your Supabase URL and anon key — see docs/RUNBOOK.md."
  echo
  echo "   The style guide at http://localhost:3000/style works either way."
  echo
fi

npm run dev
