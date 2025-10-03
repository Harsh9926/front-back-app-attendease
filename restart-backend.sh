#!/bin/bash

echo "🔄 Restarting backend server with admin support..."

# Kill any existing backend processes
pkill -f "node app.js" 2>/dev/null || echo "No existing backend process found"

# Wait a moment
sleep 2

# Start backend server
cd AttendEaseBackend
echo "🚀 Starting backend server on port 5003..."
PORT=5003 node app.js &

# Wait for server to start
sleep 3

# Create admin user
echo "👤 Creating admin user..."
curl -X POST http://localhost:5003/api/auth/create-admin \
  -H "Content-Type: application/json" \
  2>/dev/null || echo "Admin user creation attempted"

echo ""
echo "✅ Backend restarted with admin support!"
echo ""
echo "🔑 ADMIN LOGIN CREDENTIALS:"
echo "📧 Email: admin@attendease.com"
echo "🔐 Password: admin123"
echo ""
echo "📱 Now try logging in with these credentials in the mobile app!"
