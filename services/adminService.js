const pool = require('../db/pool');
const mockDataService = require('./mockDataService');

class AdminService {
    static async isDatabaseAvailable() {
        try {
            await pool.query('SELECT 1');
            return true;
        } catch (error) {
            console.log('Database not available:', error.message);
            return false;
        }
    }

    // Overview Statistics
    static async getOverviewStats() {
        console.log('📊 AdminService.getOverviewStats called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getOverviewStats();
        }

        try {
            const [interviewsRes, sessionsRes, questionsRes, studentsRes] = await Promise.all([
                pool.query('SELECT COUNT(*) as total FROM interviews'),
                pool.query('SELECT COUNT(*) as active FROM interview_sessions WHERE status = $1', ['active']),
                pool.query('SELECT COUNT(*) as total FROM question_bank'),
                pool.query('SELECT COUNT(*) as total FROM students')
            ]);

            return {
                totalInterviews: parseInt(interviewsRes.rows[0].total),
                activeSessions: parseInt(sessionsRes.rows[0].active),
                totalQuestions: parseInt(questionsRes.rows[0].total),
                totalStudents: parseInt(studentsRes.rows[0].total)
            };
        } catch (error) {
            console.error('❌ Error getting overview stats:', error);
            throw error;
        }
    }

    // Interviews Management
    static async getAllInterviews() {
        console.log('🎯 AdminService.getAllInterviews called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getAllInterviews();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    i.id,
                    i.interview_date,
                    i.status,
                    i.verdict,
                    i.duration_seconds,
                    i.created_at,
                    i.session_id,
                    CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    s.email as student_email,
                    s.zeta_id,
                    au.name as interviewer_name,
                    au.email as interviewer_email,
                    ins.name as session_name
                FROM interviews i
                LEFT JOIN students s ON i.student_id = s.id
                LEFT JOIN authorized_users au ON i.interviewer_id = au.id
                LEFT JOIN interview_sessions ins ON i.session_id = ins.id
                ORDER BY i.created_at DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all interviews:', error);
            throw error;
        }
    }

    static async getInterviewStats() {
        console.log('📊 AdminService.getInterviewStats called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getInterviewStats();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
                FROM interviews
            `);

            return {
                total: parseInt(result.rows[0].total),
                completed: parseInt(result.rows[0].completed),
                in_progress: parseInt(result.rows[0].in_progress),
                cancelled: parseInt(result.rows[0].cancelled)
            };
        } catch (error) {
            console.error('❌ Error getting interview stats:', error);
            throw error;
        }
    }

    // Questions Analytics
    static async getQuestionsAnalytics() {
        console.log('❓ AdminService.getQuestionsAnalytics called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getQuestionsAnalytics();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    qb.id,
                    qb.question,
                    qb.category,
                    COALESCE(qb.times_asked, 0) as times_asked,
                    COALESCE(qb.times_answered_correctly, 0) as times_answered_correctly,
                    COALESCE(qb.times_answered_incorrectly, 0) as times_answered_incorrectly,
                    COUNT(iq.id) as total_answers,
                    COUNT(CASE WHEN iq.is_correct = true THEN 1 END) as correct_answers,
                    COUNT(CASE WHEN iq.is_correct = false THEN 1 END) as incorrect_answers,
                    CASE 
                        WHEN COUNT(iq.id) > 0 
                        THEN ROUND((COUNT(CASE WHEN iq.is_correct = true THEN 1 END)::DECIMAL / COUNT(iq.id)) * 100, 2)
                        ELSE 0 
                    END as success_rate
                FROM question_bank qb
                LEFT JOIN interview_questions iq ON qb.question = iq.question_text
                GROUP BY qb.id, qb.question, qb.category, qb.times_asked, qb.times_answered_correctly, qb.times_answered_incorrectly
                ORDER BY qb.times_asked DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting questions analytics:', error);
            throw error;
        }
    }

    static async getQuestionsStats() {
        console.log('📊 AdminService.getQuestionsStats called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getQuestionsStats();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_questions,
                    COUNT(CASE WHEN category = 'Math Aptitude' THEN 1 END) as math_questions,
                    COUNT(CASE WHEN category = 'Generic HR Questions' THEN 1 END) as hr_questions,
                    COUNT(CASE WHEN category = 'English' THEN 1 END) as english_questions,
                    COUNT(CASE WHEN category = 'Technical' THEN 1 END) as technical_questions
                FROM question_bank
            `);

            return {
                total_questions: parseInt(result.rows[0].total_questions),
                math_questions: parseInt(result.rows[0].math_questions),
                hr_questions: parseInt(result.rows[0].hr_questions),
                english_questions: parseInt(result.rows[0].english_questions),
                technical_questions: parseInt(result.rows[0].technical_questions)
            };
        } catch (error) {
            console.error('❌ Error getting questions stats:', error);
            throw error;
        }
    }

    static async getQuestionDetails(questionId) {
        console.log('🔍 AdminService.getQuestionDetails called with questionId:', questionId);
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getQuestionDetails(questionId);
        }

        try {
            // Get question basic info
            const questionResult = await pool.query(`
                SELECT 
                    qb.id,
                    qb.question,
                    qb.category,
                    COALESCE(qb.times_asked, 0) as times_asked
                FROM question_bank qb
                WHERE qb.id = $1
            `, [questionId]);

            if (questionResult.rows.length === 0) {
                throw new Error('Question not found');
            }

            const question = questionResult.rows[0];

            // Get student answers for this question
            const answersResult = await pool.query(`
                SELECT 
                    s.first_name || ' ' || s.last_name as student_name,
                    s.zeta_id,
                    iq.student_answer as answer_text,
                    iq.created_at as answered_at
                FROM interview_questions iq
                JOIN interviews i ON iq.interview_id = i.id
                JOIN students s ON i.student_id = s.id
                WHERE iq.question_text = $1
                ORDER BY iq.created_at DESC
            `, [question.question]);

            return {
                ...question,
                total_answers: answersResult.rows.length,
                correct_answers: 0, // TODO: Implement correctness tracking
                success_rate: 0, // TODO: Calculate based on correctness
                student_answers: answersResult.rows
            };
        } catch (error) {
            console.error('❌ Error getting question details:', error);
            throw error;
        }
    }

    // Interview Sessions Management
    static async getAllSessions() {
        console.log('📅 AdminService.getAllSessions called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getAllSessions();
        }

        try {
            // Detect optional tables to avoid 500s in environments without them
            let panelistsTableExists = false;
            try {
                const reg = await pool.query("SELECT to_regclass('public.session_panelists') as reg");
                panelistsTableExists = !!reg.rows[0]?.reg;
            } catch (_) {
                panelistsTableExists = false;
            }

            const panelistsSelect = panelistsTableExists
                ? `COALESCE((SELECT STRING_AGG(au2.name, ', ')
                             FROM session_panelists sp
                             JOIN authorized_users au2 ON sp.user_id = au2.id
                             WHERE sp.session_id = ins.id), '') as panelist_names,`
                : `'' as panelist_names,`;

            const query = `
                SELECT 
                    ins.id,
                    ins.name,
                    ins.description,
                    ins.status,
                    ins.created_at,
                    au.name as created_by_name,
                    au.email as created_by_email,
                    ${panelistsSelect}
                    COUNT(i.id) as interview_count
                FROM interview_sessions ins
                LEFT JOIN authorized_users au ON ins.created_by = au.id
                LEFT JOIN interviews i ON ins.id = i.session_id
                GROUP BY ins.id, ins.name, ins.description, ins.status, ins.created_at, au.name, au.email
                ORDER BY ins.created_at DESC`;

            const result = await pool.query(query);

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all sessions:', error);
            throw error;
        }
    }

    static async createSession(sessionData) {
        console.log('➕ AdminService.createSession called with:', sessionData);
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.createSession(sessionData);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create the session
            const createdBy = sessionData.created_by || 1;
            const sessionResult = await client.query(`
                INSERT INTO interview_sessions (name, description, created_by)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [sessionData.name, sessionData.description, createdBy]);

            const session = sessionResult.rows[0];

            // Add panelists if provided (skip gracefully if table doesn't exist)
            if (sessionData.panelists && sessionData.panelists.length > 0) {
                try {
                    const reg = await client.query(`SELECT to_regclass('public.session_panelists') as reg`);
                    const hasTable = !!reg.rows[0]?.reg;
                    if (!hasTable) {
                        console.warn('⚠️ session_panelists table not found. Skipping panelist inserts.');
                    } else {
                        for (const panelist of sessionData.panelists) {
                            await client.query(`
                                INSERT INTO session_panelists (session_id, user_id)
                                VALUES ($1, $2)
                                ON CONFLICT (session_id, user_id) DO NOTHING
                            `, [session.id, panelist.id]);
                        }
                        console.log(`✅ Added ${sessionData.panelists.length} panelists to session`);
                    }
                } catch (panelErr) {
                    // If table truly doesn't exist or any error occurs, log and continue
                    if (panelErr.code === '42P01') {
                        console.warn('⚠️ session_panelists table missing, continuing without panelists');
                    } else {
                        console.warn('⚠️ Error adding panelists (continuing):', panelErr.message);
                    }
                }
            }

            await client.query('COMMIT');
            console.log('✅ Session created successfully');
            return session;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error creating session:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async updateSessionPanelists(sessionId, panelistIds) {
        if (!(await this.isDatabaseAvailable())) {
            // Mock: accept and return success
            return { success: true };
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Ensure table exists
            const reg = await client.query(`SELECT to_regclass('public.session_panelists') as reg`);
            if (!reg.rows[0]?.reg) {
                await client.query('COMMIT');
                return { success: true };
            }
            await client.query('DELETE FROM session_panelists WHERE session_id = $1', [sessionId]);
            for (const uid of panelistIds) {
                await client.query('INSERT INTO session_panelists (session_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sessionId, uid]);
            }
            await client.query('COMMIT');
            return { success: true };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async updateSession(sessionId, updateData) {
        console.log('✏️ AdminService.updateSession called with sessionId:', sessionId, 'updateData:', updateData);
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.updateSession(sessionId, updateData);
        }

        try {
            // Define allowed fields for sessions table
            const allowedFields = ['name', 'description', 'status'];
            
            // Filter out invalid fields
            const validUpdateData = {};
            Object.keys(updateData).forEach(field => {
                if (allowedFields.includes(field)) {
                    validUpdateData[field] = updateData[field];
                } else {
                    console.warn(`Field "${field}" is not allowed for session updates`);
                }
            });

            if (Object.keys(validUpdateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const fields = Object.keys(validUpdateData);
            const values = Object.values(validUpdateData);
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            
            const query = `UPDATE interview_sessions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, [sessionId, ...values]);
            
            if (result.rows.length === 0) {
                throw new Error('Session not found');
            }
            
            console.log('✅ Session updated successfully');
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating session:', error);
            throw error;
        }
    }

    static async deleteSession(sessionId) {
        console.log('🗑️ AdminService.deleteSession called with sessionId:', sessionId);
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.deleteSession(sessionId);
        }

        try {
            // Check if session has interviews
            const interviewsResult = await pool.query(
                'SELECT COUNT(*) as count FROM interviews WHERE session_id = $1',
                [sessionId]
            );

            if (parseInt(interviewsResult.rows[0].count) > 0) {
                throw new Error('Cannot delete session with existing interviews');
            }

            const result = await pool.query(
                'DELETE FROM interview_sessions WHERE id = $1',
                [sessionId]
            );

            if (result.rowCount === 0) {
                throw new Error('Session not found');
            }

            console.log('✅ Session deleted successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting session:', error);
            throw error;
        }
    }

    static async getSessionStats() {
        console.log('📊 AdminService.getSessionStats called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getSessionStats();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
                FROM interview_sessions
            `);

            return {
                total: parseInt(result.rows[0].total),
                active: parseInt(result.rows[0].active),
                completed: parseInt(result.rows[0].completed),
                cancelled: parseInt(result.rows[0].cancelled)
            };
        } catch (error) {
            console.error('❌ Error getting session stats:', error);
            throw error;
        }
    }

    // Students Management
    static async getAllStudents() {
        console.log('👥 AdminService.getAllStudents called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getAllStudents();
        }

        try {
            const result = await pool.query(`
                SELECT 
                    s.id,
                    CONCAT(s.first_name, ' ', s.last_name) as name,
                    s.email,
                    s.zeta_id,
                    s.phone,
                    COUNT(i.id) as interview_count
                FROM students s
                LEFT JOIN interviews i ON s.id = i.student_id
                GROUP BY s.id, s.first_name, s.last_name, s.email, s.zeta_id, s.phone
                ORDER BY s.created_at DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all students:', error);
            throw error;
        }
    }

    static async getStudentStats() {
        console.log('📊 AdminService.getStudentStats called');
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getStudentStats();
        }

        try {
            const result = await pool.query('SELECT COUNT(*) as total FROM students');
            return {
                total: parseInt(result.rows[0].total)
            };
        } catch (error) {
            console.error('❌ Error getting student stats:', error);
            throw error;
        }
    }
}

module.exports = AdminService;
