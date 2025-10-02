const pool = require('../db/pool');
const mockDataService = require('./mockDataService');
const cloudinary = require('../config/cloudinary');

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(photoUrl) {
    try {
        if (!photoUrl || !photoUrl.includes('cloudinary.com')) {
            console.log('Skipping deletion - not a Cloudinary URL:', photoUrl);
            return; // Not a Cloudinary URL
        }
        
        // Extract public ID from URL
        const publicId = photoUrl.split('/').pop().split('.')[0];
        const fullPublicId = `interview-photos/${publicId}`;
        
        console.log(`🗑️ Attempting to delete from Cloudinary: ${fullPublicId}`);
        await cloudinary.uploader.destroy(fullPublicId);
        console.log(`✅ Deleted image from Cloudinary: ${fullPublicId}`);
    } catch (error) {
        console.warn('⚠️ Error deleting image from Cloudinary (continuing anyway):', error.message);
        // Don't throw the error - we want to continue even if Cloudinary deletion fails
    }
}

class InterviewService {
    static async isDatabaseAvailable() {
        try {
            await pool.query('SELECT 1');
            return true;
        } catch (error) {
            console.log('📝 Database unavailable, using mock data');
            return false;
        }
    }

    static async createInterview(studentId, interviewerId, verdict = null) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.createInterview(studentId, interviewerId, verdict);
        }

        try {
            const result = await pool.query(
                `INSERT INTO interviews (student_id, interviewer_id, status, verdict) 
                 VALUES ($1, $2, 'in_progress', $3) 
                 RETURNING *`,
                [studentId, interviewerId, verdict]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating interview:', error);
            throw error;
        }
    }

    static async getInterviewById(interviewId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getInterviewById(interviewId);
        }

        try {
            const result = await pool.query(
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, u.name as interviewer_name, u.email as interviewer_email
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN users u ON i.interviewer_id = u.id
                 WHERE i.id = $1`,
                [interviewId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error getting interview:', error);
            throw error;
        }
    }

    static async getInterviewByStudentId(studentId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getInterviewByStudentId(studentId);
        }

        try {
            const result = await pool.query(
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, u.name as interviewer_name, u.email as interviewer_email
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN users u ON i.interviewer_id = u.id
                 WHERE i.student_id = $1 AND i.status = 'in_progress'
                 ORDER BY i.created_at DESC
                 LIMIT 1`,
                [studentId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error getting interview by student:', error);
            throw error;
        }
    }

    static async getStudentInterviewHistory(studentId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getStudentInterviewHistory(studentId);
        }

        try {
            const result = await pool.query(
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, u.name as interviewer_name, u.email as interviewer_email
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN users u ON i.interviewer_id = u.id
                 WHERE i.student_id = $1 AND i.status = 'completed'
                 ORDER BY i.created_at DESC`,
                [studentId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting student interview history:', error);
            throw error;
        }
    }

    static async addQuestion(interviewId, questionText) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.addQuestion(interviewId, questionText);
        }

        try {
            // Get the next question order
            const orderResult = await pool.query(
                'SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM interview_questions WHERE interview_id = $1',
                [interviewId]
            );
            const nextOrder = orderResult.rows[0].next_order;

            const result = await pool.query(
                `INSERT INTO interview_questions (interview_id, question_text, question_order) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [interviewId, questionText, nextOrder]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error adding question:', error);
            throw error;
        }
    }

    static async updateAnswer(questionId, studentAnswer, answerPhotoUrl = null) {
        console.log('🔍 InterviewService.updateAnswer called with:', { questionId, studentAnswer, answerPhotoUrl });
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.updateAnswer(questionId, studentAnswer, answerPhotoUrl);
        }

        try {
            // If answerPhotoUrl is null, we need to delete the existing image
            if (answerPhotoUrl === null) {
                console.log('🗑️ answerPhotoUrl is null, checking for existing image to delete');
                // Get the current photo URL before updating
                const currentResult = await pool.query(
                    'SELECT answer_photo_url FROM interview_questions WHERE id = $1',
                    [questionId]
                );
                
                if (currentResult.rows.length > 0 && currentResult.rows[0].answer_photo_url) {
                    console.log('🗑️ Deleting existing image from Cloudinary:', currentResult.rows[0].answer_photo_url);
                    // Delete the image from Cloudinary
                    await deleteCloudinaryImage(currentResult.rows[0].answer_photo_url);
                }
            }

            console.log('💾 Updating database with:', { studentAnswer, answerPhotoUrl, questionId });
            const result = await pool.query(
                `UPDATE interview_questions 
                 SET student_answer = $1, answer_photo_url = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3 
                 RETURNING *`,
                [studentAnswer, answerPhotoUrl, questionId]
            );
            
            console.log('✅ Database update successful, rows affected:', result.rowCount);
            console.log('📊 Updated question data:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating answer:', error);
            throw error;
        }
    }

    static async getInterviewQuestions(interviewId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getInterviewQuestions(interviewId);
        }

        try {
            const result = await pool.query(
                `SELECT * FROM interview_questions 
                 WHERE interview_id = $1 
                 ORDER BY question_order ASC`,
                [interviewId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting interview questions:', error);
            throw error;
        }
    }

    static async updateInterviewNotes(interviewId, notes) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateInterviewNotes(interviewId, notes);
        }

        try {
            const result = await pool.query(
                `UPDATE interviews 
                 SET overall_notes = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [notes, interviewId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating interview notes:', error);
            throw error;
        }
    }

    static async completeInterview(interviewId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.completeInterview(interviewId);
        }

        try {
            const result = await pool.query(
                `UPDATE interviews 
                 SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 
                 RETURNING *`,
                [interviewId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error completing interview:', error);
            throw error;
        }
    }

    static async updateVerdict(interviewId, verdict) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateVerdict(interviewId, verdict);
        }

        try {
            const result = await pool.query(
                `UPDATE interviews 
                 SET verdict = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [verdict, interviewId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating verdict:', error);
            throw error;
        }
    }
}

module.exports = InterviewService;
