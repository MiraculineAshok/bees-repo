// Load environment variables from .env file
const path = require('path');
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `.env.${env}`) });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
// Load environment variables from .env (local dev)
try { require('dotenv').config(); } catch (e) {}
const morgan = require('morgan');
// Using built-in fetch instead of deprecated request package
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const pool = require('./db/pool');

// Audit System
const AuditService = require('./services/auditService');
const { auditMiddleware, auditErrorMiddleware, logUserAction } = require('./middleware/auditMiddleware');

// Cloudinary configuration (optional)
let cloudinary = null;
try {
  cloudinary = require('./config/cloudinary');
  const hasEnv = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (!hasEnv) {
    console.warn('⚠️ Cloudinary config present but env vars missing; uploads will fall back to local.');
  }
  console.log(`[Startup] Cloudinary configured=${!!cloudinary} env=${hasEnv}`);
} catch (error) {
  console.log('⚠️ Cloudinary config not found, using local storage fallback');
}

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(photoUrl) {
  try {
    if (!cloudinary) {
      console.log('⚠️ Cloudinary not available, skipping deletion');
      return;
    }
    
    if (!photoUrl || !photoUrl.includes('cloudinary.com')) {
      console.log('Skipping deletion - not a Cloudinary URL:', photoUrl);
      return; // Not a Cloudinary URL
    }
    
    // Extract public ID from URL
    const publicId = photoUrl.split('/').pop().split('.')[0];
    const fullPublicId = `interview-photos/${publicId}`;
    
    console.log(`🗑️ Attempting to delete from Cloudinary: ${fullPublicId}`);
    await cloudinary.uploader.destroy(fullPublicId);
    console.log(`✅ Deleted image from Cloudinary: ${fullPublicId}`);
  } catch (error) {
    console.warn('⚠️ Error deleting image from Cloudinary (continuing anyway):', error.message);
    // Don't throw the error - we want to continue even if Cloudinary deletion fails
  }
}
const { initializeDatabase } = require('./db/init');
const UserService = require('./services/userService');
const StudentService = require('./services/studentService');
const AuthService = require('./services/authService');
const InterviewService = require('./services/interviewService');
const QuestionBankService = require('./services/questionBankService');
const AdminService = require('./services/adminService');
const InterviewerService = require('./services/interviewerService');

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || 'https://bees-repo.onrender.com';

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            connectSrc: ["'self'", "https://api.cloudinary.com"], // Allow Cloudinary API calls
            fontSrc: ["'self'", "https:", "data:"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.quilljs.com"], // Allow Quill.js CDN
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            styleSrc: ["'self'", "https:", "'unsafe-inline'", "https://cdn.quilljs.com"], // Allow Quill.js styles
            upgradeInsecureRequests: []
        }
    }
})); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(cookieParser());
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with 50MB limit for rich text with images
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies with 50MB limit

// Audit Middleware - Log all API requests and responses
app.use(auditMiddleware({
    excludePaths: ['/health', '/favicon.ico', '/logo.png', '/logo1.png'],
    excludeStaticAssets: true,
    logRequestBody: true,
    logResponseBody: true,
    maxBodySize: 5000 // Limit body logging to 5KB to prevent huge logs
}));
// Legacy standalone dashboards (kept for full-featured list views and filters)
app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.get('/interviewer-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'interviewer-dashboard.html'));
});

app.get('/audit-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'audit-dashboard.html'));
});

// Serve static files with explicit MIME types
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, path) => {
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Ensure uploads directory exists
const uploadsDir = 'uploads';
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
    }
} catch (error) {
    console.warn('⚠️ Could not create uploads directory:', error.message);
    console.log('📁 Will use temporary directory for uploads');
}

// Configure multer for file uploads
// Prefer in-memory storage when Cloudinary is configured so we can stream upload
const hasCloudinaryEnv = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use uploads directory if it exists, otherwise use temp directory
        const destDir = fs.existsSync(uploadsDir) ? uploadsDir + '/' : '/tmp/';
        cb(null, destDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'interview-photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const storage = (cloudinary && hasCloudinaryEnv) ? multer.memoryStorage() : diskStorage;

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Only allow image files
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Interview page route
app.get('/interview', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview.html'));
});

// Interview session page route
app.get('/interview-session', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview-session.html'));
});

// React SPA removed; serving legacy dashboards directly

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Cloudinary status (prod verification)
app.get('/api/cloudinary/status', async (req, res) => {
  try {
    const hasEnv = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    const hasConfig = !!cloudinary;
    let ping = null;
    if (hasConfig && hasEnv) {
      try {
        // Admin API ping
        ping = await cloudinary.api.ping();
      } catch (e) {
        ping = { ok: false, error: e.message };
      }
    }
    res.json({ success: true, data: { hasEnv, hasConfig, ping } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Serve unauthorized page
app.get('/unauthorized', (req, res) => {
  res.sendFile(path.join(__dirname, 'unauthorized.html'));
});

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from the API!',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// User API endpoints
app.get('/api/users', async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await UserService.updateUser(id, updateData);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await UserService.deleteUser(id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

app.put('/api/users/bulk', async (req, res) => {
  try {
    const { updates } = req.body; // Array of {id, data} objects
    
    const results = await UserService.bulkUpdateUsers(updates);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update users'
    });
  }
});

// Interviewer: list sessions where interviewer is a panelist
app.get('/api/interviewer/sessions', async (req, res) => {
  try {
    console.log('🔍 /api/interviewer/sessions called');
    
    const interviewerId = await getCurrentUserId(req);
    console.log('👤 Current interviewer ID:', interviewerId);
    
    if (!interviewerId) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Ensure DB available
    try {
      await pool.query('SELECT 1');
    } catch (_) {
      console.log('❌ Database not available');
      return res.json({ success: true, data: [] });
    }

    // Check if session_panelists exists; if not, return none
    let hasPanel = false;
    try {
      const reg = await pool.query("SELECT to_regclass('public.session_panelists') AS reg");
      hasPanel = !!reg.rows[0]?.reg;
      console.log('📋 session_panelists table exists:', hasPanel);
    } catch (_) { hasPanel = false; }

    if (!hasPanel) {
      console.log('❌ session_panelists table does not exist');
      return res.json({ success: true, data: [] });
    }

    // Check what panelist assignments exist for this user
    const panelCheck = await pool.query(
      'SELECT session_id FROM session_panelists WHERE user_id = $1',
      [interviewerId]
    );
    console.log(`🔍 User ${interviewerId} is assigned to ${panelCheck.rows.length} sessions:`, panelCheck.rows.map(r => r.session_id));

    const result = await pool.query(
      `SELECT ins.id, ins.name, ins.description, ins.status, ins.created_at
         FROM interview_sessions ins
         JOIN session_panelists sp ON sp.session_id = ins.id
        WHERE sp.user_id = $1
        ORDER BY ins.created_at DESC`,
      [interviewerId]
    );
    
    console.log(`✅ Found ${result.rows.length} sessions for interviewer ${interviewerId}`);
    result.rows.forEach(session => {
      console.log(`   - Session ${session.id}: ${session.name} (${session.status})`);
    });
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error getting interviewer sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student API endpoints
app.get('/api/students', async (req, res) => {
  try {
    const students = await StudentService.getAllStudents();
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students'
    });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await StudentService.getStudentById(req.params.id);
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const student = await StudentService.createStudent(req.body);
    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await StudentService.updateStudent(req.params.id, req.body);
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await StudentService.deleteStudent(req.params.id);
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/students/search/:term', async (req, res) => {
  try {
    const students = await StudentService.searchStudents(req.params.term);
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search students'
    });
  }
});

// Get student by zeta_id
app.get('/api/students/zeta/:zeta_id', async (req, res) => {
  try {
    const student = await StudentService.getStudentByZetaId(req.params.zeta_id);
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student'
    });
  }
});

app.get('/api/students-count', async (req, res) => {
  try {
    const count = await StudentService.getStudentsCount();
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error getting students count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get students count'
    });
  }
});

// Authorized Users API endpoints
app.get('/api/authorized-users', async (req, res) => {
  try {
    const users = await AuthService.getAllAuthorizedUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching authorized users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch authorized users'
    });
  }
});

app.post('/api/authorized-users', async (req, res) => {
  try {
    const user = await AuthService.addAuthorizedUser(req.body);
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error adding authorized user:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DISABLED: Email-based routes - they conflict with ID-based routes
// Express matches /api/authorized-users/202 to :email route instead of :id route
// because both have the same pattern /:param
// 
// If you need email-based operations, use different paths like:
// /api/authorized-users/by-email/:email
/*
app.put('/api/authorized-users/:email', async (req, res) => {
  try {
    const user = await AuthService.updateAuthorizedUser(req.params.email, req.body);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating authorized user:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/authorized-users/:email', async (req, res) => {
  try {
    const user = await AuthService.removeAuthorizedUser(req.params.email);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error removing authorized user:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});
*/

// Get authorized user by ID
app.get('/api/authorized-users/:id', async (req, res) => {
  try {
    const user = await AuthService.getAuthorizedUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching authorized user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Update authorized user by ID
app.put('/api/authorized-users/:id', async (req, res) => {
  try {
    console.log('📝 PUT /api/authorized-users/:id called');
    console.log('   User ID:', req.params.id);
    console.log('   Update data:', JSON.stringify(req.body, null, 2));
    
    const user = await AuthService.updateAuthorizedUserById(req.params.id, req.body);
    
    console.log('✅ User updated successfully:', user);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Error updating authorized user:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   User ID:', req.params.id);
    console.error('   Request body:', JSON.stringify(req.body, null, 2));
    
    res.status(400).json({
      success: false,
      error: error.message,
      message: error.message // Include message for frontend
    });
  }
});

// Delete authorized user by ID
app.delete('/api/authorized-users/:id', async (req, res) => {
  try {
    const user = await AuthService.deleteAuthorizedUserById(req.params.id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error deleting authorized user:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk update authorized users
app.put('/api/authorized-users/bulk', async (req, res) => {
  try {
    const result = await AuthService.bulkUpdateAuthorizedUsers(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error bulk updating authorized users:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to get current user ID from request
async function getCurrentUserId(req) {
  try {
    console.log('🔍 getCurrentUserId called');
    console.log('   req.query.email:', req.query.email);
    console.log('   req.headers[x-user-email]:', req.headers['x-user-email']);
    console.log('   All query params:', JSON.stringify(req.query));
    console.log('   Relevant headers:', JSON.stringify({
      'x-user-email': req.headers['x-user-email'],
      'authorization': req.headers['authorization'] ? '[PRESENT]' : '[MISSING]',
      'cookie': req.headers['cookie'] ? '[PRESENT]' : '[MISSING]'
    }));
    
    // Get user email from query parameter or headers
    const userEmail = req.query.email || req.headers['x-user-email'];
    
    if (!userEmail) {
      console.log('❌ No user email found in request');
      return null;
    }
    
    console.log('📧 User email found:', userEmail);
    
    // Check if database is available
    try {
      await pool.query('SELECT 1');
      
      // Get user ID from authorized_users table
      const result = await pool.query(
        'SELECT id FROM authorized_users WHERE email = $1',
        [userEmail]
      );
      
      if (result.rows.length > 0) {
        console.log('✅ User ID found:', result.rows[0].id);
        return result.rows[0].id;
      }
      
      console.log('❌ No user found with email:', userEmail);
      return null;
    } catch (dbError) {
      console.log('📝 Database unavailable, using mock data for getCurrentUserId');
      
      // Use mock data
      const mockDataService = require('./services/mockDataService');
      return mockDataService.getUserIdByEmail(userEmail);
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

// Get user ID by email
app.get('/api/user/id', async (req, res) => {
  try {
    const userEmail = req.query.email;
    console.log('🔍 User ID API called with email:', userEmail);
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required'
      });
    }
    
    // Check if database is available
    try {
      await pool.query('SELECT 1');
      
      // Get user ID from authorized_users table
      const result = await pool.query(
        'SELECT id FROM authorized_users WHERE email = $1',
        [userEmail]
      );
      
      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        console.log('✅ Found user ID:', userId);
        res.json({
          success: true,
          userId: userId
        });
      } else {
        console.log('❌ User not found in database');
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    } catch (dbError) {
      console.log('📝 Database unavailable, using mock data for user ID');
      
      // Use mock data
      const mockDataService = require('./services/mockDataService');
      const userId = mockDataService.getUserIdByEmail(userEmail);
      
      if (userId) {
        console.log('✅ Found user ID in mock data:', userId);
        res.json({
          success: true,
          userId: userId
        });
      } else {
        console.log('❌ User not found in mock data');
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    }
  } catch (error) {
    console.error('❌ Server: Error getting user ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user role
app.get('/api/user/role', async (req, res) => {
  try {
    // Get user email from query parameter or headers
    const userEmail = req.query.email || req.headers['x-user-email'];
    console.log('🔍 Role API called with email:', userEmail);
    
    if (!userEmail) {
      console.log('📝 No email provided, returning default role: interviewer');
      return res.json({
        success: true,
        role: 'interviewer' // Default role if no email provided
      });
    }
    
    // Check database for user role
    try {
      console.log('🔍 Querying database for user role...');
      const result = await pool.query(
        'SELECT role FROM authorized_users WHERE email = $1',
        [userEmail]
      );
      
      console.log('📊 Database result:', result.rows);
      
      if (result.rows.length > 0) {
        const role = result.rows[0].role;
        console.log('✅ Found user role:', role);
        res.json({
          success: true,
          role: role
        });
      } else {
        // User not found in database, default to interviewer
        console.log('❌ User not found in database, returning default role: interviewer');
        res.json({
          success: true,
          role: 'interviewer'
        });
      }
    } catch (dbError) {
      console.error('❌ Database error getting user role:', dbError);
      // Fallback to default role
      res.json({
        success: true,
        role: 'interviewer'
      });
    }
  } catch (error) {
    console.error('❌ Server: Error getting user role:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await UserService.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Interview API routes
app.post('/api/interviews', async (req, res) => {
  try {
    const { student_id, interviewer_id, session_id } = req.body;
    const interview = await InterviewService.createInterview(student_id, interviewer_id, session_id);
    
    // Log interview creation
    await AuditService.logUserAction(
      'CREATE_INTERVIEW',
      interviewer_id,
      req.query.email || req.headers['x-user-email'],
      req.userRole,
      {
        student_id,
        session_id,
        interview_id: interview.id
      },
      'INTERVIEW',
      interview.id
    );
    
    res.status(201).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/interviews/:id', async (req, res) => {
  try {
    const interview = await InterviewService.getInterviewById(req.params.id);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error getting interview:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/interviews/student/:studentId', async (req, res) => {
  try {
    // Get current interviewer ID from query parameter
    const currentInterviewerId = req.query.interviewer_id ? parseInt(req.query.interviewer_id) : null;
    const interview = await InterviewService.getInterviewByStudentId(req.params.studentId, currentInterviewerId);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error getting interview by student:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/interviews/student/:studentId/history', async (req, res) => {
  try {
    const interviews = await InterviewService.getStudentInterviewHistory(req.params.studentId);
    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Error getting student interview history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/interviews/:id/questions', async (req, res, next) => {
  try {
    const { question_text, question_rich_content } = req.body;
    console.log('📝 Adding question:', { 
      interviewId: req.params.id, 
      question_text: question_text?.substring(0, 50), 
      has_rich_content: !!question_rich_content,
      rich_content_length: question_rich_content?.length
    });
    
    if (!question_text) {
      return res.status(400).json({
        success: false,
        error: 'question_text is required'
      });
    }
    
    const question = await InterviewService.addQuestion(req.params.id, question_text, question_rich_content);
    
    console.log('✅ Question added successfully:', question.id);
    
    return res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Error adding question:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to add question',
      detail: error.detail,
      code: error.code
    });
  }
});

app.put('/api/interview-questions/:questionId/answer', async (req, res) => {
  try {
    const { student_answer, answer_photo_url } = req.body;
    console.log('🔍 Server: updateAnswer API called with:', {
      questionId: req.params.questionId,
      student_answer,
      answer_photo_url
    });
    
    const question = await InterviewService.updateAnswer(req.params.questionId, student_answer, answer_photo_url);
    console.log('✅ Server: updateAnswer successful, returning:', question);
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Server: Error updating answer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update question correctness
// Update question score (1-10 scale)
app.put('/api/interview-questions/:questionId/score', async (req, res) => {
  try {
    const { correctness_score } = req.body;
    console.log('🔍 Server: updateScore API called with:', {
      questionId: req.params.questionId,
      correctness_score
    });

    const question = await InterviewService.updateScore(req.params.questionId, correctness_score);
    console.log('✅ Server: updateScore successful, returning:', question);

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Server: Error updating question score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy endpoint - keeping for backward compatibility but redirecting to score
app.put('/api/interview-questions/:questionId/correctness', async (req, res) => {
  try {
    const { is_correct } = req.body;
    console.log('⚠️  Server: Legacy correctness API called - converting to score system');
    
    // Convert boolean to score: true = 8/10, false = 3/10
    const correctness_score = is_correct ? 8 : 3;
    
    const question = await InterviewService.updateScore(req.params.questionId, correctness_score);
    console.log('✅ Server: Legacy updateCorrectness converted to score:', correctness_score);

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Server: Error updating correctness:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update question text
app.put('/api/interview-questions/:questionId/text', async (req, res) => {
  try {
    const { question_text } = req.body;
    console.log('🔍 Server: updateQuestionText API called with:', {
      questionId: req.params.questionId,
      question_text
    });

    const question = await InterviewService.updateQuestionText(req.params.questionId, question_text);
    console.log('✅ Server: updateQuestionText successful, returning:', question);
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('❌ Server: updateQuestionText error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Individual edit endpoints
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const student = await StudentService.updateStudent(id, updateData);
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const session = await AdminService.updateSession(id, updateData);
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update session panelists
app.put('/api/sessions/:id/panelists', async (req, res) => {
  try {
    const { id } = req.params;
    const { panelist_ids = [] } = req.body;
    const result = await AdminService.updateSessionPanelists(id, panelist_ids);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating session panelists:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/interviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const interview = await InterviewService.updateInterview(id, updateData);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/question-bank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const question = await QuestionBankService.updateQuestion(id, updateData);
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk edit endpoints
app.put('/api/students/bulk', async (req, res) => {
  try {
    const { updates } = req.body; // Array of {id, data} objects

    const results = await StudentService.bulkUpdateStudents(updates);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating students:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/sessions/bulk', async (req, res) => {
  try {
    const { updates } = req.body; // Array of {id, data} objects

    // For now, return a mock response since we don't have a SessionService
    // In a real implementation, you would create a SessionService
    const results = updates.map(update => ({
      id: update.id,
      ...update.data
    }));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating sessions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/interviews/bulk', async (req, res) => {
  try {
    const { updates } = req.body;
    
    const results = await InterviewService.bulkUpdateInterviews(updates);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating interviews:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/question-bank/bulk', async (req, res) => {
  try {
    const { updates } = req.body;

    const results = await QuestionBankService.bulkUpdateQuestions(updates);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating questions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/question-bank/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'Questions array is required'
      });
    }

    const results = await QuestionBankService.bulkImportQuestions(questions);
    res.json({
      success: true,
      imported: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error bulk importing questions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk import questions from CSV/Excel
app.post('/api/question-bank/bulk-import', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'Questions array is required'
      });
    }

    console.log(`📥 Bulk import request: ${questions.length} questions`);
    
    const results = await QuestionBankService.bulkImportQuestions(questions);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk importing questions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete endpoints
app.delete('/api/interviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await InterviewService.isDatabaseAvailable())) {
      return res.json({ success: true, message: 'Interview deleted (mock)' });
    }
    const result = await pool.query('DELETE FROM interviews WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }
    res.json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await AdminService.isDatabaseAvailable())) {
      return res.json({ success: true, message: 'Session deleted (mock)' });
    }
    // Prevent deleting sessions with interviews
    const cnt = await pool.query('SELECT COUNT(*) AS c FROM interviews WHERE session_id = $1', [id]);
    if (parseInt(cnt.rows[0].c) > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete session with existing interviews' });
    }
    const result = await pool.query('DELETE FROM interview_sessions WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete interview question
app.delete('/api/interview-questions/:questionId', async (req, res) => {
  try {
    console.log('🗑️ Server: deleteQuestion API called with questionId:', req.params.questionId);
    
    const result = await InterviewService.deleteQuestion(req.params.questionId);
    console.log('✅ Server: deleteQuestion successful');
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('❌ Server: Error deleting question:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update interview duration
app.put('/api/interviews/:id/duration', async (req, res) => {
  try {
    const { duration_seconds, end_time } = req.body;
    console.log('⏱️ Server: updateDuration API called with:', {
      interviewId: req.params.id,
      duration_seconds,
      end_time
    });
    
    const result = await InterviewService.updateDuration(req.params.id, duration_seconds, end_time);
    console.log('✅ Server: updateDuration successful');
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Server: Error updating duration:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});


app.get('/api/interviews/:id/questions', async (req, res) => {
  try {
    const questions = await InterviewService.getInterviewQuestions(req.params.id);
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error getting interview questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/interviews/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    const interview = await InterviewService.updateInterviewNotes(req.params.id, notes);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error updating interview notes:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/interviews/:id/complete', async (req, res) => {
  try {
    const interview = await InterviewService.completeInterview(req.params.id);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update interview verdict
app.put('/api/interviews/:id/verdict', async (req, res) => {
  try {
    const { verdict } = req.body;
    const interview = await InterviewService.updateVerdict(req.params.id, verdict);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error updating verdict:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Question Bank API endpoints
app.get('/api/question-bank', async (req, res) => {
  try {
    const questions = await QuestionBankService.getAllQuestions();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/question-bank/categories', async (req, res) => {
  try {
    const categories = await QuestionBankService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/question-bank/tags', async (req, res) => {
  try {
    const tags = await QuestionBankService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/question-bank/categories', async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }
    
    const result = await QuestionBankService.addCategory(category);
    res.json(result);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add category'
    });
  }
});

app.get('/api/question-bank/category/:category', async (req, res) => {
  try {
    const questions = await QuestionBankService.getQuestionsByCategory(req.params.category);
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/question-bank/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    const questions = await QuestionBankService.searchQuestions(q);
    res.json(questions);
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/question-bank/popular', async (req, res) => {
  try {
    const { limit } = req.query;
    const questions = await QuestionBankService.getPopularQuestions(parseInt(limit) || 10);
    res.json(questions);
  } catch (error) {
    console.error('Error fetching popular questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/question-bank', async (req, res) => {
  try {
    const { question, category, tags } = req.body;
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    // Support both tags (new) and category (legacy) - convert category to tags if needed
    const questionTags = tags || (category ? [category] : []);
    const result = await QuestionBankService.addQuestion(question, questionTags);
    res.json(result);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/question-bank/:id', async (req, res) => {
  try {
    const { question, category, tags } = req.body;
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    // Support both tags (new) and category (legacy)
    const questionTags = tags || (category ? [category] : []);
    const result = await QuestionBankService.updateQuestion(req.params.id, question, questionTags);
    res.json(result);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/question-bank/:id', async (req, res) => {
  try {
    const result = await QuestionBankService.deleteQuestion(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/question-bank/:id/increment', async (req, res) => {
  try {
    const result = await QuestionBankService.incrementTimesAsked(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error incrementing times asked:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin Dashboard API endpoints
app.get('/api/admin/overview', async (req, res) => {
  try {
    const stats = await AdminService.getOverviewStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting overview stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all interviewers
app.get('/api/admin/users/interviewers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM authorized_users WHERE role = $1 ORDER BY name',
      ['interviewer']
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting interviewers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new interviewer
app.post('/api/admin/users/interviewers', async (req, res) => {
  try {
    const { name, email, role = 'interviewer' } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM authorized_users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Create new user
    const result = await pool.query(
      'INSERT INTO authorized_users (name, email, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, name, email, role',
      [name, email, role]
    );
    
    const newUser = result.rows[0];
    
    // Add to authorized users table
    await pool.query(
      'INSERT INTO authorized_users (email, name, role, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (email) DO NOTHING',
      [email, name, role]
    );
    
    res.json({
      success: true,
      data: newUser,
      message: 'Interviewer added successfully'
    });
  } catch (error) {
    console.error('Error adding interviewer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/interviews', async (req, res) => {
  try {
    const interviews = await AdminService.getAllInterviews();
    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Error getting all interviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/interviews/stats', async (req, res) => {
  try {
    const stats = await AdminService.getInterviewStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting interview stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/questions/stats', async (req, res) => {
  try {
    const stats = await AdminService.getQuestionsStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting questions stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/questions/analytics', async (req, res) => {
  try {
    const analytics = await AdminService.getQuestionsAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting questions analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/questions/:id/details', async (req, res) => {
  try {
    const details = await AdminService.getQuestionDetails(req.params.id);
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error getting question details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Consolidation API
app.get('/api/admin/consolidation', async (req, res) => {
  try {
    if (!pool) return res.json({ success: true, data: [] });
    const result = await pool.query(`
      SELECT 
        c.id,
        c.student_id,
        c.session_id,
        c.student_name,
        c.student_email,
        c.zeta_id,
        c.session_name,
        c.interviewer_ids,
        c.interviewer_names,
        c.verdicts,
        c.status,
        -- concatenate latest notes from interviews for this student+session
        (
          SELECT STRING_AGG(COALESCE(i.overall_notes, ''), ' \n---\n ' ORDER BY i.created_at DESC)
          FROM interviews i
          WHERE i.student_id = c.student_id AND (c.session_id IS NULL OR i.session_id = c.session_id)
        ) AS notes,
        c.last_interview_at,
        c.created_at,
        c.updated_at
      FROM interview_consolidation c
      ORDER BY c.last_interview_at DESC NULLS LAST, c.student_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching consolidation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update consolidation status (select/reject/waitlist)
app.put('/api/admin/consolidation/:id/status', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, error: 'DB unavailable' });
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const allowed = ['selected','rejected','waitlisted'];
    if (!allowed.includes(String(status).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const result = await pool.query(
      `UPDATE interview_consolidation SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [String(status).toLowerCase(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Error updating consolidation status:', e);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// Get interviews for a consolidation record
app.get('/api/admin/consolidation/:id/interviews', async (req, res) => {
  try {
    if (!pool) return res.json({ success: true, data: [] });
    const id = Number(req.params.id);
    // Lookup student_id and session_id
    const cons = await pool.query('SELECT student_id, session_id FROM interview_consolidation WHERE id = $1', [id]);
    if (cons.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const { student_id, session_id } = cons.rows[0];
    const interviews = await pool.query(`
      SELECT i.id, i.created_at, i.verdict, i.overall_notes,
             au.name AS interviewer_name, iss.name AS session_name
      FROM interviews i
      LEFT JOIN authorized_users au ON au.id = i.interviewer_id
      LEFT JOIN interview_sessions iss ON iss.id = i.session_id
      WHERE i.student_id = $1 AND ($2::int IS NULL OR i.session_id = $2::int)
      ORDER BY i.created_at DESC
    `, [student_id, session_id]);
    res.json({ success: true, data: interviews.rows });
  } catch (e) {
    console.error('Error fetching consolidation interviews:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch interviews' });
  }
});

// AI Question Generation API
app.post('/api/generate-ai-question', async (req, res) => {
    try {
        const { tags, difficulty } = req.body;
        
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tags are required for AI question generation'
            });
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'AI question generation is not configured. Please set OPENAI_API_KEY environment variable.'
            });
        }

        // Create prompt for OpenAI
        const prompt = `Generate a technical interview question based on the following requirements:
        
Tags: ${tags.join(', ')}
Difficulty: ${difficulty || 'intermediate'}

Please create a well-structured interview question that:
1. Is relevant to the specified tags
2. Matches the difficulty level
3. Is suitable for a technical interview
4. Includes clear context and expectations
5. Can be answered in a reasonable interview timeframe

Format the response as a clear, professional interview question. Do not include the answer.`;

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert technical interviewer who creates high-quality interview questions. Generate questions that are clear, relevant, and appropriate for the specified difficulty level.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}));
            console.error('OpenAI API error:', errorData);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate question from AI service'
            });
        }

        const aiResult = await openaiResponse.json();
        
        if (!aiResult.choices || !aiResult.choices[0] || !aiResult.choices[0].message) {
            return res.status(500).json({
                success: false,
                error: 'Invalid response from AI service'
            });
        }

        const generatedQuestion = aiResult.choices[0].message.content.trim();

        // Format the question as HTML
        const formattedQuestion = `<p>${generatedQuestion.replace(/\n/g, '</p><p>')}</p>`;

        res.json({
            success: true,
            question: formattedQuestion,
            tags: tags,
            difficulty: difficulty
        });

    } catch (error) {
        console.error('Error generating AI question:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while generating question'
        });
    }
});

// Evaluate a question (and optional answer) for difficulty and score
app.post('/api/evaluate-question', async (req, res) => {
  try {
    const { question_text, answer_text } = req.body || {};

    if (!question_text || typeof question_text !== 'string' || question_text.trim() === '') {
      return res.status(400).json({ success: false, error: 'question_text is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'AI evaluation is not configured. Please set OPENAI_API_KEY environment variable.'
      });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const wantsAnswerEval = !!(answer_text && String(answer_text).trim());

    const userPrompt = `You are an expert interviewer. Analyze the following question${wantsAnswerEval ? ' and the provided candidate answer' : ''}.

Question:
"""
${question_text}
"""

${wantsAnswerEval ? `Candidate Answer:
"""
${answer_text}
"""` : ''}

Return STRICT JSON only with keys:
- difficulty_label: one of ["easy","medium","hard"]
- difficulty_score: integer 1-10 (10 hardest)
- answer_score: integer 0-10 or null if no answer
- rationale: short one-sentence rationale

Example:
{"difficulty_label":"medium","difficulty_score":6,"answer_score":8,"rationale":"…"}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a terse, structured evaluator. Always return valid JSON only.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 200
      })
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI evaluation error:', err);
      return res.status(500).json({ success: false, error: 'Failed to evaluate question' });
    }

    const data = await openaiResponse.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // Attempt to parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: extract JSON object heuristically
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json({
        success: true,
        data: {
          difficulty_label: 'unknown',
          difficulty_score: null,
          answer_score: wantsAnswerEval ? null : null,
          rationale: 'AI response could not be parsed'
        }
      });
    }

    // Normalize/validate
    const difficulty_label = String(parsed.difficulty_label || '').toLowerCase();
    const difficulty_score = Number(parsed.difficulty_score);
    const answer_score = parsed.answer_score == null ? null : Number(parsed.answer_score);
    const rationale = String(parsed.rationale || '').slice(0, 300);

    return res.json({ success: true, data: { difficulty_label, difficulty_score, answer_score, rationale } });
  } catch (error) {
    console.error('Error evaluating question:', error);
    res.status(500).json({ success: false, error: 'Error evaluating question' });
  }
});

app.get('/api/admin/sessions', async (req, res) => {
  try {
    console.log('🔍 /api/admin/sessions called');
    console.log('   Query params:', JSON.stringify(req.query));
    console.log('   User email from query:', req.query.email);
    
    const sessions = await AdminService.getAllSessions();
    console.log(`✅ Found ${sessions.length} total sessions for admin`);
    sessions.forEach(session => {
      console.log(`   - Session ${session.id}: ${session.name} (${session.status})`);
    });
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('❌ Error getting all sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/admin/sessions', async (req, res) => {
  try {
    const { name, description, panelists = [] } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Session name is required'
      });
    }

    const session = await AdminService.createSession({ name, description, panelists });
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/admin/sessions/:id', async (req, res) => {
  try {
    const result = await AdminService.deleteSession(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/sessions/stats', async (req, res) => {
  try {
    const stats = await AdminService.getSessionStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/students', async (req, res) => {
  try {
    const students = await AdminService.getAllStudents();
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error getting all students:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/students/stats', async (req, res) => {
  try {
    const stats = await AdminService.getStudentStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting student stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Interviewer Dashboard API endpoints
app.get('/api/interviewer/interviews', async (req, res) => {
  try {
    // Get the actual logged-in user's ID
    const interviewerId = await getCurrentUserId(req);
    
    if (!interviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('🔍 Getting interviews for interviewer ID:', interviewerId);
    const interviews = await InterviewerService.getMyInterviews(interviewerId);
    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Error getting interviewer interviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/interviewer/stats', async (req, res) => {
  try {
    // Get the actual logged-in user's ID
    const interviewerId = await getCurrentUserId(req);
    
    if (!interviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('🔍 Getting stats for interviewer ID:', interviewerId);
    const stats = await InterviewerService.getMyStats(interviewerId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting interviewer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/interviewer/favorites', async (req, res) => {
  try {
    // Get the actual logged-in user's ID
    const interviewerId = await getCurrentUserId(req);
    
    if (!interviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('🔍 Getting favorites for interviewer ID:', interviewerId);
    const favorites = await InterviewerService.getFavorites(interviewerId);
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/interviewer/favorites', async (req, res) => {
  try {
    const { question_id } = req.body;
    // Get the actual logged-in user's ID
    const interviewerId = await getCurrentUserId(req);
    
    if (!interviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('🔍 Adding favorite for interviewer ID:', interviewerId, 'question:', question_id);
    const result = await InterviewerService.addFavorite(interviewerId, question_id);
    res.json({
      success: true,
      data: result,
      message: 'Question added to favorites'
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/interviewer/favorites', async (req, res) => {
  try {
    const { question_id } = req.body;
    // Get the actual logged-in user's ID
    const interviewerId = await getCurrentUserId(req);
    
    if (!interviewerId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('🔍 Removing favorite for interviewer ID:', interviewerId, 'question:', question_id);
    const result = await InterviewerService.removeFavorite(interviewerId, question_id);
    res.json({
      success: true,
      data: result,
      message: 'Question removed from favorites'
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Image upload endpoint
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('📸 Photo upload started:', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    let photoUrl;
    let publicId = null;

    if (cloudinary) {
      try {
        // Try to upload to Cloudinary first
        console.log('☁️ Attempting Cloudinary upload...');
        if (req.file.buffer) {
          // Memory -> stream
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'interview-photos',
                resource_type: 'auto',
                transformation: [
                  { width: 800, height: 600, crop: 'limit' },
                  { quality: 'auto' }
                ]
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            require('stream').Readable.from(req.file.buffer).pipe(uploadStream);
          });
          photoUrl = result.secure_url;
          publicId = result.public_id;
          console.log('✅ Cloudinary upload successful (stream):', photoUrl);
        } else {
          // Disk path upload
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'interview-photos',
            resource_type: 'auto',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' }
            ]
          });
          photoUrl = result.secure_url;
          publicId = result.public_id;
          try { fs.unlinkSync(req.file.path); } catch {}
          console.log('✅ Cloudinary upload successful (disk):', photoUrl);
        }

      } catch (cloudinaryError) {
        console.warn('⚠️ Cloudinary upload failed, falling back to local storage:', cloudinaryError.message);
        
        // Fallback to local storage
        const isTempDir = !fs.existsSync(uploadsDir);
        photoUrl = isTempDir ? `/tmp/${req.file.filename}` : `/uploads/${req.file.filename}`;
        console.log('📁 Using local storage:', photoUrl);
      }
    } else {
      // Cloudinary not available, use local storage
      console.log('⚠️ Cloudinary not available, using local storage');
      const isTempDir = !fs.existsSync(uploadsDir);
      photoUrl = isTempDir ? `/tmp/${req.file.filename}` : `/uploads/${req.file.filename}`;
      console.log('📁 Using local storage:', photoUrl);
    }

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: photoUrl, // This is what the frontend expects
        photoUrl: photoUrl, // Keep both for compatibility
        publicId: publicId,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    
    // Clean up local file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Zoho OAuth endpoints
app.get('/authredirction', (req, res) => {
  console.log('=== /authredirction API Called ===');
  console.log('Request headers:', req.headers);
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Get all OAuth parameters from environment variables with fallbacks
  const clientId = process.env.ZOHO_CLIENT_ID || '1000.UL4MAM5ZPKYPTLH1M3DABTDVC964ZW';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '2e4e1d8cb9dc7cde4f515b0f9615cbaafb557c6e9a';
  const redirectUrl = process.env.ZOHO_REDIRECT_URL || `${BASE_URL}/getCode`;
  const scope = process.env.ZOHO_SCOPE || 'email';
  const responseType = process.env.ZOHO_RESPONSE_TYPE || 'code';
  const accessType = process.env.ZOHO_ACCESS_TYPE || 'offline';
  const prompt = process.env.ZOHO_PROMPT || 'consent';
  const state = process.env.ZOHO_STATE || req.query.state || 'default-state';
  const zohoAuthUrl = process.env.ZOHO_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/auth';
  const zohoTokenUrl = process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token';
  
  // URL encode the parameters (equivalent to Java's URLEncoder.encode)
  const encodedClientId = encodeURIComponent(clientId);
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const encodedScope = encodeURIComponent(scope);
  const encodedState = encodeURIComponent(state);
  
  // Build the auth URL with all parameters
  const authUrl = zohoAuthUrl
    + '?response_type=' + responseType
    + '&client_id=' + encodedClientId
    + '&scope=' + encodedScope
    + '&redirect_uri=' + encodedRedirectUrl
    + '&access_type=' + accessType
    + '&prompt=' + prompt
    + '&state=' + encodedState;
  
  console.log('Generated auth URL:', authUrl);
  console.log('OAuth Configuration:');
  console.log('  Client ID:', clientId);
  console.log('  Client Secret:', clientSecret ? '[SET]' : '[NOT SET]');
  console.log('  Redirect URL:', redirectUrl);
  console.log('  Scope:', scope);
  console.log('  Response Type:', responseType);
  console.log('  Access Type:', accessType);
  console.log('  Prompt:', prompt);
  console.log('  State:', state);
  console.log('  Auth URL:', zohoAuthUrl);
  console.log('  Token URL:', zohoTokenUrl);
  
  // Set 302 redirect status and Location header (equivalent to your Java code)
  res.status(302);
  res.setHeader('Location', authUrl);
  res.end();
});
//--------------------------------getCode--------------------------------
app.get('/getCode', async (req, res) => {
  const { code } = req.query;
  
  console.log('=== /getCode API Called ===');
  console.log('Received code parameter:', code);
  console.log('Full query parameters:', req.query);
  console.log('Request headers:', req.headers);
  
  if (!code) {
    console.log('ERROR: No authorization code received');
    return res.status(400).json({
      error: 'Authorization code is required',
      message: 'No authorization code received from Zoho'
    });
  }
  
  console.log('✅ Authorization code received successfully:', code);

  // Get OAuth parameters from environment variables
  const clientId = process.env.ZOHO_CLIENT_ID || '1000.UL4MAM5ZPKYPTLH1M3DABTDVC964ZW';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '2e4e1d8cb9dc7cde4f515b0f9615cbaafb557c6e9a';
  const redirectUrl = process.env.ZOHO_REDIRECT_URL || `${BASE_URL}/getCode`;
  const grantType = process.env.ZOHO_GRANT_TYPE || 'authorization_code';
  const zohoTokenUrl = process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token';
  const cookieHeader = process.env.ZOHO_COOKIE_HEADER || 'iamcsr=57700fb3-ff9f-4fac-8c09-656eb8a2576b; zalb_6e73717622=680d8e643c8d4f4ecb79bf7c0a6012e8';

  const options = {
    'method': 'POST',
    'url': zohoTokenUrl,
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader
    },
    form: {
      'client_id': clientId,
      'client_secret': clientSecret,
      'grant_type': grantType,
      'redirect_uri': redirectUrl,
      'code': code
    }
  };

  try {
    // Convert form data to URLSearchParams for fetch
    const formData = new URLSearchParams();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('grant_type', grantType);
    formData.append('redirect_uri', redirectUrl);
    formData.append('code', code);

    const response = await fetch(zohoTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Token response:', responseText);
    
    try {
      const tokenData = JSON.parse(responseText);
      
      // Decode and console the JWT id_token if it exists
      if (tokenData.id_token) {
        console.log('\n=== JWT ID TOKEN DECODED ===');
        try {
          // Decode the JWT without verification (since we don't have the public key)
          const decodedToken = jwt.decode(tokenData.id_token, { complete: true });
          
          console.log('JWT Header:', JSON.stringify(decodedToken.header, null, 2));
          console.log('JWT Payload:', JSON.stringify(decodedToken.payload, null, 2));
          
          // Extract user information from the payload
          if (decodedToken.payload) {
            console.log('\n=== USER INFORMATION ===');
            console.log('User ID (sub):', decodedToken.payload.sub);
            console.log('Email:', decodedToken.payload.email);
            console.log('Email Verified:', decodedToken.payload.email_verified);
            console.log('Issuer:', decodedToken.payload.iss);
            console.log('Audience:', decodedToken.payload.aud);
            console.log('Issued At:', new Date(decodedToken.payload.iat * 1000).toISOString());
            console.log('Expires At:', new Date(decodedToken.payload.exp * 1000).toISOString());
            console.log('Token Type:', decodedToken.payload.token_type || 'JWT');
          }
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError.message);
        }
        console.log('=== END JWT DECODE ===\n');
      }
      
      // Extract user information from JWT and save to database
      let userEmail = null;
      let userName = null;
      let savedUser = null;
      
      if (tokenData.id_token) {
        try {
          const decodedToken = jwt.decode(tokenData.id_token, { complete: true });
          if (decodedToken.payload) {
            userEmail = decodedToken.payload.email;
            userName = decodedToken.payload.name || decodedToken.payload.first_name || 
                      (userEmail ? userEmail.split('@')[0] : null);
            
            // Check if user is authorized to access the application
            if (userEmail) {
              try {
                const isAuthorized = await AuthService.isUserAuthorized(userEmail);
                if (!isAuthorized) {
                  console.log('❌ Unauthorized access attempt by:', userEmail);
                  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
                  return res.redirect(`${baseUrl}/unauthorized?email=${encodeURIComponent(userEmail)}`);
                }
                console.log('✅ User authorized:', userEmail);
              } catch (authError) {
                console.error('❌ Error checking user authorization:', authError);
                const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
                return res.redirect(`${baseUrl}/unauthorized?email=${encodeURIComponent(userEmail || 'unknown')}`);
              }
            }
            
            // Save user to database
            try {
              savedUser = await UserService.createOrUpdateUser(decodedToken.payload);
              console.log('✅ User saved to database:', savedUser);
            } catch (dbError) {
              console.error('❌ Error saving user to database:', dbError);
              // Continue with OAuth flow even if DB save fails
            }
          }
        } catch (jwtError) {
          console.error('Error extracting user info from JWT:', jwtError.message);
        }
      }
      
      // Check if user is admin and redirect accordingly
      const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
      let redirectUrl;
      
      // Check user role from database
      let userRole = 'interviewer'; // Default role
      if (userEmail) {
        try {
          const roleResult = await pool.query(
            'SELECT role FROM authorized_users WHERE email = $1',
            [userEmail]
          );
          if (roleResult.rows.length > 0) {
            userRole = roleResult.rows[0].role;
            console.log('✅ User role from database:', userRole);
          } else {
            console.log('❌ User not found in database, using default role: interviewer');
          }
        } catch (roleError) {
          console.error('❌ Error checking user role:', roleError);
        }
      }
      
      const isAdmin = userRole === 'admin' || userRole === 'superadmin';
      // Redirect to legacy dashboards with context
      const targetPath = isAdmin ? '/admin-dashboard.html' : '/interviewer-dashboard.html';
      redirectUrl = new URL(`${baseUrl}${targetPath}`);
      if (userEmail) redirectUrl.searchParams.set('email', userEmail);
      if (userName) redirectUrl.searchParams.set('name', userName);
      redirectUrl.searchParams.set('role', userRole);
      console.log('Redirecting user to legacy dashboard:', { targetPath, userEmail, userName, userRole });
      
      // Log successful login to audit system
      await AuditService.logAuth(
        'LOGIN_SUCCESS',
        userEmail,
        true,
        {
          userName,
          userRole,
          targetDashboard: targetPath,
          oauthProvider: 'zoho'
        },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );
      
      res.redirect(redirectUrl.toString());
    } catch (parseError) {
      console.error('Error parsing token response:', parseError);
      // Even if parsing fails, try to redirect back to landing page
      const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
      res.redirect(`${baseUrl}/?login=success`);
    }
  } catch (error) {
    console.error('Error making token request:', error);
    return res.status(500).json({
      error: 'Failed to exchange authorization code for token',
      details: error.message
  });
  }
});

// 404 handler removed - was interfering with audit routes

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Test route to debug audit API issues
app.get('/api/admin/audit-test', (req, res) => {
  console.log('🧪 Audit test route called');
  res.json({ success: true, message: 'Audit routes are working', timestamp: new Date().toISOString() });
});

// Audit Log API Endpoints (Admin only)
app.get('/api/admin/audit-logs', async (req, res) => {
  console.log('🔍 /api/admin/audit-logs route hit!');
  console.log('   Method:', req.method);
  console.log('   URL:', req.url);
  console.log('   Original URL:', req.originalUrl);
  console.log('   Query params:', req.query);
  
  try {
    console.log('🔍 Audit logs API called with params:', req.query);
    
    // Check if audit_logs table exists
    try {
      await pool.query('SELECT 1 FROM audit_logs LIMIT 1');
      console.log('✅ audit_logs table exists');
    } catch (tableError) {
      console.log('❌ audit_logs table does not exist:', tableError.message);
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        message: 'Audit logs table not yet created. Please run the migration first.'
      });
    }

    const filters = {
      userId: req.query.userId || null,
      userEmail: req.query.userEmail || null,
      actionType: req.query.actionType || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      success: req.query.success !== undefined ? req.query.success === 'true' : null,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      orderBy: req.query.orderBy || 'created_at',
      orderDirection: req.query.orderDirection || 'DESC'
    };

    console.log('📊 Fetching audit logs with filters:', filters);
    const result = await AuditService.getAuditLogs(filters);
    console.log(`✅ Found ${result.logs.length} audit logs (total: ${result.total})`);
    
    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Try to log the error, but don't fail if audit system is broken
    try {
      await AuditService.logError(error, {
        actionName: 'FETCH_AUDIT_LOGS_ERROR',
        endpoint: req.originalUrl,
        method: req.method
      });
    } catch (logError) {
      console.error('❌ Failed to log audit error:', logError.message);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/admin/audit-stats', async (req, res) => {
  console.log('📊 /api/admin/audit-stats route hit!');
  console.log('   Method:', req.method);
  console.log('   URL:', req.url);
  console.log('   Original URL:', req.originalUrl);
  console.log('   Query params:', req.query);
  
  try {
    console.log('📊 Audit stats API called');
    
    // Check if audit_logs table exists
    try {
      await pool.query('SELECT 1 FROM audit_logs LIMIT 1');
    } catch (tableError) {
      console.log('❌ audit_logs table does not exist for stats');
      return res.json({
        success: true,
        data: []
      });
    }
    
    const days = parseInt(req.query.days) || 30;
    console.log(`📈 Fetching audit stats for last ${days} days`);
    
    const stats = await AuditService.getAuditStats(days);
    console.log(`✅ Found stats for ${stats.length} action types`);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching audit stats:', error);
    console.error('❌ Error stack:', error.stack);
    
    try {
      await AuditService.logError(error, {
        actionName: 'FETCH_AUDIT_STATS_ERROR',
        endpoint: req.originalUrl,
        method: req.method
      });
    } catch (logError) {
      console.error('❌ Failed to log audit error:', logError.message);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/admin/audit-cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep) || 90;
    const deletedCount = await AuditService.cleanupOldLogs(daysToKeep);
    
    await AuditService.logUserAction(
      'AUDIT_CLEANUP',
      req.userId,
      req.query.email || req.headers['x-user-email'],
      req.userRole,
      { daysToKeep, deletedCount }
    );
    
    res.json({
      success: true,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('❌ Error cleaning up audit logs:', error);
    await AuditService.logError(error, {
      actionName: 'AUDIT_CLEANUP_ERROR',
      endpoint: req.originalUrl,
      method: req.method
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add audit error middleware (must be after all routes)
app.use(auditErrorMiddleware);

// Global error handler
app.use(async (error, req, res, next) => {
  // Log the error to audit system
  await AuditService.logError(error, {
    userId: req.userId,
    userEmail: req.query.email || req.headers['x-user-email'],
    userRole: req.userRole,
    actionName: 'UNHANDLED_ERROR',
    endpoint: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId
  });

  // Send error response
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// Debug middleware to log all requests (for troubleshooting)
app.use((req, res, next) => {
  if (req.url.includes('/api/admin/audit')) {
    console.log('🔍 Request intercepted:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path
    });
  }
  next();
});

// Catch-all for unmatched API routes (MUST BE LAST)
app.use('/api/*', (req, res) => {
  console.log('❌ Unmatched API route:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path
  });
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server with fallback when port in use (local dev)
function startServer(port) {
  const server = app.listen(port, async () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📍 Local: http://localhost:${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);

  try {
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
      console.error('This is likely due to missing DATABASE_URL environment variable.');
      console.error('Please check your Render environment variables.');
  }
  
  console.log('\n📋 Environment Configuration:');
  console.log(`  BASE_URL: ${BASE_URL}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
  console.log(`  DATABASE_POOL_URL: ${process.env.DATABASE_POOL_URL ? '[SET]' : '[NOT SET]'}`);
  console.log(`  ZOHO_CLIENT_ID: ${process.env.ZOHO_CLIENT_ID ? '[SET]' : '[NOT SET]'}`);
  console.log(`  ZOHO_CLIENT_SECRET: ${process.env.ZOHO_CLIENT_SECRET ? '[SET]' : '[NOT SET]'}`);
  console.log(`  ZOHO_REDIRECT_URL: ${process.env.ZOHO_REDIRECT_URL || '[DEFAULT]'}`);
  console.log(`  ZOHO_SCOPE: ${process.env.ZOHO_SCOPE || '[DEFAULT]'}`);
  console.log(`  ZOHO_AUTH_URL: ${process.env.ZOHO_AUTH_URL || '[DEFAULT]'}`);
  console.log(`  ZOHO_TOKEN_URL: ${process.env.ZOHO_TOKEN_URL || '[DEFAULT]'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`⚠️ Port ${port} in use, trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      throw err;
    }
  });
}

startServer(PORT);

module.exports = app;
