const pool = require('../db/pool');

class AuthService {
  // Check if user is authorized to access the application
  static async isUserAuthorized(email) {
    try {
      const result = await pool.query(`
        SELECT * FROM authorized_users WHERE email = $1
      `, [email]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error checking user authorization:', error.message);
      return false;
    }
  }
  
  // Get authorized user details
  static async getAuthorizedUser(email) {
    try {
      const result = await pool.query(`
        SELECT * FROM authorized_users WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting authorized user:', error.message);
      return null;
    }
  }
  
  // Add new authorized user (superadmin only)
  static async addAuthorizedUser(userData) {
    try {
      const { email, name, role = 'user', is_superadmin = false } = userData;
      
      if (!email) {
        throw new Error('Email is required');
      }
      
      const result = await pool.query(`
        INSERT INTO authorized_users (email, name, role, is_superadmin) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [email, name, role, is_superadmin]);
      
      console.log('✅ New authorized user added:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error adding authorized user:', error.message);
      throw error;
    }
  }
  
  // Get all authorized users
  static async getAllAuthorizedUsers() {
    try {
      const result = await pool.query(`
        SELECT * FROM authorized_users 
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all authorized users:', error.message);
      throw error;
    }
  }
  
  // Update authorized user
  static async updateAuthorizedUser(email, updateData) {
    try {
      const { name, role, is_superadmin } = updateData;
      
      const result = await pool.query(`
        UPDATE authorized_users 
        SET name = COALESCE($1, name),
            role = COALESCE($2, role),
            is_superadmin = COALESCE($3, is_superadmin),
            updated_at = CURRENT_TIMESTAMP
        WHERE email = $4
        RETURNING *
      `, [name, role, is_superadmin, email]);
      
      if (result.rows.length === 0) {
        throw new Error('Authorized user not found');
      }
      
      console.log('✅ Authorized user updated:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error updating authorized user:', error.message);
      throw error;
    }
  }
  
  // Remove authorized user
  static async removeAuthorizedUser(email) {
    try {
      const result = await pool.query(`
        DELETE FROM authorized_users WHERE email = $1 RETURNING *
      `, [email]);
      
      if (result.rows.length === 0) {
        throw new Error('Authorized user not found');
      }
      
      console.log('✅ Authorized user removed:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error removing authorized user:', error.message);
      throw error;
    }
  }
  
  // Check if user is superadmin
  static async isSuperAdmin(email) {
    try {
      const result = await pool.query(`
        SELECT is_superadmin FROM authorized_users WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      return result.rows[0].is_superadmin;
    } catch (error) {
      console.error('❌ Error checking superadmin status:', error.message);
      return false;
    }
  }
}

module.exports = AuthService;
