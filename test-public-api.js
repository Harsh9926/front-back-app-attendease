#!/usr/bin/env node

const https = require('https');
const http = require('http');

const PUBLIC_API_BASE = 'http://13.202.210.74:5000/api';

// Test endpoints from the final API documentation
const testEndpoints = [
  { path: '/auth/login', method: 'POST', description: '🔑 Login endpoint' },
  { path: '/auth/logout', method: 'POST', description: '🔑 Logout endpoint' },
  { path: '/cities', method: 'GET', description: '📍 Cities endpoint' },
  { path: '/app/supervisor/wards', method: 'POST', description: '👨‍💼 Supervisor Wards endpoint' },
  { path: '/app/attendance/employee', method: 'POST', description: '👷 Employee Attendance endpoint' },
  { path: '/app/attendance/employee', method: 'PUT', description: '👷 Punch In/Out endpoint' },
  { path: '/attendance', method: 'POST', description: '👷 Attendance Record endpoint' },
  { path: '/app/attendance/employee/detail', method: 'GET', description: '👷 Employee Detail endpoint' },
  { path: '/app/attendance/employee/image', method: 'GET', description: '👷 Fetch Image endpoint' },
  { path: '/app/attendance/employee/face-attendance', method: 'POST', description: '🖼 Face Attendance endpoint' },
  { path: '/app/attendance/employee/faceRoutes/store-face', method: 'POST', description: '🖼 Store Face endpoint' }
];

console.log('🔍 Testing AttendEase Public API Endpoints...\n');
console.log(`📡 Base URL: ${PUBLIC_API_BASE}\n`);

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, PUBLIC_API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET', // Use GET for testing connectivity
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AttendEase-Mobile-Test'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          status: res.statusCode,
          success: res.statusCode < 500, // Consider 4xx as success (endpoint exists)
          response: data.substring(0, 200)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing endpoint connectivity...\n');

  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);

    if (result.success) {
      console.log(`✅ ${endpoint.path} (${endpoint.method}) - ${endpoint.description}`);
      console.log(`   Status: ${result.status}`);
      if (result.response) {
        console.log(`   Response: ${result.response.replace(/\n/g, ' ')}`);
      }
    } else {
      console.log(`❌ ${endpoint.path} (${endpoint.method}) - ${endpoint.description}`);
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  console.log('📱 Mobile App Configuration:');
  console.log(`   API Base URL: ${PUBLIC_API_BASE}`);
  console.log(`   Environment: Production (Public API)`);
  console.log(`   Local Backend: Not required`);
  console.log('');
  console.log('🚀 Ready to start mobile app with: ./start-mobile-only.sh');
}

runTests().catch(console.error);
