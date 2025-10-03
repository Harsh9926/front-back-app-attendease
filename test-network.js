#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');

// Test different IP addresses and ports
const testUrls = [
  'http://127.0.0.1:5003',
  'http://localhost:5003',
  'http://10.205.83.56:5003',
  'http://192.168.29.88:5003'
];

console.log('🔍 Testing network connectivity for mobile app...\n');

// Function to test HTTP connectivity
function testUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          success: true,
          status: res.statusCode,
          response: data.substring(0, 100)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

// Function to get network interfaces
function getNetworkInfo() {
  return new Promise((resolve) => {
    exec('ifconfig | grep "inet " | grep -v 127.0.0.1', (error, stdout) => {
      if (error) {
        resolve('Could not get network info');
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Main test function
async function runTests() {
  // Show network info
  console.log('📡 Network interfaces:');
  const networkInfo = await getNetworkInfo();
  console.log(networkInfo);
  console.log('');

  // Test each URL
  console.log('🧪 Testing API endpoints:');
  for (const url of testUrls) {
    const result = await testUrl(url);
    if (result.success) {
      console.log(`✅ ${url} - Status: ${result.status}`);
      console.log(`   Response: ${result.response}`);
    } else {
      console.log(`❌ ${url} - Error: ${result.error}`);
    }
  }

  console.log('\n📱 Recommended configuration:');
  console.log('For mobile app development, use the IP address that matches your Metro bundler.');
  console.log('Current Metro bundler is running on: 10.205.83.56:8082');
  console.log('So the API should be accessible at: http://10.205.83.56:5003');
}

runTests().catch(console.error);
