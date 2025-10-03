const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...');
    
    // Test if backend is running
    try {
      const healthCheck = await axios.get('http://localhost:5003/api/health');
      console.log('✅ Backend is running');
    } catch (error) {
      console.log('❌ Backend is not running. Please start it first:');
      console.log('   cd AttendEaseBackend && PORT=5003 node app.js');
      return;
    }
    
    // Try to create admin user
    try {
      const createResponse = await axios.post('http://localhost:5003/api/auth/create-admin');
      console.log('👤 Admin creation response:', createResponse.data);
    } catch (error) {
      console.log('⚠️  Admin creation:', error.response?.data || error.message);
    }
    
    // Test admin login
    const loginData = {
      email: 'admin@attendease.com',
      password: 'admin123'
    };
    
    console.log('🔐 Testing login with:', loginData);
    
    const response = await axios.post('http://localhost:5003/api/auth/supervisor-login', loginData);
    
    console.log('✅ LOGIN SUCCESS!');
    console.log('Response:', response.data);
    
    if (response.data.user && response.data.user.role === 'admin') {
      console.log('🎉 Admin role confirmed! You can now login in the mobile app.');
    }
    
  } catch (error) {
    console.log('❌ LOGIN FAILED:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 This means the backend code is not updated yet.');
      console.log('Please restart the backend server:');
      console.log('1. Stop current backend (Ctrl+C)');
      console.log('2. cd AttendEaseBackend');
      console.log('3. PORT=5003 node app.js');
    }
  }
}

testAdminLogin();
