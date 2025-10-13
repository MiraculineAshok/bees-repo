const pool = require('./pool');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        zoho_user_id VARCHAR(255),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }
    
    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        zeta_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create authorized_users table for access control
    await pool.query(`
      CREATE TABLE IF NOT EXISTS authorized_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        is_superadmin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on email for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    
    // Create index on zoho_user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_zoho_id ON users(zoho_user_id)
    `);
    
    // Create indexes for students table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_email ON students(email)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_zeta_id ON students(zeta_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone)
    `);
    
    // Create indexes for authorized_users table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email)
    `);
    
    // Insert default authorized users
    await pool.query(`
      INSERT INTO authorized_users (email, name, role, is_superadmin) 
      VALUES 
        ('miraculine.j@zohocorp.com', 'Miraculine J', 'superadmin', TRUE),
        ('rajendran@zohocorp.com', 'Rajendran', 'admin', FALSE)
      ON CONFLICT (email) DO NOTHING
    `);
    
    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };
