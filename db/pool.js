const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL,
  max: 5,                  // Keep this low; multiple instances add up
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,  // Increased timeout for Neon
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;
