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
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) NOT NULL,
        address TEXT,
        zeta_id VARCHAR(255) UNIQUE,
        school VARCHAR(255),
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Migrate existing students table: make email and zeta_id nullable (optional)
    try {
      await pool.query(`
        ALTER TABLE students 
        ALTER COLUMN email DROP NOT NULL
      `);
    } catch (error) {
      // Column might already be nullable, ignore error
      console.log('Email column migration:', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE students 
        ALTER COLUMN zeta_id DROP NOT NULL
      `);
    } catch (error) {
      // Column might already be nullable, ignore error
      console.log('Zeta ID column migration:', error.message);
    }
    
    // Ensure phone is NOT NULL (required)
    try {
      await pool.query(`
        ALTER TABLE students 
        ALTER COLUMN phone SET NOT NULL
      `);
    } catch (error) {
      // Column might already be NOT NULL, ignore error
      console.log('Phone column migration:', error.message);
    }
    
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
    
    // Create question_bank table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_bank (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        times_asked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create interviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interviews (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        interviewer_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
        session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL,
        interview_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'in_progress',
        verdict VARCHAR(50),
        overall_notes TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create interview_questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        id SERIAL PRIMARY KEY,
        interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        student_answer TEXT,
        answer_photo_url VARCHAR(500),
        question_order INTEGER DEFAULT 1,
        correct_status BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create interview_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        is_panel BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add is_panel column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE interview_sessions 
        ADD COLUMN IF NOT EXISTS is_panel BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }
    
    // Create session_panelists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_panelists (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      )
    `);
    
    // Create interviewer_favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interviewer_favorites (
        id SERIAL PRIMARY KEY,
        interviewer_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(interviewer_id, question_id)
      )
    `);
    
    // Fix created_by column constraint in interview_sessions table
    try {
      await pool.query(`
        ALTER TABLE interview_sessions 
        ALTER COLUMN created_by DROP NOT NULL
      `);
      console.log('✅ Fixed created_by column constraint');
    } catch (error) {
      console.log('⚠️ created_by column constraint may already be correct:', error.message);
    }

    // Add missing columns to existing table if they don't exist
    try {
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS school VARCHAR(255)`);
      await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
      await pool.query(`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
      console.log('✅ Ensured school/location columns exist');
    } catch (error) {
      console.log('⚠️ Could not add school/location columns (may already exist):', error.message);
    }
    try {
      await pool.query(`
        ALTER TABLE question_bank 
        ADD COLUMN IF NOT EXISTS times_answered_correctly INTEGER DEFAULT 0
      `);
      console.log('✅ Added times_answered_correctly column');
    } catch (error) {
      console.log('⚠️ times_answered_correctly column might already exist:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE question_bank 
        ADD COLUMN IF NOT EXISTS times_answered_incorrectly INTEGER DEFAULT 0
      `);
      console.log('✅ Added times_answered_incorrectly column');
    } catch (error) {
      console.log('⚠️ times_answered_incorrectly column might already exist:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE question_bank 
        ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_favorite column');
    } catch (error) {
      console.log('⚠️ is_favorite column might already exist:', error.message);
    }
    
    // Removed: sample questions insertion (prevent re-seeding on restarts)
    
    // Note: Sample interview session creation removed to prevent automatic duplicates
    // Sessions should be created manually through the admin interface
    
    // Fix correctness_score constraint to allow 0-10 (not just 1-10)
    try {
      // Drop old constraint if it exists
      await pool.query(`
        ALTER TABLE interview_questions 
        DROP CONSTRAINT IF EXISTS interview_questions_correctness_score_check;
      `);
      console.log('✅ Dropped old correctness_score constraint');
    } catch (error) {
      console.log('⚠️ Old constraint might not exist:', error.message);
    }
    
    try {
      // Add new constraint allowing 0-10
      await pool.query(`
        ALTER TABLE interview_questions 
        ADD CONSTRAINT interview_questions_correctness_score_check 
        CHECK (correctness_score IS NULL OR (correctness_score >= 0 AND correctness_score <= 10));
      `);
      console.log('✅ Added new correctness_score constraint (0-10)');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Correctness_score constraint already exists');
      } else {
        console.log('⚠️ Error adding constraint:', error.message);
      }
    }
    
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
    
    // Create indexes for question_bank table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_question_bank_times_asked ON question_bank(times_asked)
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
