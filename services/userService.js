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
        'SELECT id, email, name, role, status, created_at, updated_at, last_login_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(id) {
    try {
      const result = await pool.query(
        'SELECT id, email, name, role, status, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(id, updateData) {
    try {
      const { name, email, role, status } = updateData;
      
      const result = await pool.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             email = COALESCE($2, email), 
             role = COALESCE($3, role), 
             status = COALESCE($4, status),
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5
         RETURNING *`,
        [name, email, role, status, id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(id) {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  // Bulk update users
  static async bulkUpdateUsers(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const { id, data } = update;
        const result = await this.updateUser(id, data);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error bulk updating users:', error);
      throw error;
    }
  }
}

module.exports = UserService;
