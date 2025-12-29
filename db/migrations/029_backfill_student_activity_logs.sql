-- Backfill student_activity_logs from existing records
-- This script creates activity logs for historical data

-- 1. Log round_started activities from interviews
-- Calculate round numbers based on interview order per student-session
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
ON CONFLICT DO NOTHING;

-- 2. Log interview_completed activities from completed interviews
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
ON CONFLICT DO NOTHING;

-- 3. Log interview_cancelled activities from cancelled interviews
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
ON CONFLICT DO NOTHING;

-- 4. Log verdict_given activities from interviews with verdicts
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
ORDER BY i.student_id, i.session_id, i.verdict, i.created_at DESC
ON CONFLICT DO NOTHING;

-- 5. Log email_sent activities from email_logs
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
ON CONFLICT DO NOTHING;

-- 6. Log status_updated activities from consolidation status changes
-- Note: This is approximate as we don't have exact timestamps for status changes
-- We'll use the last_interview_at or updated_at as proxy
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
ON CONFLICT DO NOTHING;

-- Summary query to check what was created
SELECT 
    activity_type,
    COUNT(*) AS count
FROM student_activity_logs
GROUP BY activity_type
ORDER BY count DESC;

