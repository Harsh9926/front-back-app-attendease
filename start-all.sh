#!/bin/bash

set -e

ROOT_DIR=$(pwd)
BACKEND_DIR="$ROOT_DIR/AttendEaseBackend"
APP_DIR="$ROOT_DIR/attendeaseApp"

echo "🚀 Starting AttendEase backend and mobile app..."

declare BACKEND_PID

start_backend() {
  cd "$BACKEND_DIR" || exit 1

  if [ -f .env ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
  fi

  PORT=${PORT:-5003}
  HOST=${HOST:-0.0.0.0}
  export PORT HOST

  echo "📡 Starting backend server on ${HOST}:${PORT} ..."
  node app.js &
  BACKEND_PID=$!
  cd "$ROOT_DIR" || exit 1
}

stop_backend() {
  if [ -n "$BACKEND_PID" ]; then
    echo "🛑 Stopping backend (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap stop_backend EXIT INT TERM

start_backend

sleep 4

PORT=${PORT:-5003}
if curl -fsS "http://localhost:${PORT}/" > /dev/null; then
  echo "✅ Backend is responding on http://localhost:${PORT}"
else
  echo "❌ Backend failed to respond on http://localhost:${PORT}"
  exit 1
fi

cd "$APP_DIR" || exit 1

echo "📱 Starting mobile app..."
echo "🌐 Using API base URL from attendeaseApp/.env"

npx expo start --clear
