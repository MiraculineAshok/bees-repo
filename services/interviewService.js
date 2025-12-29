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
            
            // Update session status in student_sessions table
            if (sessionId) {
                await this.updateSessionStatusOnStart(studentId, sessionId);
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error creating interview:', error);
            throw error;
        }
    }
    
    // Helper function to get current round number for a student-session
    static async getCurrentRoundNumber(studentId, sessionId) {
        try {
            // Count completed interviews for this student-session combination
            const result = await pool.query(
                `SELECT COUNT(*) as completed_count 
                 FROM interviews 
                 WHERE student_id = $1 AND session_id = $2 AND status = 'completed'`,
                [studentId, sessionId]
            );
            
            const completedCount = parseInt(result.rows[0]?.completed_count || 0);
            // Next round is completed count + 1
            return completedCount + 1;
        } catch (error) {
            console.error('Error getting current round number:', error);
            // Default to round 1 if error
            return 1;
        }
    }
    
    // Update session status when interview starts
    static async updateSessionStatusOnStart(studentId, sessionId) {
        try {
            // Check current status - don't update if it's a final status
            const currentStatusResult = await pool.query(
                `SELECT session_status 
                 FROM student_sessions 
                 WHERE student_id = $1 AND session_id = $2`,
                [studentId, sessionId]
            );
            
            const currentStatus = currentStatusResult.rows[0]?.session_status;
            const finalStatuses = ['selected', 'rejected', 'waitlisted'];
            
            // Check if current status is a final status (case-insensitive)
            if (currentStatus) {
                const currentStatusLower = currentStatus.toLowerCase();
                if (finalStatuses.some(final => currentStatusLower === final)) {
                    console.log(`⚠️ Skipping status update - current status "${currentStatus}" is a final status for student ${studentId}, session ${sessionId}`);
                    return;
                }
            }
            
            const roundNumber = await this.getCurrentRoundNumber(studentId, sessionId);
            const status = `round ${roundNumber} started`;
            
            await pool.query(
                `UPDATE student_sessions 
                 SET session_status = $1 
                 WHERE student_id = $2 AND session_id = $3`,
                [status, studentId, sessionId]
            );
            
            // Log round started activity
            try {
                await pool.query(
                    `INSERT INTO student_activity_logs 
                     (student_id, session_id, activity_type, activity_description, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        studentId,
                        sessionId,
                        'round_started',
                        `Round ${roundNumber} started`,
                        JSON.stringify({ round_number: roundNumber })
                    ]
                );
            } catch (logError) {
                console.error('Error logging round started activity:', logError);
                // Don't throw - logging failures shouldn't break the main flow
            }
            
            console.log(`✅ Updated session status to "${status}" for student ${studentId}, session ${sessionId}`);
        } catch (error) {
            console.error('Error updating session status on start:', error);
            // Don't throw - this is not critical
        }
    }
    
    // Update session status when interview ends
    static async updateSessionStatusOnEnd(studentId, sessionId) {
        try {
            // Check current status - don't update if it's a final status
            const currentStatusResult = await pool.query(
                `SELECT session_status 
                 FROM student_sessions 
                 WHERE student_id = $1 AND session_id = $2`,
                [studentId, sessionId]
            );
            
            const currentStatus = currentStatusResult.rows[0]?.session_status;
            const finalStatuses = ['selected', 'rejected', 'waitlisted'];
            
            // Check if current status is a final status (case-insensitive)
            if (currentStatus) {
                const currentStatusLower = currentStatus.toLowerCase();
                if (finalStatuses.some(final => currentStatusLower === final)) {
                    console.log(`⚠️ Skipping status update - current status "${currentStatus}" is a final status for student ${studentId}, session ${sessionId}`);
                    return;
                }
            }
            
            // Count completed interviews BEFORE updating (this gives us the round number we're ending)
            const result = await pool.query(
                `SELECT COUNT(*) as completed_count 
                 FROM interviews 
                 WHERE student_id = $1 AND session_id = $2 AND status = 'completed'`,
                [studentId, sessionId]
            );
            
            const completedCount = parseInt(result.rows[0]?.completed_count || 0);
            // The round we're ending is completedCount + 1
            // (e.g., if 0 completed, we're ending round 1; if 1 completed, we're ending round 2)
            const roundNumber = completedCount + 1;
            const status = `round ${roundNumber} ended`;
            
            await pool.query(
                `UPDATE student_sessions 
                 SET session_status = $1 
                 WHERE student_id = $2 AND session_id = $3`,
                [status, studentId, sessionId]
            );
            
            console.log(`✅ Updated session status to "${status}" for student ${studentId}, session ${sessionId}`);
        } catch (error) {
            console.error('Error updating session status on end:', error);
            // Don't throw - this is not critical
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

    static async getInterviewByStudentId(studentId, currentInterviewerId = null) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getInterviewByStudentId(studentId);
        }

        try {
            const result = await pool.query(
                `SELECT i.*, s.first_name, s.last_name, s.zeta_id, au.name as interviewer_name, au.email as interviewer_email,
                        iss.is_panel
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 JOIN authorized_users au ON i.interviewer_id = au.id
                 LEFT JOIN interview_sessions iss ON i.session_id = iss.id
                 WHERE i.student_id = $1 AND i.status = 'in_progress'
                 ORDER BY i.created_at DESC
                 LIMIT 1`,
                [studentId]
            );
            
            const interview = result.rows[0];
            
            // If there's an active interview and we have a current interviewer ID
            if (interview && currentInterviewerId) {
                // Check if the current interviewer is the one conducting this interview
                if (interview.interviewer_id !== currentInterviewerId) {
                    // Check if this is a panel interview
                    const isPanel = interview.is_panel === true;
                    
                    if (!isPanel) {
                        // For regular interviews, prevent parallel interviews
                        throw new Error(`Student is already being interviewed by ${interview.interviewer_name} (${interview.interviewer_email}). Please choose a different student.`);
                    }
                    // For panel interviews, allow multiple interviewers - return null to indicate new interview should be created
                    return null;
                }
            }
            
            return interview;
        } catch (error) {
            console.error('Error getting interview by student:', error);
            throw error;
        }
    }

    static async getStudentInterviewHistory(studentId, excludeInterviewId = null) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.getStudentInterviewHistory(studentId);
        }

        try {
            // Ensure studentId is an integer
            const studentIdInt = parseInt(studentId);
            if (isNaN(studentIdInt)) {
                console.error('❌ Invalid studentId:', studentId);
                return [];
            }

            let query = `
                SELECT i.*, 
                       s.first_name, 
                       s.last_name, 
                       s.zeta_id, 
                       au.name as interviewer_name, 
                       au.email as interviewer_email, 
                       iss.name as session_name
                 FROM interviews i
                 JOIN students s ON i.student_id = s.id
                 LEFT JOIN authorized_users au ON i.interviewer_id = au.id
                 LEFT JOIN interview_sessions iss ON i.session_id = iss.id
                 WHERE i.student_id = $1`;
            
            const params = [studentIdInt];
            
            // Exclude current interview if provided
            if (excludeInterviewId) {
                const excludeIdInt = parseInt(excludeInterviewId);
                if (!isNaN(excludeIdInt)) {
                    query += ` AND i.id != $2`;
                    params.push(excludeIdInt);
                }
            }
            
            query += ` ORDER BY i.created_at DESC`;
            
            console.log('🔍 Getting student interview history:', { 
                studentId, 
                studentIdInt, 
                excludeInterviewId, 
                query, 
                params 
            });
            
            let result;
            try {
                result = await pool.query(query, params);
            } catch (queryError) {
                console.error('❌ Database query error:', queryError);
                console.error('❌ Query:', query);
                console.error('❌ Params:', params);
                throw queryError;
            }
            
            const rows = result.rows || [];
            console.log('📊 Student interview history result:', { 
                count: rows.length, 
                studentId: studentIdInt,
                rows: rows.slice(0, 5).map(r => ({ 
                    id: r.id, 
                    student_id: r.student_id, 
                    status: r.status, 
                    created_at: r.created_at,
                    interviewer_name: r.interviewer_name 
                }))
            });
            
            return rows;
        } catch (error) {
            console.error('❌ Error getting student interview history:', error);
            console.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    static async addQuestion(interviewId, questionText, questionRichContent = null) {
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

            // Try to insert with rich content first
            try {
                const result = await pool.query(
                    `INSERT INTO interview_questions (interview_id, question_text, question_rich_content, question_order) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING *`,
                    [interviewId, questionText, questionRichContent, nextOrder]
                );
                // Best-effort: increment times_asked in question_bank for matching question
                try {
                    await pool.query(
                        `UPDATE question_bank 
                         SET times_asked = COALESCE(times_asked, 0) + 1, updated_at = CURRENT_TIMESTAMP
                         WHERE LOWER(question) = LOWER($1)`,
                        [questionText]
                    );
                } catch (e) {
                    console.warn('⚠️ Could not increment times_asked for question_bank:', e.message);
                }
                return result.rows[0];
            } catch (richContentError) {
                // If column doesn't exist, fall back to just question_text
                if (richContentError.code === '42703') { // undefined_column error
                    console.warn('⚠️ question_rich_content column does not exist, falling back to question_text only');
                    const result = await pool.query(
                        `INSERT INTO interview_questions (interview_id, question_text, question_order) 
                         VALUES ($1, $2, $3) 
                         RETURNING *`,
                        [interviewId, questionText, nextOrder]
                    );
                    // Best-effort: increment times_asked in question_bank
                    try {
                        await pool.query(
                            `UPDATE question_bank 
                             SET times_asked = COALESCE(times_asked, 0) + 1, updated_at = CURRENT_TIMESTAMP
                             WHERE LOWER(question) = LOWER($1)`,
                            [questionText]
                        );
                    } catch (e) {
                        console.warn('⚠️ Could not increment times_asked for question_bank:', e.message);
                    }
                    return result.rows[0];
                }
                throw richContentError;
            }
        } catch (error) {
            console.error('Error adding question:', error);
            console.error('Error code:', error.code);
            console.error('Error detail:', error.detail);
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

    // New: Update question score (1-10 scale)
    static async updateScore(questionId, correctnessScore) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateScore(questionId, correctnessScore);
        }

        try {
            // Validate score - ensure it's a valid number (0 is valid!)
            const score = Number(correctnessScore);
            if (isNaN(score)) {
                throw new Error('Invalid score value: must be a number');
            }
            
            console.log('🔄 Updating question score:', { questionId, score, originalValue: correctnessScore });
            
            // Try with new column first, fallback if it doesn't exist
            try {
                const result = await pool.query(
                    `UPDATE interview_questions 
                     SET correctness_score = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2 
                     RETURNING *`,
                    [score, questionId]
                );
                
                if (result.rows.length === 0) {
                    throw new Error('Question not found');
                }
                
                console.log('✅ Database score update successful, rows affected:', result.rowCount);
                console.log('📊 Updated question data:', result.rows[0]);
                
                // Update question bank statistics with new score (pass the validated number)
                await this.updateQuestionBankScore(questionId, score);
                
                return result.rows[0];
            } catch (columnError) {
                // If correctness_score column doesn't exist, fall back to is_correct (legacy)
                if (columnError.code === '42703') {
                    console.warn('⚠️  correctness_score column not found, falling back to is_correct (legacy)');
                    const isCorrect = score >= 6; // 6+ is considered correct
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
                    
                    await this.updateQuestionBankStatistics(questionId, isCorrect);
                    return result.rows[0];
                }
                throw columnError;
            }
        } catch (error) {
            console.error('❌ Error updating score:', error);
            throw error;
        }
    }

    // Legacy: Keep for backward compatibility
    static async updateCorrectness(questionId, isCorrect) {
        // Convert boolean to score and use new method
        const correctnessScore = isCorrect ? 8 : 3;
        return this.updateScore(questionId, correctnessScore);
    }

    static async lockQuestion(questionId, interviewerId) {
        if (!(await this.isDatabaseAvailable())) {
            throw new Error('Database unavailable');
        }

        try {
            const result = await pool.query(
                `UPDATE interview_questions 
                 SET is_locked = TRUE, locked_by = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [interviewerId, questionId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Question not found');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error locking question:', error);
            throw error;
        }
    }

    static async unlockQuestion(questionId) {
        if (!(await this.isDatabaseAvailable())) {
            throw new Error('Database unavailable');
        }

        try {
            const result = await pool.query(
                `UPDATE interview_questions 
                 SET is_locked = FALSE, locked_by = NULL, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 
                 RETURNING *`,
                [questionId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Question not found');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error unlocking question:', error);
            throw error;
        }
    }

    static async updateQuestionText(questionId, questionText) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateQuestionText(questionId, questionText);
        }

        try {
            console.log('🔄 Updating question text:', { questionId, questionText });
            
            const result = await pool.query(
                `UPDATE interview_questions 
                 SET question_text = $1, question_rich_content = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [questionText, questionId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Question not found');
            }
            
            console.log('✅ Question text updated successfully');
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating question text:', error);
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

    // New: Update question bank with score (replaces correct/incorrect counters)
    static async updateQuestionBankScore(questionId, score) {
        if (!(await this.isDatabaseAvailable())) {
            return; // Skip for mock data
        }

        try {
            // Validate score is a number (including 0)
            const validScore = Number(score);
            if (isNaN(validScore)) {
                console.warn('⚠️ Invalid score for question bank update:', score);
                return;
            }
            
            console.log('🔄 Updating question bank score:', { questionId, score: validScore, originalScore: score });
            
            // Get the question text to find the corresponding question bank entry
            const questionResult = await pool.query(
                `SELECT question_text FROM interview_questions WHERE id = $1`,
                [questionId]
            );
            
            if (questionResult.rows.length === 0) {
                console.log('⚠️ Question not found for score update');
                return;
            }
            
            const questionText = questionResult.rows[0].question_text;
            
            // Try to update with new score-based columns
            try {
                // First, check if times_asked needs to be incremented
                // This happens when a question is scored for the first time in an interview
                const checkResult = await pool.query(
                    `SELECT id, times_asked, total_score FROM question_bank WHERE question = $1`,
                    [questionText]
                );
                
                if (checkResult.rows.length > 0) {
                    const currentData = checkResult.rows[0];
                    console.log('📊 Current question_bank data:', currentData);
                    console.log('📊 Adding score to total:', validScore);
                    
                    // Update the question bank with the new score
                    // Calculate average_score properly: (total_score + new_score) / times_asked
                    const updateResult = await pool.query(
                        `UPDATE question_bank 
                         SET total_score = total_score + $1,
                             average_score = CASE 
                                 WHEN times_asked > 0 THEN ROUND((total_score + $1)::DECIMAL / times_asked, 2)
                                 ELSE 0 
                             END,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE question = $2
                         RETURNING id, question, times_asked, total_score, average_score`,
                        [validScore, questionText]
                    );
                    
                    console.log('✅ Question bank score updated successfully:', updateResult.rows[0]);
                } else {
                    console.warn('⚠️  Question not found in question_bank:', questionText.substring(0, 50));
                }
                
                console.log('✅ Question bank score update completed');
            } catch (columnError) {
                console.error('❌ Column error in question bank update:', columnError);
                // If new columns don't exist, fall back to old method
                if (columnError.code === '42703') {
                    console.warn('⚠️  Score columns not found, falling back to correct/incorrect counters');
                    const isCorrect = validScore >= 6;
                    await this.updateQuestionBankStatistics(questionId, isCorrect);
                } else {
                    throw columnError;
                }
            }
        } catch (error) {
            console.error('❌ Error updating question bank score:', error);
            console.error('❌ Error details:', { message: error.message, stack: error.stack });
            // Don't throw error as this is not critical - but log extensively for debugging
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

    static async updateInterviewRecordingUrl(interviewId, recordingUrl) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.updateInterviewRecordingUrl(interviewId, recordingUrl);
        }

        try {
            const result = await pool.query(
                `UPDATE interviews 
                 SET meeting_url = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [recordingUrl, interviewId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating interview recording URL:', error);
            throw error;
        }
    }

    static async completeInterview(interviewId) {
        if (!(await this.isDatabaseAvailable())) {
            return mockDataService.completeInterview(interviewId);
        }

        try {
            // Get interview details before updating
            const interviewResult = await pool.query(
                `SELECT student_id, session_id FROM interviews WHERE id = $1`,
                [interviewId]
            );
            
            if (interviewResult.rows.length === 0) {
                throw new Error('Interview not found');
            }
            
            const { student_id, session_id } = interviewResult.rows[0];
            
            // Get interview details for logging
            const interviewDetails = await pool.query(
                `SELECT verdict FROM interviews WHERE id = $1`,
                [interviewId]
            );
            const verdict = interviewDetails.rows[0]?.verdict;
            
            // Update interview status
            const result = await pool.query(
                `UPDATE interviews 
                 SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 
                 RETURNING *`,
                [interviewId]
            );
            
            // Log interview completed activity
            try {
                const activityDescription = verdict 
                    ? `Interview completed - Verdict: ${verdict}`
                    : 'Interview completed';
                await pool.query(
                    `INSERT INTO student_activity_logs 
                     (student_id, session_id, activity_type, activity_description, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        student_id,
                        session_id,
                        'interview_completed',
                        activityDescription,
                        JSON.stringify({ interview_id: interviewId, verdict: verdict || null })
                    ]
                );
            } catch (logError) {
                console.error('Error logging interview completed activity:', logError);
                // Don't throw - logging failures shouldn't break the main flow
            }
            
            // Update session status in student_sessions table
            if (session_id) {
                await this.updateSessionStatusOnEnd(student_id, session_id);
            }
            
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
            // Get interview details before updating
            const interviewResult = await pool.query(
                `SELECT student_id, session_id, verdict as old_verdict FROM interviews WHERE id = $1`,
                [interviewId]
            );
            
            if (interviewResult.rows.length === 0) {
                throw new Error('Interview not found');
            }
            
            const { student_id, session_id, old_verdict } = interviewResult.rows[0];
            
            const result = await pool.query(
                `UPDATE interviews 
                 SET verdict = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 
                 RETURNING *`,
                [verdict, interviewId]
            );
            
            // Log verdict given activity if verdict changed
            if (verdict && verdict !== old_verdict) {
                try {
                    await pool.query(
                        `INSERT INTO student_activity_logs 
                         (student_id, session_id, activity_type, activity_description, metadata)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            student_id,
                            session_id,
                            'verdict_given',
                            `Verdict given: ${verdict}`,
                            JSON.stringify({ interview_id: interviewId, verdict: verdict })
                        ]
                    );
                } catch (logError) {
                    console.error('Error logging verdict given activity:', logError);
                    // Don't throw - logging failures shouldn't break the main flow
                }
            }
            
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
            // First, get the question text and any associated image
            const questionResult = await pool.query(
                'SELECT question_text, answer_photo_url FROM interview_questions WHERE id = $1',
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

            // Best-effort: decrement times_asked in question_bank for matching question
            try {
                if (question.question_text) {
                    await pool.query(
                        `UPDATE question_bank 
                         SET times_asked = GREATEST(COALESCE(times_asked, 0) - 1, 0), updated_at = CURRENT_TIMESTAMP
                         WHERE LOWER(question) = LOWER($1)`,
                        [question.question_text]
                    );
                }
            } catch (e) {
                console.warn('⚠️ Could not decrement times_asked for question_bank:', e.message);
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
            // Define allowed fields for interviews table
            const allowedFields = ['verdict', 'status', 'overall_notes', 'interviewer_id', 'student_id', 'session_id', 'meeting_url'];
            
            // Filter out invalid fields
            const validUpdateData = {};
            Object.keys(updateData).forEach(field => {
                if (allowedFields.includes(field)) {
                    validUpdateData[field] = updateData[field];
                } else {
                    console.warn(`Field "${field}" is not allowed for interview updates`);
                }
            });

            if (Object.keys(validUpdateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const fields = Object.keys(validUpdateData);
            const values = Object.values(validUpdateData);
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
