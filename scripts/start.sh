#!/bin/bash
# start.sh — starts the local dev server and opens the app in your browser
# Usage: bash scripts/start.sh
# Stop with Ctrl+C

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PORT=3000
URL="http://localhost:$PORT/pages/home.html"

echo ""
echo "📚 To Read or Not to Read"
echo "   Starting local server..."
echo "   Project: $PROJECT_DIR"
echo ""

# Check if something is already running on port 3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  Port $PORT is already in use. Stop the existing server first with Ctrl+C"
  echo "   Or find and kill it: lsof -i :$PORT"
  exit 1
fi

# Open the browser after a short delay (gives the server time to start)
sleep 1 && open "$URL" &

# Start the server
cd "$FRONTEND_DIR"
echo "✅ Server running at $URL"
echo "   Press Ctrl+C to stop"
echo ""
python3 -m http.server $PORT
