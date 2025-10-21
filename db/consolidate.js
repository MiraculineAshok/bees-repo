/*
  Consolidation script
  - Creates table interview_consolidation (if not exists)
  - Aggregates per (student, session) the interviews, interviewers, verdicts
  - Computes a status (selected/rejected/waitlisted) based on verdicts
  - Upserts rows into consolidation table
*/

const pool = require('./pool');

function normalizeString(value) {
  return (value == null ? '' : String(value)).trim();
}

function computeStatus(verdicts) {
  if (!Array.isArray(verdicts) || verdicts.length === 0) return null;
  const norm = verdicts
    .filter(v => v != null && String(v).trim() !== '')
    .map(v => String(v).toLowerCase());
  if (norm.length === 0) return null;

  // Prefer last verdict if present
  const last = norm[norm.length - 1];
  const classify = (v) => {
    if (v.includes('selected')) return 'selected';
    if (v.includes('reject')) return 'rejected';
    if (v.includes('hold') || v.includes('maybe') || v.includes('wait')) return 'waitlisted';
    return null;
  };
  const byLast = classify(last);
  if (byLast) return byLast;

  // Fallback precedence across all verdicts
  if (norm.some(v => v.includes('selected'))) return 'selected';
  if (norm.some(v => v.includes('reject'))) return 'rejected';
  if (norm.some(v => v.includes('hold') || v.includes('maybe') || v.includes('wait'))) return 'waitlisted';
  return null;
}

async function refreshConsolidation() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating interview_consolidation table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_consolidation (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        session_id INTEGER,
        student_name TEXT,
        student_email TEXT,
        zeta_id TEXT,
        session_name TEXT,
        interview_ids INTEGER[],
        interviewer_ids INTEGER[],
        interviewer_names TEXT[],
        verdicts TEXT[],
        status TEXT,
        last_interview_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, session_id)
      );
      CREATE INDEX IF NOT EXISTS idx_interview_consolidation_student ON interview_consolidation(student_id);
      CREATE INDEX IF NOT EXISTS idx_interview_consolidation_session ON interview_consolidation(session_id);
    `);

    console.log('📊 Aggregating interviews per (student, session)...');
    const { rows } = await client.query(`
      SELECT 
        s.id AS student_id,
        CONCAT(s.first_name, ' ', s.last_name) AS student_name,
        s.email AS student_email,
        s.zeta_id AS zeta_id,
        i.session_id AS session_id,
        iss.name AS session_name,
        ARRAY_AGG(i.id ORDER BY i.created_at) AS interview_ids,
        ARRAY_AGG(i.interviewer_id ORDER BY i.created_at) AS interviewer_ids,
        ARRAY_AGG(au.name ORDER BY i.created_at) AS interviewer_names,
        ARRAY_REMOVE(ARRAY_AGG(i.verdict ORDER BY i.created_at), NULL) AS verdicts,
        MAX(i.created_at) AS last_interview_at
      FROM students s
      JOIN interviews i ON i.student_id = s.id
      LEFT JOIN authorized_users au ON au.id = i.interviewer_id
      LEFT JOIN interview_sessions iss ON iss.id = i.session_id
      GROUP BY s.id, s.first_name, s.last_name, s.email, s.zeta_id, i.session_id, iss.name
    `);

    console.log(`🔄 Upserting ${rows.length} consolidation rows...`);
    for (const r of rows) {
      const status = computeStatus(r.verdicts || []);
      await client.query(
        `INSERT INTO interview_consolidation (
           student_id, session_id, student_name, student_email, zeta_id, session_name,
           interview_ids, interviewer_ids, interviewer_names, verdicts, status, last_interview_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id, session_id)
         DO UPDATE SET 
           student_name = EXCLUDED.student_name,
           student_email = EXCLUDED.student_email,
           zeta_id = EXCLUDED.zeta_id,
           session_name = EXCLUDED.session_name,
           interview_ids = EXCLUDED.interview_ids,
           interviewer_ids = EXCLUDED.interviewer_ids,
           interviewer_names = EXCLUDED.interviewer_names,
           verdicts = EXCLUDED.verdicts,
           status = EXCLUDED.status,
           last_interview_at = EXCLUDED.last_interview_at,
           updated_at = CURRENT_TIMESTAMP
        `,
        [
          r.student_id,
          r.session_id,
          normalizeString(r.student_name),
          normalizeString(r.student_email),
          normalizeString(r.zeta_id),
          normalizeString(r.session_name),
          r.interview_ids || [],
          r.interviewer_ids || [],
          (r.interviewer_names || []).map(normalizeString),
          (r.verdicts || []).map(normalizeString),
          status,
          r.last_interview_at
        ]
      );
    }
    console.log('✅ Consolidation complete.');
  } catch (err) {
    console.error('❌ Consolidation failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Export the function for use in server
module.exports = { refreshConsolidation };

// Run if called directly
if (require.main === module) {
  refreshConsolidation()
    .then(() => {
      console.log('✅ Consolidation script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Consolidation script failed:', err);
      process.exit(1);
    });
}


