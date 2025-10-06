#!/bin/bash

echo "🚀 Starting AttendEase Mobile App (Local API mode)..."

# Verify local backend connectivity (optional but helpful)
echo "🔍 Checking local backend at http://localhost:5003 ..."
curl -s http://localhost:5003/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ AttendEaseBackend is reachable on http://localhost:5003"
else
    echo "⚠️  Warning: AttendEaseBackend is not responding on http://localhost:5003"
    echo "   Start the backend first (./start-backend.sh) to use the mobile app against local APIs."
fi

echo ""
echo "📱 Starting mobile app..."
echo "🌐 Using API base URL from attendeaseApp/.env"
echo ""

cd attendeaseApp
npx expo start --clear

cleanup() {
    echo "🛑 Stopping mobile app..."
    exit 0
}

trap cleanup EXIT INT TERM
