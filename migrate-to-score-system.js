/**
 * Migration script to change from correct/incorrect to 1-10 scoring system
 * Run this locally with: node migrate-to-score-system.js "your-database-url"
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateToScoreSystem() {
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ Database URL not provided.');
        console.error('Usage: node migrate-to-score-system.js "postgresql://..."');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        max: 1,
        ssl: { rejectUnauthorized: false }
    });

    console.log('🔗 Connecting to database...');
    
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connected to database successfully\n');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }

    try {
        console.log('🚀 Starting migration to 1-10 scoring system...\n');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'db', 'migrations', '014_change_to_score_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        console.log('📝 Executing migration SQL...');
        await pool.query(migrationSQL);
        console.log('✅ Migration SQL executed successfully\n');

        // Verify the changes
        console.log('📝 Verifying schema changes...\n');

        // Check interview_questions table
        const iqColumnsResult = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'interview_questions' 
            AND column_name IN ('is_correct', 'correctness_score')
            ORDER BY column_name
        `);

        console.log('📊 interview_questions columns:');
        if (iqColumnsResult.rows.length === 0) {
            console.log('   ⚠️  No relevant columns found (might be renamed or deleted)');
        } else {
            iqColumnsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
        }
        console.log('');

        // Check question_bank table
        const qbColumnsResult = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'question_bank' 
            AND column_name IN ('times_answered_correctly', 'times_answered_incorrectly', 'total_score', 'average_score')
            ORDER BY column_name
        `);

        console.log('📊 question_bank columns:');
        if (qbColumnsResult.rows.length === 0) {
            console.log('   ⚠️  No relevant columns found');
        } else {
            qbColumnsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
            });
        }
        console.log('');

        // Check if function exists
        const functionResult = await pool.query(`
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_name = 'calculate_success_rate'
        `);

        if (functionResult.rows.length > 0) {
            console.log('✅ calculate_success_rate function created successfully\n');
        } else {
            console.log('⚠️  calculate_success_rate function not found\n');
        }

        // Get sample data
        const sampleResult = await pool.query(`
            SELECT id, question, times_asked, total_score, average_score
            FROM question_bank
            LIMIT 5
        `);

        console.log('📊 Sample question_bank data:');
        sampleResult.rows.forEach(row => {
            console.log(`   ID ${row.id}: Asked ${row.times_asked} times, Total Score: ${row.total_score}, Avg: ${row.average_score}`);
        });

        console.log('\n🎉 Migration completed successfully!');
        console.log('📌 The system now uses a 1-10 scoring system instead of correct/incorrect.');
        console.log('📌 Success rate will be calculated as: (average_score / 10) * 100');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n👋 Database connection closed.');
    }
}

migrateToScoreSystem();

