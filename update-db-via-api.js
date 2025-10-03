const https = require('https');
const fs = require('fs');

// Neon Data API configuration
const NEON_API_BASE = 'https://ep-crimson-field-adzgxrr5.apirest.c-2.us-east-1.aws.neon.tech/neondb/rest/v1';
const API_KEY = 'npg_dI2XKrE5lcbZ'; // This should be your actual API key

// Helper function to make API requests
function makeApiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = `${NEON_API_BASE}${endpoint}`;
    
    const options = {
      hostname: 'ep-crimson-field-adzgxrr5.apirest.c-2.us-east-1.aws.neon.tech',
      port: 443,
      path: `/neondb/rest/v1${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'apikey': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Function to execute SQL via the API
async function executeSQL(sql) {
  console.log(`🔄 Executing SQL: ${sql.substring(0, 100)}...`);
  
  try {
    const response = await makeApiRequest('/rpc/exec', 'POST', { sql });
    
    if (response.status === 200) {
      console.log('✅ SQL executed successfully');
      return response.data;
    } else {
      console.error('❌ SQL execution failed:', response.status, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    return null;
  }
}

// Main function to update the database schema
async function updateDatabaseSchema() {
  console.log('🚀 Starting database schema update via Neon Data API...');
  
  try {
    // Test connection first
    console.log('🔍 Testing connection...');
    const testResponse = await makeApiRequest('/');
    console.log('📊 API Response:', testResponse);
    
    // 1. Check current foreign key constraints
    console.log('\n📋 Checking current foreign key constraints...');
    const fkQuery = `
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name='interviews'
      AND kcu.column_name='interviewer_id'
    `;
    
    const fkResult = await executeSQL(fkQuery);
    console.log('📊 Current foreign key constraints:', fkResult);
    
    // 2. Check authorized_users table
    console.log('\n👥 Checking authorized_users table...');
    const usersQuery = 'SELECT id, name, email, role FROM authorized_users ORDER BY id LIMIT 10';
    const usersResult = await executeSQL(usersQuery);
    console.log('📊 Authorized users:', usersResult);
    
    // 3. Check interviews table
    console.log('\n📝 Checking interviews table...');
    const interviewsQuery = `
      SELECT 
        i.id, 
        i.interviewer_id, 
        i.student_id, 
        i.status,
        au.name as interviewer_name,
        au.email as interviewer_email
      FROM interviews i
      LEFT JOIN authorized_users au ON i.interviewer_id = au.id
      ORDER BY i.id
      LIMIT 10
    `;
    const interviewsResult = await executeSQL(interviewsQuery);
    console.log('📊 Current interviews:', interviewsResult);
    
    // 4. Update foreign key constraint
    console.log('\n🔧 Updating foreign key constraint...');
    
    // Drop existing constraint
    const dropConstraintSQL = 'ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey';
    await executeSQL(dropConstraintSQL);
    
    // Add new constraint
    const addConstraintSQL = `
      ALTER TABLE interviews 
      ADD CONSTRAINT interviews_interviewer_id_fkey 
      FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE
    `;
    await executeSQL(addConstraintSQL);
    
    // 5. Verify the changes
    console.log('\n✅ Verifying changes...');
    const verifyResult = await executeSQL(fkQuery);
    console.log('📊 Updated foreign key constraints:', verifyResult);
    
    console.log('\n🎉 Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
  }
}

// Run the update
updateDatabaseSchema();
