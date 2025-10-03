-- Create admin user directly in database
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO users (name, emp_code, email, phone, role, password_hash, created_at)
VALUES (
    'System Administrator',
    'ADMIN001',
    'admin@attendease.com',
    '9876543210',
    'admin',
    '$2a$10$rOvHPnV8.Ub8Ub8Ub8Ub8.rOvHPnV8.Ub8Ub8Ub8Ub8.rOvHPnV8.Ub8Ub8Ub8Ub8.',
    NOW()
)
ON CONFLICT (email) DO NOTHING;