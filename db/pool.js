const { Pool } = require('pg');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your Render environment variables.');
  process.exit(1);
}

console.log('🔗 Database URL found:', databaseUrl ? 'Yes' : 'No');

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,                  // Keep this low; multiple instances add up
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,  // Increased timeout for Neon
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Test the connection immediately
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connection test successful');
  })
  .catch((err) => {
    console.error('❌ Database connection test failed:', err);
  });

module.exports = pool;
