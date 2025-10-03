#!/bin/bash

echo "🚀 Starting AttendEase Backend and Mobile App..."

# Start backend in background
echo "📡 Starting backend server..."
cd AttendEaseBackend
PORT=5003 HOST=0.0.0.0 node app.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Test if backend is running
echo "🔍 Testing backend connection..."
curl -s http://localhost:5003 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is running on port 5003"
    echo "📡 Backend accessible at http://10.205.83.56:5003"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start mobile app
echo "📱 Starting mobile app..."
cd ../attendeaseApp
npx expo start --clear

# Cleanup function
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM
