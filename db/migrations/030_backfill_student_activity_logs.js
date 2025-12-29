// Backfill student_activity_logs from existing records
// Run this script to populate activity logs for historical data

const pool = require('../pool');

async function backfillStudentActivityLogs() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting backfill of student activity logs...');
    
    await client.query('BEGIN');
    
    // 1. Log round_started activities from interviews
    console.log('📝 Logging round_started activities...');
    const roundStartedResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, created_at)
      SELECT 
          i.student_id,
          i.session_id,
          'round_started' AS activity_type,
          'Round ' || round_num || ' started' AS activity_description,
          jsonb_build_object('round_number', round_num, 'interview_id', i.id) AS metadata,
          i.created_at AS created_at
      FROM (
          SELECT 
              i.*,
              ROW_NUMBER() OVER (
                  PARTITION BY i.student_id, i.session_id 
                  ORDER BY i.created_at ASC
              ) AS round_num
          FROM interviews i
          WHERE i.status IN ('in_progress', 'completed', 'cancelled')
      ) i
      WHERE NOT EXISTS (
          SELECT 1 FROM student_activity_logs sal
          WHERE sal.student_id = i.student_id
            AND sal.session_id = i.session_id
            AND sal.activity_type = 'round_started'
            AND sal.metadata->>'interview_id' = i.id::text
      )
    `);
    console.log(`✅ Created ${roundStartedResult.rowCount} round_started logs`);
    
    // 2. Log interview_completed activities
    console.log('📝 Logging interview_completed activities...');
    const completedResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, created_at)
      SELECT 
          i.student_id,
          i.session_id,
          'interview_completed' AS activity_type,
          CASE 
              WHEN i.verdict IS NOT NULL AND i.verdict != '' THEN 'Interview completed - Verdict: ' || i.verdict
              ELSE 'Interview completed'
          END AS activity_description,
          jsonb_build_object('interview_id', i.id, 'verdict', i.verdict, 'status', i.status) AS metadata,
          COALESCE(i.updated_at, i.created_at) AS created_at
      FROM interviews i
      WHERE i.status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM student_activity_logs sal
            WHERE sal.student_id = i.student_id
              AND sal.session_id = i.session_id
              AND sal.activity_type = 'interview_completed'
              AND sal.metadata->>'interview_id' = i.id::text
        )
    `);
    console.log(`✅ Created ${completedResult.rowCount} interview_completed logs`);
    
    // 3. Log interview_cancelled activities
    console.log('📝 Logging interview_cancelled activities...');
    const cancelledResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, created_at)
      SELECT 
          i.student_id,
          i.session_id,
          'interview_cancelled' AS activity_type,
          'Interview cancelled' AS activity_description,
          jsonb_build_object('interview_id', i.id) AS metadata,
          COALESCE(i.updated_at, i.created_at) AS created_at
      FROM interviews i
      WHERE i.status = 'cancelled'
        AND NOT EXISTS (
            SELECT 1 FROM student_activity_logs sal
            WHERE sal.student_id = i.student_id
              AND sal.session_id = i.session_id
              AND sal.activity_type = 'interview_cancelled'
              AND sal.metadata->>'interview_id' = i.id::text
        )
    `);
    console.log(`✅ Created ${cancelledResult.rowCount} interview_cancelled logs`);
    
    // 4. Log verdict_given activities
    console.log('📝 Logging verdict_given activities...');
    const verdictResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, created_at)
      SELECT DISTINCT ON (i.student_id, i.session_id, i.verdict)
          i.student_id,
          i.session_id,
          'verdict_given' AS activity_type,
          'Verdict given: ' || i.verdict AS activity_description,
          jsonb_build_object('interview_id', i.id, 'verdict', i.verdict) AS metadata,
          COALESCE(i.updated_at, i.created_at) AS created_at
      FROM interviews i
      WHERE i.verdict IS NOT NULL AND i.verdict != ''
        AND NOT EXISTS (
            SELECT 1 FROM student_activity_logs sal
            WHERE sal.student_id = i.student_id
              AND sal.session_id = i.session_id
              AND sal.activity_type = 'verdict_given'
              AND sal.metadata->>'verdict' = i.verdict
        )
      ORDER BY i.student_id, i.session_id, i.verdict, i.created_at DESC
    `);
    console.log(`✅ Created ${verdictResult.rowCount} verdict_given logs`);
    
    // 5. Log email_sent activities
    console.log('📝 Logging email_sent activities...');
    const emailResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, performed_by, created_at)
      SELECT 
          ic.student_id,
          ic.session_id,
          'email_sent' AS activity_type,
          'Email sent: ' || COALESCE(el.subject, 'No subject') AS activity_description,
          jsonb_build_object('email_log_id', el.id, 'to_emails', el.to_emails, 'subject', el.subject) AS metadata,
          el.sent_by AS performed_by,
          COALESCE(el.sent_at, el.created_at) AS created_at
      FROM email_logs el
      JOIN interview_consolidation ic ON el.consolidation_id = ic.id
      WHERE el.status = 'sent'
        AND NOT EXISTS (
            SELECT 1 FROM student_activity_logs sal
            WHERE sal.student_id = ic.student_id
              AND sal.session_id = ic.session_id
              AND sal.activity_type = 'email_sent'
              AND sal.metadata->>'email_log_id' = el.id::text
        )
    `);
    console.log(`✅ Created ${emailResult.rowCount} email_sent logs`);
    
    // 6. Log status_updated activities
    console.log('📝 Logging status_updated activities...');
    const statusResult = await client.query(`
      INSERT INTO student_activity_logs (student_id, session_id, activity_type, activity_description, metadata, created_at)
      SELECT 
          ic.student_id,
          ic.session_id,
          'status_updated' AS activity_type,
          'Status updated to: ' || ic.status AS activity_description,
          jsonb_build_object('status', ic.status) AS metadata,
          COALESCE(ic.updated_at, ic.last_interview_at, ic.created_at) AS created_at
      FROM interview_consolidation ic
      WHERE ic.status IS NOT NULL AND ic.status != ''
        AND NOT EXISTS (
            SELECT 1 FROM student_activity_logs sal
            WHERE sal.student_id = ic.student_id
              AND sal.session_id = ic.session_id
              AND sal.activity_type = 'status_updated'
              AND sal.metadata->>'status' = ic.status
        )
    `);
    console.log(`✅ Created ${statusResult.rowCount} status_updated logs`);
    
    await client.query('COMMIT');
    
    // Summary
    const summaryResult = await client.query(`
      SELECT 
          activity_type,
          COUNT(*) AS count
      FROM student_activity_logs
      GROUP BY activity_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Activity Log Summary:');
    console.log('========================');
    summaryResult.rows.forEach(row => {
      console.log(`  ${row.activity_type}: ${row.count}`);
    });
    
    const totalResult = await client.query('SELECT COUNT(*) as total FROM student_activity_logs');
    console.log(`\n✅ Total activity logs: ${totalResult.rows[0].total}`);
    console.log('✅ Backfill completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  backfillStudentActivityLogs()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillStudentActivityLogs };

