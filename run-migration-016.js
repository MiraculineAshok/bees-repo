#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('📝 Please set it before running the migration:');
  console.error('   export DATABASE_URL="postgresql://user:password@host:port/database"');
  console.error('   OR');
  console.error('   DATABASE_URL="postgresql://user:password@host:port/database" node run-migration-016.js');
  process.exit(1);
}

// Create database pool
const isLocalDatabase = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000, // 30 seconds
  query_timeout: 30000, // 30 seconds
});

async function runMigration() {

  try {
    console.log('🔄 Starting migration: Make email and zeta_id optional...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'db/migrations/016_make_email_zeta_optional.sql'), 
      'utf8'
    );
    
    // Split the SQL into individual statements
    // Remove comments and split by semicolon
    const statements = migrationSQL
      .split('\n')
      .map(line => {
        // Remove inline comments
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && stmt.toLowerCase().startsWith('alter'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          console.log(`   SQL: ${statement.substring(0, 60)}...`);
          const result = await pool.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Check if it's a "does not exist" or "already exists" error - these are OK
          if (error.message.includes('does not exist') || 
              error.message.includes('already exists') ||
              error.message.includes('column') && error.message.includes('does not exist')) {
            console.log(`⚠️  Statement ${i + 1} skipped (column already in desired state): ${error.message}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Email column is now optional (nullable)');
    console.log('   - Zeta ID column is now optional (nullable)');
    console.log('   - Phone column is now required (NOT NULL)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();

