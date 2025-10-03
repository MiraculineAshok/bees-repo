const pool = require('./db/pool');

async function addUsers() {
  try {
    // Add users one by one
    const users = [
      { email: 'miraculine.j+bees@zohotest.com', name: 'Miraculine Bees', role: 'interviewer' },
      { email: 'arunachalam.ra@zohocorp.com', name: 'Arunachalam RA', role: 'interviewer' },
      { email: 'kannan.bb@zohocorp.com', name: 'Kannan BB', role: 'admin' }
    ];
    
    for (const user of users) {
      await pool.query(
        'INSERT INTO users (email, name, role, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP',
        [user.email, user.name, user.role]
      );
      console.log(`✅ Added/Updated: ${user.email} (${user.name}) - Role: ${user.role}`);
    }
    
    // Verify the users
    const result = await pool.query('SELECT email, name, role FROM users WHERE email = ANY($1)', 
      [users.map(u => u.email)]);
    
    console.log('\n📋 Final user list:');
    result.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Role: ${user.role}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addUsers();
