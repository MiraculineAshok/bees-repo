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
  
  // Generate ZETA ID: ZS(school short)(location short)(exam mode)(2digit year)(last 7 digits of phone)
  static async generateZetaId(phone, sessionId = null) {
    try {
      if (!phone) {
        throw new Error('Phone number is required to generate ZETA ID');
      }
      
      // Get last 7 digits of phone
      const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
      const last7Digits = phoneDigits.slice(-7).padStart(7, '0');
      
      // Get current academic year (2 digits) - using last 2 digits of current year
      const currentYear = new Date().getFullYear();
      const academicYear = String(currentYear).slice(-2);
      
      // Default values if no session
      let schoolShort = 'XX';
      let locationShort = 'XX';
      let examModeShort = 'XX';
      
      if (sessionId) {
        // Get session details with school, location, examination_mode
        const sessionResult = await pool.query(`
          SELECT 
            s.short_code as school_short,
            l.short_code as location_short,
            em.short_code as exam_mode_short
          FROM interview_sessions isess
          LEFT JOIN schools s ON isess.school_id = s.id
          LEFT JOIN locations l ON isess.location_id = l.id
          LEFT JOIN examination_mode em ON isess.examination_mode_id = em.id
          WHERE isess.id = $1
        `, [sessionId]);
        
        if (sessionResult.rows.length > 0) {
          const row = sessionResult.rows[0];
          schoolShort = row.school_short || 'XX';
          locationShort = row.location_short || 'XX';
          examModeShort = row.exam_mode_short || 'XX';
        }
      }
      
      // Generate ZETA ID: ZS + school + location + exam mode + year + last 7 digits
      const zetaId = `ZS${schoolShort}${locationShort}${examModeShort}${academicYear}${last7Digits}`;
      
      return zetaId;
    } catch (error) {
      console.error('❌ Error generating ZETA ID:', error.message);
      // Fallback: generate with defaults
      const phoneDigits = phone.replace(/\D/g, '');
      const last7Digits = phoneDigits.slice(-7).padStart(7, '0');
      const currentYear = new Date().getFullYear();
      const academicYear = String(currentYear).slice(-2);
      return `ZSXXXXX${academicYear}${last7Digits}`;
    }
  }
  // Create a new student
  static async createStudent(studentData) {
    try {
      const { first_name, last_name, email, phone, address, zeta_id, session_id } = studentData;
      
      if (!first_name || !last_name || !phone) {
        throw new Error('Missing required fields: first_name, last_name, and phone are required');
      }
      
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.createStudent(studentData);
      }
      
      // Auto-generate ZETA ID if not provided
      let finalZetaId = zeta_id;
      if (!finalZetaId) {
        finalZetaId = await this.generateZetaId(phone, session_id || null);
        
        // Check if generated ZETA ID already exists, if so modify last digit(s)
        let counter = 1;
        let uniqueZetaId = finalZetaId;
        while (true) {
          const existing = await pool.query('SELECT id FROM students WHERE zeta_id = $1', [uniqueZetaId]);
          if (existing.rows.length === 0) {
            break; // ZETA ID is unique
          }
          // Replace last digit(s) with counter to make it unique
          // Format: ZS + 2 + 2 + 2 + 2 + 7 = 17 chars total
          // Replace last 1-2 digits with counter
          if (counter < 10) {
            uniqueZetaId = finalZetaId.slice(0, -1) + counter;
          } else {
            uniqueZetaId = finalZetaId.slice(0, -2) + String(counter).padStart(2, '0');
          }
          counter++;
          if (counter > 99) {
            // If still not unique, use timestamp last 3 digits
            uniqueZetaId = finalZetaId.slice(0, -3) + Date.now().toString().slice(-3);
            break;
          }
        }
        finalZetaId = uniqueZetaId;
      }
      
      const result = await pool.query(`
        INSERT INTO students (first_name, last_name, email, phone, address, zeta_id) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, [first_name, last_name, email || null, phone, address || null, finalZetaId]);
      
      console.log('✅ New student created with ZETA ID:', finalZetaId);
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
  static async searchStudents(searchTerm, sessionId = null) {
    try {
      if (!(await this.isDatabaseAvailable())) {
        return await mockDataService.searchStudents(searchTerm);
      }
      
      let query, params;
      
      if (sessionId) {
        // Filter by students mapped to the specific session
        query = `
          SELECT DISTINCT s.* FROM students s
          INNER JOIN student_sessions ss ON s.id = ss.student_id
          WHERE ss.session_id = $1
            AND (s.first_name ILIKE $2 
               OR s.last_name ILIKE $2 
               OR s.email ILIKE $2 
               OR s.zeta_id ILIKE $2 
               OR s.phone ILIKE $2)
          ORDER BY s.created_at DESC
        `;
        params = [sessionId, `%${searchTerm}%`];
      } else {
        // No session filter - search all students
        query = `
          SELECT * FROM students 
          WHERE first_name ILIKE $1 
             OR last_name ILIKE $1 
             OR email ILIKE $1 
             OR zeta_id ILIKE $1 
             OR phone ILIKE $1
          ORDER BY created_at DESC
        `;
        params = [`%${searchTerm}%`];
      }
      
      const result = await pool.query(query, params);
      
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
