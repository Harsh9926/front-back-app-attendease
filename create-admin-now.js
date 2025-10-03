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

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE role = 'admin' OR email = 'admin@attendease.com' LIMIT 1"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists!');
      console.log('\n🔑 ADMIN LOGIN CREDENTIALS:');
      console.log('📧 Email: admin@attendease.com');
      console.log('🔐 Password: admin123');
      return;
    }

    // Create admin user
    const adminData = {
      name: "System Administrator",
      emp_code: "ADMIN001",
      email: "admin@attendease.com",
      phone: "9876543210",
      role: "admin",
      password: "admin123"
    };

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Insert admin user
    console.log('💾 Creating admin user in database...');
    const result = await pool.query(
      `INSERT INTO users (name, emp_code, email, phone, role, password_hash, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING user_id, name, email, emp_code, role`,
      [adminData.name, adminData.emp_code, adminData.email, adminData.phone, adminData.role, hashedPassword]
    );

    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('\n🔑 ADMIN LOGIN CREDENTIALS:');
    console.log('📧 Email: admin@attendease.com');
    console.log('🔐 Password: admin123');
    
    console.log('\n👤 Admin Details:');
    console.log('🆔 ID:', result.rows[0].user_id);
    console.log('👨‍💼 Name:', result.rows[0].name);
    console.log('🏷️ Employee Code:', result.rows[0].emp_code);
    console.log('🎭 Role:', result.rows[0].role);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === '23505') {
      console.log('\n⚠️  Admin user already exists with these credentials:');
      console.log('📧 Email: admin@attendease.com');
      console.log('🔐 Password: admin123');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Database connection failed. Please ensure PostgreSQL is running.');
    }
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser();
