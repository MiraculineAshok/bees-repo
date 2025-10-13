#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function runCleanup() {
  try {
    console.log('🔄 Starting database cleanup...');
    
    // 1. Check current state
    console.log('\n📊 Current state:');
    const currentSessions = await pool.query(`
      SELECT id, name, description, status, created_by, created_at
      FROM interview_sessions 
      WHERE name = 'Face to Face for St Mary''s School'
      ORDER BY created_at
    `);
    console.log(`Found ${currentSessions.rows.length} duplicate sessions:`);
    currentSessions.rows.forEach(session => {
      console.log(`  - ID: ${session.id}, Created: ${session.created_at}, Created_by: ${session.created_by}`);
    });
    
    // 2. Clean up duplicate sessions
    if (currentSessions.rows.length > 1) {
      console.log('\n🧹 Cleaning up duplicate sessions...');
      const result = await pool.query(`
        WITH duplicates AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
          FROM interview_sessions 
          WHERE name = 'Face to Face for St Mary''s School'
        )
        DELETE FROM interview_sessions 
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        )
      `);
      console.log(`✅ Removed ${result.rowCount} duplicate sessions`);
    } else {
      console.log('✅ No duplicate sessions found');
    }
    
    // 3. Fix NULL created_by values
    console.log('\n🔧 Fixing NULL created_by values...');
    const updateResult = await pool.query(`
      UPDATE interview_sessions 
      SET created_by = NULL 
      WHERE created_by IS NOT NULL 
        AND created_by NOT IN (SELECT id FROM authorized_users)
    `);
    console.log(`✅ Updated ${updateResult.rowCount} sessions with invalid created_by`);
    
    // 4. Ensure proper status
    console.log('\n📝 Ensuring proper status...');
    const statusResult = await pool.query(`
      UPDATE interview_sessions 
      SET status = 'active' 
      WHERE status IS NULL OR status = ''
    `);
    console.log(`✅ Updated ${statusResult.rowCount} sessions with NULL/empty status`);
    
    // 5. Clean up orphaned records
    console.log('\n🧹 Cleaning up orphaned records...');
    
    const orphanedPanelists = await pool.query(`
      DELETE FROM session_panelists 
      WHERE session_id NOT IN (SELECT id FROM interview_sessions)
    `);
    console.log(`✅ Removed ${orphanedPanelists.rowCount} orphaned session_panelists`);
    
    const orphanedQuestions = await pool.query(`
      DELETE FROM interview_questions 
      WHERE interview_id NOT IN (SELECT id FROM interviews)
    `);
    console.log(`✅ Removed ${orphanedQuestions.rowCount} orphaned interview_questions`);
    
    const orphanedInterviews = await pool.query(`
      DELETE FROM interviews 
      WHERE student_id NOT IN (SELECT id FROM students)
         OR interviewer_id NOT IN (SELECT id FROM authorized_users)
         OR session_id NOT IN (SELECT id FROM interview_sessions)
    `);
    console.log(`✅ Removed ${orphanedInterviews.rowCount} orphaned interviews`);
    
    // 6. Final verification
    console.log('\n📊 Final state:');
    const finalSessions = await pool.query(`
      SELECT id, name, description, status, created_by, created_at
      FROM interview_sessions 
      WHERE name = 'Face to Face for St Mary''s School'
      ORDER BY created_at
    `);
    console.log(`Remaining sessions: ${finalSessions.rows.length}`);
    finalSessions.rows.forEach(session => {
      console.log(`  - ID: ${session.id}, Created: ${session.created_at}, Created_by: ${session.created_by}`);
    });
    
    // 7. Show table counts
    console.log('\n📈 Table counts:');
    const counts = await pool.query(`
      SELECT 'interview_sessions' as table_name, COUNT(*) as count FROM interview_sessions
      UNION ALL
      SELECT 'session_panelists', COUNT(*) FROM session_panelists
      UNION ALL
      SELECT 'interviews', COUNT(*) FROM interviews
      UNION ALL
      SELECT 'interview_questions', COUNT(*) FROM interview_questions
      UNION ALL
      SELECT 'students', COUNT(*) FROM students
      UNION ALL
      SELECT 'authorized_users', COUNT(*) FROM authorized_users
    `);
    counts.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.count}`);
    });
    
    console.log('\n✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
runCleanup();
