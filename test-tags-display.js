/**
 * Quick test to check how tags are stored and retrieved from database
 */

const { Pool } = require('pg');

async function testTags() {
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ Database URL not provided.');
        console.error('Usage: node test-tags-display.js "postgresql://..."');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        max: 1,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to database...\n');
        
        // Get a few questions with tags
        const result = await pool.query(`
            SELECT id, question, category, tags, 
                   pg_typeof(tags) as tags_type,
                   array_length(tags, 1) as tags_count
            FROM question_bank 
            WHERE tags IS NOT NULL 
            LIMIT 5
        `);

        console.log('📊 Sample questions from database:\n');
        
        result.rows.forEach((row, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`  ID: ${row.id}`);
            console.log(`  Question: ${row.question.substring(0, 60)}...`);
            console.log(`  Category: ${row.category}`);
            console.log(`  Tags (raw): ${JSON.stringify(row.tags)}`);
            console.log(`  Tags type: ${row.tags_type}`);
            console.log(`  Tags count: ${row.tags_count}`);
            console.log(`  Is Array: ${Array.isArray(row.tags)}`);
            if (Array.isArray(row.tags)) {
                console.log(`  Individual tags: ${row.tags.map(t => `"${t}"`).join(', ')}`);
            }
            console.log('');
        });

        // Check if any questions have multiple tags
        const multiTagResult = await pool.query(`
            SELECT id, question, tags, array_length(tags, 1) as tag_count
            FROM question_bank 
            WHERE array_length(tags, 1) > 1
            LIMIT 3
        `);

        console.log(`\n🏷️  Questions with multiple tags: ${multiTagResult.rows.length}`);
        multiTagResult.rows.forEach((row, index) => {
            console.log(`\n  ${index + 1}. ID ${row.id}: ${row.question.substring(0, 50)}...`);
            console.log(`     Tags (${row.tag_count}): ${JSON.stringify(row.tags)}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
        console.log('\n👋 Database connection closed.');
    }
}

testTags();

