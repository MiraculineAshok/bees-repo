const pool = require('../db/pool');
const mockDataService = require('./mockDataService');

class InterviewerService {
    static async isDatabaseAvailable() {
        try {
            await pool.query('SELECT 1');
            return true;
        } catch (error) {
            console.log('Database not available:', error.message);
            return false;
        }
    }

    static async getMyInterviews(interviewerId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getMyInterviews(interviewerId);
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
                    CONCAT(s.first_name, ' ', s.last_name) as student_name,
                    s.email as student_email,
                    s.zeta_id,
                    ins.name as session_name
                FROM interviews i
                LEFT JOIN students s ON i.student_id = s.id
                LEFT JOIN interview_sessions ins ON i.session_id = ins.id
                WHERE i.interviewer_id = $1
                ORDER BY i.created_at DESC
            `, [interviewerId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting my interviews:', error);
            throw error;
        }
    }

    static async getMyStats(interviewerId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getMyStats(interviewerId);
        }

        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
                FROM interviews 
                WHERE interviewer_id = $1
            `, [interviewerId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error getting my stats:', error);
            throw error;
        }
    }

    static async getFavorites(interviewerId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getFavorites(interviewerId);
        }

        try {
            const result = await pool.query(`
                SELECT 
                    f.id,
                    f.question_id,
                    f.created_at,
                    q.question,
                    q.category
                FROM interviewer_favorites f
                JOIN question_bank q ON f.question_id = q.id
                WHERE f.interviewer_id = $1
                ORDER BY f.created_at DESC
            `, [interviewerId]);
            
            return result.rows;
        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    }

    static async addFavorite(interviewerId, questionId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.addFavorite(interviewerId, questionId);
        }

        try {
            const result = await pool.query(`
                INSERT INTO interviewer_favorites (interviewer_id, question_id)
                VALUES ($1, $2)
                ON CONFLICT (interviewer_id, question_id) DO NOTHING
                RETURNING *
            `, [interviewerId, questionId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error adding favorite:', error);
            throw error;
        }
    }

    static async removeFavorite(interviewerId, questionId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.removeFavorite(interviewerId, questionId);
        }

        try {
            const result = await pool.query(`
                DELETE FROM interviewer_favorites 
                WHERE interviewer_id = $1 AND question_id = $2
                RETURNING *
            `, [interviewerId, questionId]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error removing favorite:', error);
            throw error;
        }
    }

    static async getFavoriteQuestionIds(interviewerId) {
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.getFavoriteQuestionIds(interviewerId);
        }

        try {
            const result = await pool.query(`
                SELECT question_id 
                FROM interviewer_favorites 
                WHERE interviewer_id = $1
            `, [interviewerId]);
            
            return result.rows.map(row => row.question_id);
        } catch (error) {
            console.error('Error getting favorite question IDs:', error);
            throw error;
        }
    }
}

module.exports = InterviewerService;
