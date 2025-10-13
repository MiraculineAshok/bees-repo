const pool = require('../db/pool');
const mockDataService = require('./mockDataService');

class QuestionBankService {
    // Check if database is available
    static async isDatabaseAvailable() {
        try {
            if (!pool) {
                console.log('📝 Database pool not available, using mock data');
                return false;
            }
            await pool.query('SELECT 1');
            return true;
        } catch (error) {
            console.log('📝 Database unavailable, using mock data');
            return false;
        }
    }

    // Get all questions from the question bank
    static async getAllQuestions() {
        try {
            if (!(await this.isDatabaseAvailable())) {
                const questions = await mockDataService.getQuestionsAnalytics();
                return { success: true, data: questions };
            }
            
            const query = `
                SELECT id, question as question_text, category, times_asked, 
                       times_answered_correctly, times_answered_incorrectly,
                       CASE 
                           WHEN times_asked > 0 THEN ROUND((times_answered_correctly::DECIMAL / times_asked) * 100, 2)
                           ELSE 0 
                       END as success_rate,
                       is_favorite, created_at, updated_at
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
            if (!(await this.isDatabaseAvailable())) {
                const allQuestions = await mockDataService.getQuestionsAnalytics();
                const filteredQuestions = allQuestions.filter(q => q.category === category);
                return { success: true, data: filteredQuestions };
            }
            
            const query = `
                SELECT id, question as question_text, category, times_asked,
                       times_answered_correctly, times_answered_incorrectly,
                       CASE 
                           WHEN times_asked > 0 THEN ROUND((times_answered_correctly::DECIMAL / times_asked) * 100, 2)
                           ELSE 0 
                       END as success_rate,
                       is_favorite, created_at, updated_at
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
            if (!(await this.isDatabaseAvailable())) {
                const allQuestions = await mockDataService.getQuestionsAnalytics();
                const categories = [...new Set(allQuestions.map(q => q.category))].map(category => ({
                    category,
                    question_count: allQuestions.filter(q => q.category === category).length
                }));
                return { success: true, data: categories };
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
            if (!(await this.isDatabaseAvailable())) {
                // Mock increment - just return success
                return { success: true, data: { id: questionId, times_asked: 1 } };
            }
            
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
            if (!(await this.isDatabaseAvailable())) {
                const allQuestions = await mockDataService.getQuestionsAnalytics();
                const filteredQuestions = allQuestions.filter(q => 
                    q.question.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return { success: true, data: filteredQuestions };
            }
            
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

    // Update a question
    static async updateQuestion(id, updateData) {
        try {
            if (!(await this.isDatabaseAvailable())) {
                return mockDataService.updateQuestion(id, updateData);
            }

            // Define allowed fields for question_bank table
            const allowedFields = ['question', 'category'];
            
            // Filter out invalid fields
            const validUpdateData = {};
            Object.keys(updateData).forEach(field => {
                if (allowedFields.includes(field)) {
                    validUpdateData[field] = updateData[field];
                } else {
                    console.warn(`Field "${field}" is not allowed for question updates`);
                }
            });

            if (Object.keys(validUpdateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            const fields = Object.keys(validUpdateData);
            const values = Object.values(validUpdateData);
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            
            const query = `UPDATE question_bank SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
            const result = await pool.query(query, [id, ...values]);
            
            if (result.rows.length === 0) {
                throw new Error('Question not found');
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Error updating question:', error);
            throw error;
        }
    }

    // Bulk update questions
    static async bulkUpdateQuestions(updates) {
        try {
            if (!(await this.isDatabaseAvailable())) {
                return mockDataService.bulkUpdateQuestions(updates);
            }

            const results = [];
            
            for (const update of updates) {
                const { id, data } = update;
                const result = await this.updateQuestion(id, data);
                results.push(result);
            }
            
            return results;
        } catch (error) {
            console.error('Error bulk updating questions:', error);
            throw error;
        }
    }

    // Bulk import questions
    static async bulkImportQuestions(questions) {
        try {
            if (!(await this.isDatabaseAvailable())) {
                return mockDataService.bulkImportQuestions(questions);
            }

            console.log(`📥 Bulk importing ${questions.length} questions`);
            
            const results = {
                successCount: 0,
                errorCount: 0,
                errors: [],
                importedQuestions: []
            };

            // Use transaction for better performance and rollback capability
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                for (let i = 0; i < questions.length; i++) {
                    const questionData = questions[i];
                    
                    try {
                        // Validate required fields
                        if (!questionData.question || !questionData.category) {
                            results.errors.push(`Row ${i + 1}: Missing required fields (question, category)`);
                            results.errorCount++;
                            continue;
                        }

                        // Check for duplicate questions
                        const duplicateCheck = await client.query(
                            'SELECT id FROM question_bank WHERE question = $1',
                            [questionData.question.trim()]
                        );

                        if (duplicateCheck.rows.length > 0) {
                            results.errors.push(`Row ${i + 1}: Duplicate question found`);
                            results.errorCount++;
                            continue;
                        }

                        // Insert the question
                        const insertResult = await client.query(`
                            INSERT INTO question_bank (question, category, created_at, updated_at)
                            VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            RETURNING *
                        `, [
                            questionData.question.trim(),
                            questionData.category.trim()
                        ]);

                        results.importedQuestions.push(insertResult.rows[0]);
                        results.successCount++;

                    } catch (error) {
                        console.error(`Error importing question ${i + 1}:`, error);
                        results.errors.push(`Row ${i + 1}: ${error.message}`);
                        results.errorCount++;
                    }
                }

                await client.query('COMMIT');
                console.log(`✅ Bulk import completed: ${results.successCount} successful, ${results.errorCount} failed`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error('❌ Bulk import transaction failed:', error);
                throw error;
            } finally {
                client.release();
            }

            return results;

        } catch (error) {
            console.error('Error bulk importing questions:', error);
            throw error;
        }
    }
}

module.exports = QuestionBankService;
