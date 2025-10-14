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

  // Get authorized user by ID
  static async getAuthorizedUserById(id) {
    try {
      const result = await pool.query(`
        SELECT * FROM authorized_users WHERE id = $1
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting authorized user by ID:', error.message);
      throw error;
    }
  }

  // Update authorized user by ID
  static async updateAuthorizedUserById(id, updateData) {
    try {
      console.log('🔄 Updating authorized user by ID:', id, 'with data:', updateData);
      
      // Build dynamic UPDATE query based on provided fields
      const allowedFields = ['name', 'email', 'role', 'is_superadmin'];
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = $${paramCount}`);
          values.push(updateData[field]);
          paramCount++;
        }
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      // Always update the updated_at timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add the ID as the last parameter
      values.push(id);
      
      const query = `
        UPDATE authorized_users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      console.log('🔍 SQL Query:', query);
      console.log('🔍 Values:', values);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      console.log('✅ User updated successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating authorized user by ID:', error.message);
      throw error;
    }
  }

  // Delete authorized user by ID
  static async deleteAuthorizedUserById(id) {
    try {
      const result = await pool.query(`
        DELETE FROM authorized_users WHERE id = $1 RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error deleting authorized user by ID:', error.message);
      throw error;
    }
  }

  // Bulk update authorized users
  static async bulkUpdateAuthorizedUsers(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const { id, ...updateData } = update;
        const result = await this.updateAuthorizedUserById(id, updateData);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error bulk updating authorized users:', error.message);
      throw error;
    }
  }
}

module.exports = AuthService;
