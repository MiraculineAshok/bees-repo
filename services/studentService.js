const pool = require('../db/pool');
const mockDataService = require('./mockDataService');

class StudentService {
  // Check if database is available
  static async isDatabaseAvailable() {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.log('📝 Database unavailable, using mock data');
      return false;
    }
  }
  // Create a new student
  static async createStudent(studentData) {
    try {
      const { first_name, last_name, email, phone, address, zeta_id } = studentData;
      
      if (!first_name || !last_name || !email || !zeta_id) {
        throw new Error('Missing required fields: first_name, last_name, email, and zeta_id are required');
      }
      
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.createStudent(studentData);
      }
      
      const result = await pool.query(`
        INSERT INTO students (first_name, last_name, email, phone, address, zeta_id) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, [first_name, last_name, email, phone, address, zeta_id]);
      
      console.log('✅ New student created:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error creating student:', error.message);
      throw error;
    }
  }
  
  // Get all students
  static async getAllStudents() {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.getAllStudents();
      }
      
      const result = await pool.query(`
        SELECT * FROM students 
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all students:', error.message);
      throw error;
    }
  }
  
  // Get student by ID
  static async getStudentById(id) {
    try {
      const result = await pool.query(`
        SELECT * FROM students WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting student by ID:', error.message);
      throw error;
    }
  }
  
  // Get student by Zeta ID
  static async getStudentByZetaId(zeta_id) {
    try {
      const result = await pool.query(`
        SELECT * FROM students WHERE zeta_id = $1
      `, [zeta_id]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting student by Zeta ID:', error.message);
      throw error;
    }
  }
  
  // Get student by email
  static async getStudentByEmail(email) {
    try {
      const result = await pool.query(`
        SELECT * FROM students WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting student by email:', error.message);
      throw error;
    }
  }
  
  // Update student
  static async updateStudent(id, updateData) {
    try {
      const { first_name, last_name, email, phone, address, zeta_id } = updateData;
      
      const result = await pool.query(`
        UPDATE students 
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            address = COALESCE($5, address),
            zeta_id = COALESCE($6, zeta_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [first_name, last_name, email, phone, address, zeta_id, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      console.log('✅ Student updated:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error updating student:', error.message);
      throw error;
    }
  }
  
  // Delete student
  static async deleteStudent(id) {
    try {
      const result = await pool.query(`
        DELETE FROM students WHERE id = $1 RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      console.log('✅ Student deleted:', result.rows[0]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error deleting student:', error.message);
      throw error;
    }
  }
  
  // Search students
  static async searchStudents(searchTerm) {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.searchStudents(searchTerm);
      }
      
      const result = await pool.query(`
        SELECT * FROM students 
        WHERE first_name ILIKE $1 
           OR last_name ILIKE $1 
           OR email ILIKE $1 
           OR zeta_id ILIKE $1 
           OR phone ILIKE $1
        ORDER BY created_at DESC
      `, [`%${searchTerm}%`]);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error searching students:', error.message);
      throw error;
    }
  }

  // Get student by zeta_id
  static async getStudentByZetaId(zetaId) {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.getStudentByZetaId(zetaId);
      }
      
      const result = await pool.query(`
        SELECT * FROM students 
        WHERE zeta_id = $1
      `, [zetaId]);
      
      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting student by zeta_id:', error.message);
      throw error;
    }
  }
  
  // Get students count
  static async getStudentsCount() {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.getStudentsCount();
      }
      
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM students
      `);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Error getting students count:', error.message);
      throw error;
    }
  }

  // Bulk update students
  static async bulkUpdateStudents(updates) {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.bulkUpdateStudents(updates);
      }

      const results = [];
      
      for (const update of updates) {
        const { id, data } = update;
        const result = await this.updateStudent(id, data);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error bulk updating students:', error.message);
      throw error;
    }
  }
}

module.exports = StudentService;
