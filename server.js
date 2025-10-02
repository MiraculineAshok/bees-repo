// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const request = require('request');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
// Cloudinary configuration (optional)
let cloudinary = null;
try {
  cloudinary = require('./config/cloudinary');
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

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || 'https://bees-repo.onrender.com';

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            styleSrc: ["'self'", "https:", "'unsafe-inline'"],
            upgradeInsecureRequests: []
        }
    }
})); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname))); // Serve static files

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
const storage = multer.diskStorage({
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

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
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

// Get user role
app.get('/api/user/role', async (req, res) => {
  try {
    // For now, return a mock role - you can implement proper authentication later
    // In a real app, you'd get this from the authenticated user's session/token
    const mockRole = 'superadmin'; // Change to 'interviewer' to test role-based access
    
    res.json({
      success: true,
      role: mockRole
    });
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
    const interview = await InterviewService.getInterviewByStudentId(req.params.studentId);
    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Error getting interview by student:', error);
    res.status(404).json({
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

app.post('/api/interviews/:id/questions', async (req, res) => {
  try {
    const { question_text } = req.body;
    const question = await InterviewService.addQuestion(req.params.id, question_text);
    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(400).json({
      success: false,
      error: error.message
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
    const { question, category } = req.body;
    if (!question || !category) {
      return res.status(400).json({
        success: false,
        error: 'Question and category are required'
      });
    }
    const result = await QuestionBankService.addQuestion(question, category);
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
    const { question, category } = req.body;
    if (!question || !category) {
      return res.status(400).json({
        success: false,
        error: 'Question and category are required'
      });
    }
    const result = await QuestionBankService.updateQuestion(req.params.id, question, category);
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

app.get('/api/admin/sessions', async (req, res) => {
  try {
    const sessions = await AdminService.getAllSessions();
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error getting all sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/admin/sessions', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Session name is required'
      });
    }

    const session = await AdminService.createSession({ name, description });
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
        
        // Delete the local file after successful Cloudinary upload
        fs.unlinkSync(req.file.path);
        console.log('✅ Cloudinary upload successful:', photoUrl);

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

  request(options, async function (error, response) {
    if (error) {
      console.error('Error making token request:', error);
      return res.status(500).json({
        error: 'Failed to exchange authorization code for token',
        details: error.message
      });
    }
    
    console.log('Token response:', response.body);
    
    try {
      const tokenData = JSON.parse(response.body);
      
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
      
      // Redirect back to landing page with user information
      const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
      const redirectUrl = new URL(`${baseUrl}/`);
      if (userEmail) redirectUrl.searchParams.set('email', userEmail);
      if (userName) redirectUrl.searchParams.set('name', userName);
      
      console.log('Redirecting user back to landing page with info:', { userEmail, userName });
      res.redirect(redirectUrl.toString());
    } catch (parseError) {
      console.error('Error parsing token response:', parseError);
      // Even if parsing fails, try to redirect back to landing page
      const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
      res.redirect(`${baseUrl}/?login=success`);
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('This is likely due to missing DATABASE_URL environment variable.');
    console.error('Please check your Render environment variables.');
    // Continue running even if DB init fails (for development)
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

module.exports = app;
