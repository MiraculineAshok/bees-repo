const https = require('https');

// Neon Data API configuration - using the connection string approach
const NEON_API_BASE = 'https://ep-crimson-field-adzgxrr5.apirest.c-2.us-east-1.aws.neon.tech/neondb/rest/v1';

// Helper function to make API requests with proper authentication
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
        'Authorization': 'Bearer neondb_owner',
        'apikey': 'npg_dI2XKrE5lcbZ'
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
    // Try using the SQL endpoint
    const response = await makeApiRequest('/rpc/exec', 'POST', { query: sql });
    
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
    
    // Try to get table information
    console.log('\n📋 Getting table information...');
    const tablesResponse = await makeApiRequest('/tables');
    console.log('📊 Tables response:', tablesResponse);
    
    // Try to get authorized_users data
    console.log('\n👥 Getting authorized_users data...');
    const usersResponse = await makeApiRequest('/authorized_users?select=*');
    console.log('📊 Authorized users:', usersResponse);
    
    // Try to get interviews data
    console.log('\n📝 Getting interviews data...');
    const interviewsResponse = await makeApiRequest('/interviews?select=*');
    console.log('📊 Interviews:', interviewsResponse);
    
    console.log('\n🎉 Database connection test completed!');
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
  }
}

// Run the update
updateDatabaseSchema();
