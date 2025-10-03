const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'attendease',
  password: 'password',
  port: 5432,
});

async function createAdminAndTest() {
  try {
    console.log('🔧 Fixing admin login issue...\n');
    
    // First, delete any existing admin user to avoid conflicts
    await pool.query("DELETE FROM users WHERE email = 'admin@attendease.com' OR role = 'admin'");
    console.log('🗑️  Cleaned up existing admin users');
    
    // Create admin user with proper password hash
    const adminPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    console.log('🔐 Creating admin user with hashed password...');
    
    const result = await pool.query(
      `INSERT INTO users (name, emp_code, email, phone, role, password_hash, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING user_id, name, email, emp_code, role`,
      ['System Administrator', 'ADMIN001', 'admin@attendease.com', '9876543210', 'admin', hashedPassword]
    );

    console.log('✅ Admin user created successfully!');
    console.log('👤 Admin Details:', result.rows[0]);
    
    // Test password verification
    console.log('\n🧪 Testing password verification...');
    const testUser = await pool.query("SELECT * FROM users WHERE email = 'admin@attendease.com'");
    const isPasswordValid = await bcrypt.compare(adminPassword, testUser.rows[0].password_hash);
    
    console.log('🔍 Password verification:', isPasswordValid ? '✅ VALID' : '❌ INVALID');
    
    console.log('\n🔑 ADMIN LOGIN CREDENTIALS:');
    console.log('📧 Email: admin@attendease.com');
    console.log('🔐 Password: admin123');
    
    console.log('\n📱 NEXT STEPS:');
    console.log('1. Restart your backend server');
    console.log('2. Try logging in with the credentials above');
    console.log('3. App should now show red admin interface');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminAndTest();
