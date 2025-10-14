/**
 * One-time migration script to add tags column and migrate existing categories
 * Run this locally with: node migrate-to-tags.js
 * Or with direct URL: node migrate-to-tags.js "your-database-url"
 */

const { Pool } = require('pg');

async function migrateToTags() {
    // Use command line argument or environment variable
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ Database URL not provided.');
        console.error('Usage: node migrate-to-tags.js "postgresql://..."');
        console.error('Or set DATABASE_URL environment variable');
        process.exit(1);
    }

    // Create a dedicated pool for this migration
    const pool = new Pool({
        connectionString: databaseUrl,
        max: 1,  // Only 1 connection for this script
        ssl: { rejectUnauthorized: false }
    });

    console.log('🔗 Connecting to database...');
    
    // Test connection
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connected to database successfully\n');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }

    try {
        console.log('🚀 Starting migration to tags system...\n');

        // Step 1: Add tags column
        console.log('📝 Step 1: Adding tags column...');
        try {
            await pool.query(`
                ALTER TABLE question_bank 
                ADD COLUMN IF NOT EXISTS tags TEXT[]
            `);
            console.log('✅ Tags column added successfully');
        } catch (error) {
            if (error.code === '42701') {
                console.log('ℹ️  Tags column already exists');
            } else {
                throw error;
            }
        }

        // Step 2: Add index
        console.log('\n📝 Step 2: Adding index for tags...');
        try {
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_question_bank_tags 
                ON question_bank USING GIN (tags)
            `);
            console.log('✅ Index created successfully');
        } catch (error) {
            console.log('ℹ️  Index might already exist:', error.message);
        }

        // Step 3: Migrate existing categories to tags
        console.log('\n📝 Step 3: Migrating existing categories to tags...');
        const result = await pool.query(`
            UPDATE question_bank 
            SET tags = ARRAY[category]
            WHERE category IS NOT NULL 
            AND category != '' 
            AND (tags IS NULL OR array_length(tags, 1) IS NULL)
            RETURNING id, category, tags
        `);
        
        console.log(`✅ Migrated ${result.rowCount} questions from category to tags`);
        
        if (result.rows.length > 0) {
            console.log('\n📊 Sample migrated data:');
            result.rows.slice(0, 5).forEach(row => {
                console.log(`   - ID ${row.id}: "${row.category}" → [${row.tags.join(', ')}]`);
            });
        }

        // Step 4: Verify migration
        console.log('\n📝 Step 4: Verifying migration...');
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(tags) as with_tags,
                COUNT(CASE WHEN array_length(tags, 1) > 0 THEN 1 END) as non_empty_tags
            FROM question_bank
        `);
        
        const { total, with_tags, non_empty_tags } = stats.rows[0];
        console.log(`✅ Verification complete:`);
        console.log(`   - Total questions: ${total}`);
        console.log(`   - Questions with tags column: ${with_tags}`);
        console.log(`   - Questions with non-empty tags: ${non_empty_tags}`);

        console.log('\n🎉 Migration completed successfully!');
        console.log('📌 Your app will now use the tags system.');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n👋 Database connection closed.');
    }
}

// Run migration
migrateToTags();

