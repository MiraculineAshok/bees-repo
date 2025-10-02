const pool = require('../db/pool');

class QuestionBankService {
    // Get all questions from the question bank
    static async getAllQuestions() {
        try {
            if (!pool) {
                console.error('❌ Database pool is not available');
                return { success: false, error: 'Database connection not available' };
            }
            
            const query = `
                SELECT id, question, category, times_asked, created_at, updated_at
                FROM question_bank
                ORDER BY category, question
            `;
            const result = await pool.query(query);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('Error fetching all questions:', error);
            return { success: false, error: error.message };
        }
    }

    // Get questions by category
    static async getQuestionsByCategory(category) {
        try {
            const query = `
                SELECT id, question, category, times_asked, created_at, updated_at
                FROM question_bank
                WHERE category = $1
                ORDER BY times_asked DESC, question
            `;
            const result = await pool.query(query, [category]);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('Error fetching questions by category:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all categories
    static async getCategories() {
        try {
            if (!pool) {
                console.error('❌ Database pool is not available');
                return { success: false, error: 'Database connection not available' };
            }
            
            const query = `
                SELECT DISTINCT category, COUNT(*) as question_count
                FROM question_bank
                GROUP BY category
                ORDER BY category
            `;
            const result = await pool.query(query);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('Error fetching categories:', error);
            return { success: false, error: error.message };
        }
    }

    // Add a new question to the question bank
    static async addQuestion(question, category) {
        try {
            const query = `
                INSERT INTO question_bank (question, category)
                VALUES ($1, $2)
                RETURNING id, question, category, times_asked, created_at, updated_at
            `;
            const result = await pool.query(query, [question, category]);
            return { success: true, data: result.rows[0] };
        } catch (error) {
            console.error('Error adding question:', error);
            return { success: false, error: error.message };
        }
    }

    // Increment the times_asked counter for a question
    static async incrementTimesAsked(questionId) {
        try {
            const query = `
                UPDATE question_bank
                SET times_asked = times_asked + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, question, category, times_asked
            `;
            const result = await pool.query(query, [questionId]);
            return { success: true, data: result.rows[0] };
        } catch (error) {
            console.error('Error incrementing times asked:', error);
            return { success: false, error: error.message };
        }
    }

    // Search questions by text
    static async searchQuestions(searchTerm) {
        try {
            const query = `
                SELECT id, question, category, times_asked, created_at, updated_at
                FROM question_bank
                WHERE question ILIKE $1
                ORDER BY times_asked DESC, question
            `;
            const result = await pool.query(query, [`%${searchTerm}%`]);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('Error searching questions:', error);
            return { success: false, error: error.message };
        }
    }

    // Get popular questions (most asked)
    static async getPopularQuestions(limit = 10) {
        try {
            const query = `
                SELECT id, question, category, times_asked, created_at, updated_at
                FROM question_bank
                WHERE times_asked > 0
                ORDER BY times_asked DESC, question
                LIMIT $1
            `;
            const result = await pool.query(query, [limit]);
            return { success: true, data: result.rows };
        } catch (error) {
            console.error('Error fetching popular questions:', error);
            return { success: false, error: error.message };
        }
    }

    // Update a question
    static async updateQuestion(questionId, question, category) {
        try {
            const query = `
                UPDATE question_bank
                SET question = $1, category = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id, question, category, times_asked, created_at, updated_at
            `;
            const result = await pool.query(query, [question, category, questionId]);
            return { success: true, data: result.rows[0] };
        } catch (error) {
            console.error('Error updating question:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a question
    static async deleteQuestion(questionId) {
        try {
            const query = `
                DELETE FROM question_bank
                WHERE id = $1
                RETURNING id, question, category
            `;
            const result = await pool.query(query, [questionId]);
            return { success: true, data: result.rows[0] };
        } catch (error) {
            console.error('Error deleting question:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = QuestionBankService;
