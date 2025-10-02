const pool = require('../db/pool');

class UserService {
  // Create or update user from JWT payload
  static async createOrUpdateUser(jwtPayload) {
    try {
      const { sub: zohoUserId, email, email_verified } = jwtPayload;
      
      if (!email || !zohoUserId) {
        throw new Error('Missing required user data from JWT');
      }
      
      // Extract name from email (before @ symbol)
      const name = email.split('@')[0];
      
      // Determine role based on email domain or other logic
      let role = 'user';
      if (email.includes('@zohotest.com') || email.includes('@zoho.com')) {
        role = 'admin';
      }
      
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT * FROM users WHERE email = $1 OR zoho_user_id = $2',
        [email, zohoUserId]
      );
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        const result = await pool.query(
          `UPDATE users 
           SET name = $1, role = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE email = $3 OR zoho_user_id = $4
           RETURNING *`,
          [name, role, email, zohoUserId]
        );
        
        console.log('✅ User updated:', result.rows[0]);
        return result.rows[0];
      } else {
        // Create new user
        const result = await pool.query(
          `INSERT INTO users (email, name, role, zoho_user_id) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [email, name, role, zohoUserId]
        );
        
        console.log('✅ New user created:', result.rows[0]);
        return result.rows[0];
      }
      
    } catch (error) {
      console.error('❌ Error creating/updating user:', error);
      throw error;
    }
  }
  
  // Get user by email
  static async getUserByEmail(email) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      throw error;
    }
  }
  
  // Get user by Zoho user ID
  static async getUserByZohoId(zohoUserId) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE zoho_user_id = $1',
        [zohoUserId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting user by Zoho ID:', error);
      throw error;
    }
  }
  
  // Get all users (for admin purposes)
  static async getAllUsers() {
    try {
      const result = await pool.query(
        'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }
}

module.exports = UserService;
