#!/bin/bash

cd AttendEaseBackend || exit 1

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

PORT=${PORT:-5003}
export PORT

echo "🚀 Starting AttendEaseBackend on port $PORT"
node app.js
