const pool = require('../db/pool');

// Try to load OpenAI, but don't fail if not installed
let OpenAI = null;
let openai = null;

try {
    OpenAI = require('openai');
    console.log('✅ OpenAI package loaded');
} catch (error) {
    console.log('⚠️ OpenAI package not installed, using fallback system only');
    console.log('   To enable AI features: npm install openai');
}

// Initialize OpenAI if package is available and API key is set
if (OpenAI) {
    try {
        if (process.env.OPENAI_API_KEY) {
            console.log('✅ Initializing OpenAI with API key...');
            openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            console.log('✅ OpenAI initialized successfully');
        } else {
            console.log('⚠️ OPENAI_API_KEY not found, using fallback system');
        }
    } catch (error) {
        console.error('❌ Error initializing OpenAI:', error.message);
        console.log('⚠️ Falling back to rule-based system');
    }
}

// Database schema for AI context
const DATABASE_SCHEMA = {
    interviews: {
        description: "Stores all interview records",
        columns: {
            id: "Primary key",
            student_id: "Foreign key to students table",
            session_id: "Foreign key to interview_sessions table",
            interviewer_email: "Email of the interviewer",
            status: "Status: 'in_progress', 'completed', 'cancelled'",
            verdict: "Interview verdict: 'Tiger', 'Cow', 'Sheep'",
            notes: "Interviewer notes",
            created_at: "Timestamp when interview was created",
            completed_at: "Timestamp when interview was completed",
            duration_seconds: "Duration of the interview in seconds"
        }
    },
    students: {
        description: "Stores student/candidate information",
        columns: {
            id: "Primary key",
            name: "Student name",
            zeta_id: "Unique student ID",
            email: "Student email",
            phone: "Student phone number",
            school: "Student's school/institution",
            location: "Student's location",
            created_at: "Registration timestamp"
        }
    },
    interview_sessions: {
        description: "Stores interview session information",
        columns: {
            id: "Primary key",
            name: "Session name",
            description: "Session description",
            location: "Session location",
            created_at: "Session creation timestamp"
        }
    },
    question_bank: {
        description: "Stores all questions available for interviews",
        columns: {
            id: "Primary key",
            question: "Question text (HTML/rich text)",
            tags: "Question tags/categories",
            times_asked: "Number of times question was used",
            average_score: "Average score for this question",
            success_rate: "Success rate percentage",
            is_favorite: "Whether question is marked as favorite"
        }
    },
    interview_questions: {
        description: "Stores questions asked in specific interviews",
        columns: {
            id: "Primary key",
            interview_id: "Foreign key to interviews table",
            question_id: "Foreign key to question_bank table (null for custom questions)",
            question_text: "Question text",
            student_answer: "Student's answer",
            answer_photo_url: "URL to student's answer image",
            correctness_score: "Score out of 10",
            created_at: "Timestamp"
        }
    },
    authorized_users: {
        description: "Stores user accounts and roles",
        columns: {
            id: "Primary key",
            name: "User name",
            email: "User email",
            role: "User role: 'admin', 'superadmin', 'interviewer'",
            created_at: "Account creation timestamp"
        }
    },
    interview_consolidation: {
        description: "Consolidated view of student interview outcomes",
        columns: {
            id: "Primary key",
            student_id: "Foreign key to students table",
            session_id: "Foreign key to interview_sessions table",
            verdicts: "Array of verdicts from multiple interviews",
            interview_statuses: "Array of interview statuses",
            status: "Final status: 'selected', 'rejected', 'waitlisted'",
            notes: "Aggregated notes",
            last_interview_at: "Timestamp of last interview"
        }
    }
};

/**
 * Process a natural language query and return AI-generated insights
 */
async function processAIQuery(question, history = []) {
    try {
        console.log('📊 Processing AI query:', question);
        console.log('🔑 OpenAI available:', !!openai);
        
        // If OpenAI is not configured, use fallback rule-based system
        if (!openai) {
            console.log('⚡ Using fallback rule-based system');
            return await fallbackQueryProcessor(question);
        }

        console.log('🤖 Using OpenAI GPT-4');
        // Use OpenAI to understand the question and generate SQL
        const aiResponse = await analyzeQuestionWithAI(question, history);
        
        return aiResponse;
    } catch (error) {
        console.error('❌ Error processing AI query:', error);
        console.error('Error stack:', error.stack);
        
        // Try fallback system if OpenAI fails
        console.log('⚡ Attempting fallback system after error');
        try {
            return await fallbackQueryProcessor(question);
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            throw error;
        }
    }
}

/**
 * Use OpenAI to analyze the question and generate appropriate SQL queries
 */
async function analyzeQuestionWithAI(question, history) {
    const systemPrompt = `You are a SQL expert assistant helping analyze interview management system data.

Database Schema:
${JSON.stringify(DATABASE_SCHEMA, null, 2)}

Your task is to:
1. Understand the user's natural language question
2. Generate appropriate PostgreSQL SQL queries to answer the question
3. Execute the query mentally and provide a natural language answer
4. Return the results in a structured format

IMPORTANT:
- Always use proper PostgreSQL syntax
- Use table and column names exactly as shown in the schema
- For date comparisons, use proper PostgreSQL date functions like NOW(), INTERVAL, etc.
- Format dates using TO_CHAR when needed
- Always limit results to reasonable numbers (e.g., LIMIT 10 for lists)
- Use proper joins when querying across tables
- Handle NULL values appropriately

Response Format (JSON):
{
    "sql": "The SQL query to execute",
    "answer": "Natural language answer explaining what the query will show",
    "requiresExecution": true/false (whether the query needs to be executed)
}

Examples:
Q: "How many interviews were conducted last month?"
A: {
    "sql": "SELECT COUNT(*) as count FROM interviews WHERE created_at >= NOW() - INTERVAL '30 days'",
    "answer": "Let me check the number of interviews conducted in the last 30 days.",
    "requiresExecution": true
}

Q: "Who are the top 5 interviewers?"
A: {
    "sql": "SELECT interviewer_email, COUNT(*) as interview_count FROM interviews WHERE interviewer_email IS NOT NULL GROUP BY interviewer_email ORDER BY interview_count DESC LIMIT 5",
    "answer": "Here are the top 5 interviewers by number of interviews conducted:",
    "requiresExecution": true
}`;

    const userPrompt = history.length > 0 
        ? `Previous context:\n${history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')}\n\nNew question: ${question}`
        : question;

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

    // If query requires execution, execute it
    if (aiResult.requiresExecution && aiResult.sql) {
        try {
            const result = await pool.query(aiResult.sql);
            
            // Format the answer with actual data
            let finalAnswer = aiResult.answer;
            
            if (result.rows.length > 0) {
                // If it's a simple count/aggregate
                if (result.rows.length === 1 && Object.keys(result.rows[0]).length === 1) {
                    const value = Object.values(result.rows[0])[0];
                    finalAnswer += `\n\n**Result:** ${value}`;
                } else {
                    finalAnswer += `\n\nFound ${result.rows.length} result(s).`;
                }
            } else {
                finalAnswer += "\n\nNo results found.";
            }

            return {
                success: true,
                answer: finalAnswer,
                data: result.rows,
                sql: aiResult.sql
            };
        } catch (sqlError) {
            console.error('SQL Execution Error:', sqlError);
            return {
                success: false,
                answer: `I generated a query but encountered an error executing it: ${sqlError.message}`,
                error: sqlError.message
            };
        }
    }

    return {
        success: true,
        answer: aiResult.answer,
        data: null
    };
}

/**
 * Fallback rule-based query processor when OpenAI is not available
 */
async function fallbackQueryProcessor(question) {
    const lowerQ = question.toLowerCase();

    try {
        // Pattern: Interview count queries
        if (lowerQ.includes('how many interview') || lowerQ.includes('count') && lowerQ.includes('interview')) {
            let timeFilter = '';
            if (lowerQ.includes('today')) {
                timeFilter = "AND created_at::date = CURRENT_DATE";
            } else if (lowerQ.includes('week') || lowerQ.includes('7 days')) {
                timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
            } else if (lowerQ.includes('month') || lowerQ.includes('30 days')) {
                timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
            }

            const result = await pool.query(`
                SELECT COUNT(*) as count FROM interviews WHERE 1=1 ${timeFilter}
            `);

            return {
                success: true,
                answer: `There have been **${result.rows[0].count}** interviews conducted${timeFilter ? ' in the specified time period' : ' in total'}.`,
                data: result.rows
            };
        }

        // Pattern: Top interviewers
        if (lowerQ.includes('top') && lowerQ.includes('interview')) {
            const limit = parseInt(lowerQ.match(/\d+/)?.[0]) || 5;
            const result = await pool.query(`
                SELECT 
                    u.name, 
                    u.email, 
                    COUNT(i.id) as interview_count
                FROM interviews i
                JOIN authorized_users u ON i.interviewer_email = u.email
                WHERE i.interviewer_email IS NOT NULL
                GROUP BY u.name, u.email
                ORDER BY interview_count DESC
                LIMIT $1
            `, [limit]);

            return {
                success: true,
                answer: `Here are the top ${limit} interviewers by interview count:`,
                data: result.rows
            };
        }

        // Pattern: Verdict distribution
        if (lowerQ.includes('verdict') && (lowerQ.includes('distribution') || lowerQ.includes('breakdown'))) {
            const result = await pool.query(`
                SELECT 
                    COALESCE(verdict, 'Not Assigned') as verdict,
                    COUNT(*) as count
                FROM interviews
                WHERE status = 'completed'
                GROUP BY verdict
                ORDER BY count DESC
            `);

            return {
                success: true,
                answer: 'Here is the distribution of verdicts across completed interviews:',
                data: result.rows
            };
        }

        // Pattern: Question success rate
        if (lowerQ.includes('question') && (lowerQ.includes('success') || lowerQ.includes('highest') || lowerQ.includes('best'))) {
            const result = await pool.query(`
                SELECT 
                    LEFT(question, 100) as question_preview,
                    tags,
                    times_asked,
                    ROUND(CAST(success_rate AS numeric), 2) as success_rate,
                    ROUND(CAST(average_score AS numeric), 2) as average_score
                FROM question_bank
                WHERE times_asked > 0
                ORDER BY success_rate DESC NULLS LAST
                LIMIT 10
            `);

            return {
                success: true,
                answer: 'Here are the questions with the highest success rates:',
                data: result.rows
            };
        }

        // Pattern: Student statistics
        if (lowerQ.includes('student') && (lowerQ.includes('how many') || lowerQ.includes('count'))) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM students`);

            return {
                success: true,
                answer: `There are **${result.rows[0].count}** students registered in the system.`,
                data: result.rows
            };
        }

        // Pattern: Session information
        if (lowerQ.includes('session')) {
            const result = await pool.query(`
                SELECT 
                    name, 
                    description,
                    location,
                    TO_CHAR(created_at, 'DD Mon YYYY') as created_date,
                    (SELECT COUNT(*) FROM interviews WHERE session_id = interview_sessions.id) as interview_count
                FROM interview_sessions
                ORDER BY created_at DESC
                LIMIT 10
            `);

            return {
                success: true,
                answer: 'Here are the recent interview sessions:',
                data: result.rows
            };
        }

        // Default: Provide general statistics
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM interviews) as total_interviews,
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM question_bank) as total_questions,
                (SELECT COUNT(*) FROM interview_sessions) as total_sessions,
                (SELECT COUNT(*) FROM interviews WHERE status = 'completed') as completed_interviews,
                (SELECT COUNT(*) FROM interviews WHERE status = 'in_progress') as ongoing_interviews
        `);

        return {
            success: true,
            answer: `I'm not sure I understood your question exactly. Here's an overview of your system:\n\n` +
                    `**Total Interviews:** ${stats.rows[0].total_interviews}\n` +
                    `**Completed:** ${stats.rows[0].completed_interviews}\n` +
                    `**Ongoing:** ${stats.rows[0].ongoing_interviews}\n` +
                    `**Total Students:** ${stats.rows[0].total_students}\n` +
                    `**Total Questions:** ${stats.rows[0].total_questions}\n` +
                    `**Interview Sessions:** ${stats.rows[0].total_sessions}\n\n` +
                    `Try asking specific questions like "How many interviews were conducted last month?" or "Who are the top interviewers?"`,
            data: [stats.rows[0]]
        };

    } catch (error) {
        console.error('Fallback processor error:', error);
        throw error;
    }
}

module.exports = {
    processAIQuery
};

