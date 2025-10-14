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
            
            // Try with tags column first, fallback to without tags if column doesn't exist
            try {
                const query = `
                    SELECT id, question as question_text, category, tags, times_asked, 
                           COALESCE(times_answered_correctly, 0) as times_answered_correctly,
                           COALESCE(times_answered_incorrectly, 0) as times_answered_incorrectly,
                           CASE 
                               WHEN times_asked > 0 THEN ROUND((COALESCE(times_answered_correctly, 0)::DECIMAL / times_asked) * 100, 2)
                               ELSE 0 
                           END as success_rate,
                           COALESCE(is_favorite, false) as is_favorite, created_at, updated_at
                    FROM question_bank
                    ORDER BY category, question
                `;
                const result = await pool.query(query);
                return { success: true, data: result.rows };
            } catch (tagsError) {
                // If tags column doesn't exist (error code 42703), fall back to query without tags
                if (tagsError.code === '42703') {
                    console.warn('⚠️ Tags column not found, falling back to category only. Please run migration: 013_add_tags_to_questions.sql');
                    const fallbackQuery = `
                        SELECT id, question as question_text, category, times_asked, 
                               COALESCE(times_answered_correctly, 0) as times_answered_correctly,
                               COALESCE(times_answered_incorrectly, 0) as times_answered_incorrectly,
                               CASE 
                                   WHEN times_asked > 0 THEN ROUND((COALESCE(times_answered_correctly, 0)::DECIMAL / times_asked) * 100, 2)
                                   ELSE 0 
                               END as success_rate,
                               COALESCE(is_favorite, false) as is_favorite, created_at, updated_at
                        FROM question_bank
                        ORDER BY category, question
                    `;
                    const result = await pool.query(fallbackQuery);
                    return { success: true, data: result.rows };
                }
                throw tagsError;
            }
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
                       COALESCE(times_answered_correctly, 0) as times_answered_correctly,
                       COALESCE(times_answered_incorrectly, 0) as times_answered_incorrectly,
                       CASE 
                           WHEN times_asked > 0 THEN ROUND((COALESCE(times_answered_correctly, 0)::DECIMAL / times_asked) * 100, 2)
                           ELSE 0 
                       END as success_rate,
                       COALESCE(is_favorite, false) as is_favorite, created_at, updated_at
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

    // Get all unique tags
    static async getAllTags() {
        try {
            if (!(await this.isDatabaseAvailable())) {
                // Mock implementation
                const allQuestions = await mockDataService.getQuestionsAnalytics();
                const tagsSet = new Set();
                allQuestions.forEach(q => {
                    if (q.tags) {
                        q.tags.forEach(tag => tagsSet.add(tag));
                    }
                });
                return { success: true, data: Array.from(tagsSet).sort() };
            }
            
            try {
                const query = `
                    SELECT DISTINCT unnest(tags) as tag, COUNT(*) as question_count
                    FROM question_bank
                    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
                    GROUP BY tag
                    ORDER BY tag
                `;
                const result = await pool.query(query);
                return { success: true, data: result.rows };
            } catch (tagsError) {
                // If tags column doesn't exist, fall back to categories
                if (tagsError.code === '42703') {
                    console.warn('⚠️ Tags column not found, falling back to categories. Please run migration: 013_add_tags_to_questions.sql');
                    const fallbackQuery = `
                        SELECT DISTINCT category as tag, COUNT(*) as question_count
                        FROM question_bank
                        WHERE category IS NOT NULL AND category != ''
                        GROUP BY category
                        ORDER BY category
                    `;
                    const result = await pool.query(fallbackQuery);
                    return { success: true, data: result.rows };
                }
                throw tagsError;
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            return { success: false, error: error.message };
        }
    }

    // Add a new category
    static async addCategory(categoryName) {
        try {
            if (!(await this.isDatabaseAvailable())) {
                // For mock data, just return success
                return { success: true, data: { category: categoryName } };
            }

            // Check if category already exists
            const checkQuery = 'SELECT id FROM question_bank WHERE category = $1 LIMIT 1';
            const existing = await pool.query(checkQuery, [categoryName]);
            
            if (existing.rows.length > 0) {
                return { success: true, data: { category: categoryName }, message: 'Category already exists' };
            }

            // Do not create dummy question rows for categories
            // Return success; categories are derived from existing questions
            return { success: true, data: { category: categoryName } };
        } catch (error) {
            console.error('Error adding category:', error);
            return { success: false, error: error.message };
        }
    }

    // Add a new question to the question bank
    static async addQuestion(question, tags) {
        try {
            // Support both tags array (new) and single category (legacy)
            const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
            const category = tagsArray.length > 0 ? tagsArray[0] : null; // Keep category for backward compatibility
            
            const query = `
                INSERT INTO question_bank (question, category, tags)
                VALUES ($1, $2, $3)
                RETURNING id, question, category, tags, times_asked, created_at, updated_at
            `;
            const result = await pool.query(query, [question, category, tagsArray]);
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
    static async updateQuestion(questionId, question, tags) {
        try {
            // Support both tags array (new) and single category (legacy)
            const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
            const category = tagsArray.length > 0 ? tagsArray[0] : null;
            
            const query = `
                UPDATE question_bank
                SET question = $1, category = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING id, question, category, tags, times_asked, created_at, updated_at
            `;
            const result = await pool.query(query, [question, category, tagsArray, questionId]);
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

    // Update a question (overloaded method for object-based updates)
    static async updateQuestion(id, updateData) {
        try {
            if (!(await this.isDatabaseAvailable())) {
                return mockDataService.updateQuestion(id, updateData);
            }

            // Define allowed fields for question_bank table (now includes tags)
            const allowedFields = ['question', 'category', 'tags'];
            
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

            console.log(`📥 Bulk importing ${questions.length} questions at ${new Date().toISOString()}`);
            
            // Add a small delay to prevent rapid successive imports
            await new Promise(resolve => setTimeout(resolve, 100));
            
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
                        // Validate required fields (now only question is required)
                        if (!questionData.question) {
                            results.errors.push(`Row ${i + 1}: Missing required field (question)`);
                            results.errorCount++;
                            continue;
                        }

                        // Parse tags - support both tags array and category
                        let tags = questionData.tags || [];
                        if (questionData.category && !Array.isArray(tags)) {
                            // Convert category to tags for backward compatibility
                            tags = [questionData.category];
                        } else if (typeof questionData.category === 'string' && !tags.includes(questionData.category)) {
                            // Add category as first tag if not already in tags
                            tags = [questionData.category, ...tags];
                        }
                        const category = tags.length > 0 ? tags[0] : null;

                        // Check for duplicate questions (case-insensitive, trimmed)
                        const duplicateCheck = await client.query(
                            'SELECT id FROM question_bank WHERE LOWER(TRIM(question)) = LOWER(TRIM($1))',
                            [questionData.question.trim()]
                        );

                        if (duplicateCheck.rows.length > 0) {
                            results.errors.push(`Row ${i + 1}: Duplicate question found`);
                            results.errorCount++;
                            continue;
                        }

                        // Insert the question with tags
                        const insertResult = await client.query(`
                            INSERT INTO question_bank (question, category, tags, created_at, updated_at)
                            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            RETURNING *
                        `, [
                            questionData.question.trim(),
                            category,
                            tags
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
