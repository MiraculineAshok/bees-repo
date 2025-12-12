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
        meeting_url VARCHAR(500),
        meeting_recording_url VARCHAR(500),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add meeting_url column to interviews table (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE interviews 
        ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(500)
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Meeting URL column migration:', error.message);
    }
    
    // Add meeting_recording_url column to interviews table (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE interviews 
        ADD COLUMN IF NOT EXISTS meeting_recording_url VARCHAR(500)
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Meeting Recording URL column migration:', error.message);
    }
    
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
    
    // Create schools table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL UNIQUE,
        short_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL UNIQUE,
        short_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create examination_mode table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS examination_mode (
        id SERIAL PRIMARY KEY,
        mode VARCHAR(255) NOT NULL UNIQUE,
        short_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add short_code columns if they don't exist (for existing tables)
    try {
      await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS short_code VARCHAR(10)`);
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS short_code VARCHAR(10)`);
      await pool.query(`ALTER TABLE examination_mode ADD COLUMN IF NOT EXISTS short_code VARCHAR(10)`);
    } catch (error) {
      console.log('Short code columns migration:', error.message);
    }
    
    // Insert/Update schools with short codes
    await pool.query(`
      INSERT INTO schools (school_name, short_code) VALUES
        ('School of Business', 'SB'),
        ('School of Tech', 'ST'),
        ('School of Design', 'SD')
      ON CONFLICT (school_name) DO UPDATE SET short_code = EXCLUDED.short_code
    `);
    
    // Insert/Update locations with short codes
    await pool.query(`
      INSERT INTO locations (location_name, short_code) VALUES
        ('Tenkasi', 'TK'),
        ('Tharuvai', 'TH'),
        ('Chennai', 'CH'),
        ('Kumbakonam', 'KK')
      ON CONFLICT (location_name) DO UPDATE SET short_code = EXCLUDED.short_code
    `);
    
    // Insert/Update examination modes with short codes
    await pool.query(`
      INSERT INTO examination_mode (mode, short_code) VALUES
        ('Regular', 'RE'),
        ('Examless', 'EX'),
        ('Zestober', 'ZE'),
        ('Family Outreach', 'FO'),
        ('Outreach', 'OR')
      ON CONFLICT (mode) DO UPDATE SET short_code = EXCLUDED.short_code
    `);
    
    // Add foreign key columns to interview_sessions table
    try {
      await pool.query(`
        ALTER TABLE interview_sessions 
        ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL
      `);
    } catch (error) {
      console.log('School ID column migration:', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE interview_sessions 
        ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL
      `);
    } catch (error) {
      console.log('Location ID column migration:', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE interview_sessions 
        ADD COLUMN IF NOT EXISTS examination_mode_id INTEGER REFERENCES examination_mode(id) ON DELETE SET NULL
      `);
    } catch (error) {
      console.log('Examination mode ID column migration:', error.message);
    }
    
    // Create indexes for foreign keys
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_school_id ON interview_sessions(school_id)
      `);
    } catch (error) {
      console.log('School ID index migration:', error.message);
    }
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_location_id ON interview_sessions(location_id)
      `);
    } catch (error) {
      console.log('Location ID index migration:', error.message);
    }
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_examination_mode_id ON interview_sessions(examination_mode_id)
      `);
    } catch (error) {
      console.log('Examination mode ID index migration:', error.message);
    }
    
    // Add session_id column to students table for mapping to interview sessions
    try {
      await pool.query(`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Session ID column migration:', error.message);
    }
    
    // Create index for session_id if it doesn't exist
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_students_session_id ON students(session_id)
      `);
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Session ID index migration:', error.message);
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
    
    // Create student_sessions junction table for many-to-many relationship
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_sessions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        session_status VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, session_id)
      )
    `);
    
    // Add session_status column if it doesn't exist (for existing tables)
    try {
      await pool.query(`
        ALTER TABLE student_sessions 
        ADD COLUMN IF NOT EXISTS session_status VARCHAR(50) DEFAULT NULL
      `);
    } catch (error) {
      console.log('Session status column migration:', error.message);
    }
    
    // Create indexes for student_sessions
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id)
      `);
    } catch (error) {
      console.log('Student sessions student_id index:', error.message);
    }
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_student_sessions_session_id ON student_sessions(session_id)
      `);
    } catch (error) {
      console.log('Student sessions session_id index:', error.message);
    }
    
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
    
    // Add lock columns to interview_questions table
    try {
      await pool.query(`
        ALTER TABLE interview_questions 
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_locked column to interview_questions');
    } catch (error) {
      console.log('⚠️ is_locked column migration:', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE interview_questions 
        ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added locked_by column to interview_questions');
    } catch (error) {
      console.log('⚠️ locked_by column migration:', error.message);
    }
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_interview_questions_locked_by ON interview_questions(locked_by)
      `);
      console.log('✅ Added index for locked_by column');
    } catch (error) {
      console.log('⚠️ locked_by index migration:', error.message);
    }
    
    // Create email_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        body TEXT NOT NULL,
        created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created email_templates table');
    
    // Create indexes for email_templates
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC)
      `);
    } catch (error) {
      console.log('⚠️ Email templates index migration:', error.message);
    }
    
    // Create sms_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created sms_templates table');
    
    // Create indexes for sms_templates
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_templates_created_by ON sms_templates(created_by)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at DESC)
      `);
    } catch (error) {
      console.log('⚠️ SMS templates index migration:', error.message);
    }
    
    // Create email_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        from_email VARCHAR(255) NOT NULL,
        to_emails TEXT NOT NULL,
        cc_emails TEXT,
        bcc_emails TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'drafted',
        error_message TEXT,
        consolidation_id INTEGER REFERENCES interview_consolidation(id) ON DELETE SET NULL,
        sent_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created email_logs table');
    
    // Create indexes for email_logs
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_consolidation_id ON email_logs(consolidation_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC)
      `);
    } catch (error) {
      console.log('⚠️ Email logs index migration:', error.message);
    }
    
    // Create indexes for sms_logs
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_by ON sms_logs(sent_by)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_consolidation_id ON sms_logs(consolidation_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON sms_logs(message_type)
      `);
    } catch (error) {
      console.log('⚠️ SMS logs index migration:', error.message);
    }
    
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
