const axios = require('axios');

const BASE_URL = 'http://localhost:5003';

// Test admin login and get token
async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login...');
    const response = await axios.post(`${BASE_URL}/api/auth/supervisor-login`, {
      email: 'admin@attendease.com',
      password: 'admin123'
    });
    
    if (response.data.success) {
      console.log('✅ Admin login successful');
      return response.data.token;
    } else {
      console.log('❌ Admin login failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Admin login error:', error.response?.data || error.message);
    return null;
  }
}

// Test admin endpoints
async function testAdminEndpoints(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/api/admin/dashboard/overview',
    '/api/admin/dashboard/today-stats',
    '/api/admin/analytics/weekly-trend',
    '/api/admin/supervisors',
    '/api/admin/employees',
    '/api/admin/settings/system'
  ];

  console.log('\n📊 Testing admin endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}...`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, { headers });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      console.log(`📄 Response:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
      console.log(`❌ ${endpoint} - Error:`, error.response?.status, error.response?.data || error.message);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Admin API Tests...\n');
  
  // Test login
  const token = await testAdminLogin();
  
  if (token) {
    // Test endpoints
    await testAdminEndpoints(token);
  }
  
  console.log('\n✨ Tests completed!');
}

// Run tests
runTests().catch(console.error);
