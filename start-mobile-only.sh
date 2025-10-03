#!/bin/bash

echo "🚀 Starting AttendEase Mobile App (Public API Mode)..."

# Test public API connectivity
echo "🔍 Testing public API connection..."
curl -s http://13.202.210.74:5000/api > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Public API is accessible at http://13.202.210.74:5000"
else
    echo "⚠️  Warning: Public API may not be accessible. Check your internet connection."
    echo "   The app will still start but may not function properly."
fi

echo ""
echo "📱 Starting mobile app..."
echo "🌐 Using public API: http://13.202.210.74:5000"
echo ""

# Start mobile app
cd attendeaseApp
npx expo start --clear

# Cleanup function
cleanup() {
    echo "🛑 Stopping mobile app..."
    exit 0
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM
