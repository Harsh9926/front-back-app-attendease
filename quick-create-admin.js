const axios = require('axios');

async function createAdmin() {
  try {
    console.log('🚀 Creating admin user...');
    
    const response = await axios.post('http://localhost:5003/api/auth/create-admin', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Response:', response.data);
    
    if (response.data.credentials) {
      console.log('\n🔑 Login Credentials:');
      console.log('Email:', response.data.credentials.email);
      console.log('Password:', response.data.credentials.password);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('⚠️  Response:', error.response.data);
      if (error.response.data.admin) {
        console.log('\n🔑 Existing Admin Credentials:');
        console.log('Email: admin@attendease.com');
        console.log('Password: admin123');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running!');
      console.log('Please start the backend first:');
      console.log('cd AttendEaseBackend && PORT=5003 node app.js');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

createAdmin();
