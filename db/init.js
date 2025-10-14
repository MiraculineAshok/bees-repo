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
        status VARCHAR(20) DEFAULT 'active',
        created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
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
    
    // Insert sample questions (after all columns are added)
    await pool.query(`
      INSERT INTO question_bank (question, category, times_asked) 
      VALUES 
        ('What is your greatest strength?', 'General', 0),
        ('Tell me about a challenging project you worked on.', 'General', 0),
        ('How do you handle stress and pressure?', 'General', 0),
        ('What is your experience with JavaScript?', 'Technical', 0),
        ('Explain the concept of closures in JavaScript.', 'Technical', 0),
        ('What is the difference between let, const, and var?', 'Technical', 0),
        ('How do you approach debugging a complex issue?', 'Technical', 0),
        ('Describe a time when you had to work with a difficult team member.', 'Behavioral', 0),
        ('How do you prioritize tasks when you have multiple deadlines?', 'Behavioral', 0),
        ('Tell me about a time you failed and what you learned from it.', 'Behavioral', 0),
        ('What is your approach to learning new technologies?', 'Behavioral', 0),
        ('Can you describe your experience with database design?', 'Technical', 0),
        ('How do you ensure code quality in your projects?', 'Technical', 0),
        ('What are your career goals for the next 5 years?', 'General', 0),
        ('How do you stay updated with industry trends?', 'General', 0)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Sample questions inserted');
    
    // Note: Sample interview session creation removed to prevent automatic duplicates
    // Sessions should be created manually through the admin interface
    
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
