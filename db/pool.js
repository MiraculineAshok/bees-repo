const { Pool } = require('pg');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log('📝 DATABASE_URL environment variable is not set!');
  console.log('📝 Using mock data for development/testing.');
  module.exports = null;
  return;
}

console.log('🔗 Database URL found:', databaseUrl ? 'Yes' : 'No');

// Determine if we're connecting to a local or remote database
const isLocalDatabase = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: databaseUrl,
  max: 3,                  // Reduced to 3 for Neon free tier
  min: 0,                  // Allow pool to shrink to 0 when idle
  idleTimeoutMillis: 10000, // Release idle connections after 10 seconds
  connectionTimeoutMillis: 10000, // Reduced timeout (10 seconds)
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false }, // Only use SSL for remote databases
  allowExitOnIdle: true,   // Allow process to exit if all connections idle
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
