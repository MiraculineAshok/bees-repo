const pool = require('../db/pool');
const mockDataService = require('./mockDataService');

// Cloudinary configuration (optional)
let cloudinary = null;
try {
  cloudinary = require('../config/cloudinary');
} catch (error) {
  console.log('⚠️ Cloudinary config not found in interviewService, using local storage fallback');
}

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(photoUrl) {
    try {
        if (!cloudinary) {
            console.log('⚠️ Cloudinary not available in interviewService, skipping deletion');
            return;
        }
        
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

    static async createInterview(studentId, interviewerId, sessionId = null, verdict = null) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.createInterview(studentId, interviewerId, sessionId, verdict);
        }

        try {
            const result = await pool.query(
                `INSERT INTO interviews (student_id, interviewer_id, session_id, status, verdict) 
                 VALUES ($1, $2, $3, 'in_progress', $4) 
                 RETURNING *`,
                [studentId, interviewerId, sessionId, verdict]
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
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, au.name as interviewer_name, au.email as interviewer_email
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN authorized_users au ON i.interviewer_id = au.id
                 WHERE i.id = $1`,
                [interviewId]
            );
            
            if (!result.rows[0]) {
                throw new Error('Interview not found');
            }
            
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
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, au.name as interviewer_name, au.email as interviewer_email
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN authorized_users au ON i.interviewer_id = au.id
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
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, au.name as interviewer_name, au.email as interviewer_email, 
                        iss.name as session_name
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN authorized_users au ON i.interviewer_id = au.id
                 LEFT JOIN interview_sessions iss ON i.session_id = iss.id
                 WHERE i.student_id = $1
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

    static async updateCorrectness(questionId, isCorrect) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateCorrectness(questionId, isCorrect);
        }

        try {
            console.log('🔄 Updating question correctness:', { questionId, isCorrect });
            
            const result = await pool.query(
                `UPDATE interview_questions 
                 SET is_correct = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [isCorrect, questionId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Question not found');
            }
            
            console.log('✅ Database correctness update successful, rows affected:', result.rowCount);
            console.log('📊 Updated question data:', result.rows[0]);
            
            // Update question bank statistics
            await this.updateQuestionBankStatistics(questionId, isCorrect);
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating correctness:', error);
            throw error;
        }
    }

    static async updateQuestionBankStatistics(questionId, isCorrect) {
        if (!(await this.isDatabaseAvailable())) {
            return; // Skip for mock data
        }

        try {
            console.log('🔄 Updating question bank statistics:', { questionId, isCorrect });
            
            // Get the question text to find the corresponding question bank entry
            const questionResult = await pool.query(
                `SELECT question_text FROM interview_questions WHERE id = $1`,
                [questionId]
            );
            
            if (questionResult.rows.length === 0) {
                console.log('⚠️ Question not found for statistics update');
                return;
            }
            
            const questionText = questionResult.rows[0].question_text;
            
            // Update the question bank statistics
            if (isCorrect) {
                await pool.query(
                    `UPDATE question_bank 
                     SET times_answered_correctly = times_answered_correctly + 1,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE question = $1`,
                    [questionText]
                );
            } else {
                await pool.query(
                    `UPDATE question_bank 
                     SET times_answered_incorrectly = times_answered_incorrectly + 1,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE question = $1`,
                    [questionText]
                );
            }
            
            console.log('✅ Question bank statistics updated successfully');
        } catch (error) {
            console.error('❌ Error updating question bank statistics:', error);
            // Don't throw error as this is not critical
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

    static async deleteQuestion(questionId) {
        console.log('🗑️ InterviewService.deleteQuestion called with questionId:', questionId);
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.deleteQuestion(questionId);
        }

        try {
            // First, get the question to check if it has an associated image
            const questionResult = await pool.query(
                'SELECT answer_photo_url FROM interview_questions WHERE id = $1',
                [questionId]
            );

            if (questionResult.rows.length === 0) {
                throw new Error('Question not found');
            }

            const question = questionResult.rows[0];

            // Delete the question from the database
            const result = await pool.query(
                'DELETE FROM interview_questions WHERE id = $1',
                [questionId]
            );

            if (result.rowCount === 0) {
                throw new Error('Question not found');
            }

            // If there was an associated image, try to delete it from Cloudinary
            if (question.answer_photo_url && question.answer_photo_url.includes('cloudinary.com')) {
                try {
                    await deleteCloudinaryImage(question.answer_photo_url);
                    console.log('✅ Successfully deleted image from Cloudinary');
                } catch (error) {
                    console.warn('⚠️ Error deleting image from Cloudinary (continuing anyway):', error.message);
                    // Don't throw the error - we want to continue even if Cloudinary deletion fails
                }
            }

            console.log('✅ Question deleted successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting question:', error);
            throw error;
        }
    }

    static async updateDuration(interviewId, durationSeconds, endTime) {
        console.log('⏱️ InterviewService.updateDuration called with:', { interviewId, durationSeconds, endTime });
        
        if (!(await this.isDatabaseAvailable())) {
            console.log('📝 Database unavailable, using mock data');
            return mockDataService.updateDuration(interviewId, durationSeconds, endTime);
        }

        try {
            const result = await pool.query(
                'UPDATE interviews SET duration_seconds = $1, end_time = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [durationSeconds, endTime, interviewId]
            );

            if (result.rows.length === 0) {
                throw new Error('Interview not found');
            }

            console.log('✅ Interview duration updated successfully');
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating interview duration:', error);
            throw error;
        }
    }

    static async updateInterview(id, updateData) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateInterview(id, updateData);
        }

        try {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            
            const query = `UPDATE interviews SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, [id, ...values]);
            
            if (result.rows.length === 0) {
                throw new Error('Interview not found');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error updating interview:', error);
            throw error;
        }
    }

    static async bulkUpdateInterviews(updates) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.bulkUpdateInterviews(updates);
        }

        try {
            const results = [];
            
            for (const update of updates) {
                const { id, data } = update;
                const result = await this.updateInterview(id, data);
                results.push(result);
            }
            
            return results;
        } catch (error) {
            console.error('Error bulk updating interviews:', error);
            throw error;
        }
    }
}

module.exports = InterviewService;
