# Bees Interview Management System

A comprehensive interview management system built with Node.js, Express, and PostgreSQL. This application allows interviewers to manage student interviews, track questions and answers, capture photos, and maintain a question bank.

## Features

### 🎯 Core Functionality
- **Student Management**: Search and manage student records
- **Interview Sessions**: Conduct structured interviews with real-time tracking
- **Question Bank**: Pre-loaded questions categorized by subject (Math, HR, English, Technical, etc.)
- **Photo Capture**: Upload and capture photos of student answer sheets
- **Interview History**: View previous interviews for each student
- **Verdict System**: Rate interviews (Tiger, Cow, Cow+, Sheep)

### 🎨 User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Blue Theme**: Professional and modern UI
- **Chat-like Interface**: Questions and answers displayed in conversation format
- **Real-time Updates**: Live feedback and status updates

### 🔧 Technical Features
- **PostgreSQL Database**: Robust data storage with proper relationships
- **Cloudinary Integration**: Cloud-based image storage and optimization
- **Mock Data Service**: Development mode with sample data
- **RESTful API**: Well-structured API endpoints
- **Error Handling**: Comprehensive error management and user feedback

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (with Neon cloud hosting)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Image Storage**: Cloudinary
- **Authentication**: Session-based (extensible to OAuth)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Cloudinary account (for image storage)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bees-repo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   node db/init.js
   ```

5. **Start the application**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3001`

## API Endpoints

### Students
- `GET /api/students/search/:term` - Search students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student

### Interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews/student/:studentId` - Get active interview for student
- `GET /api/interviews/student/:studentId/history` - Get interview history
- `PUT /api/interviews/:id/complete` - Complete interview
- `PUT /api/interviews/:id/verdict` - Update verdict

### Questions & Answers
- `POST /api/interviews/:id/questions` - Add question to interview
- `PUT /api/interview-questions/:questionId/answer` - Update answer
- `GET /api/interviews/:id/questions` - Get interview questions

### Question Bank
- `GET /api/question-bank` - Get all questions
- `GET /api/question-bank/categories` - Get categories
- `GET /api/question-bank/category/:category` - Get questions by category
- `POST /api/question-bank` - Add question to bank
- `POST /api/question-bank/:id/increment` - Increment question usage

### File Upload
- `POST /api/upload-photo` - Upload image (with Cloudinary fallback)

## Database Schema

### Tables
- **students**: Student information
- **interviews**: Interview sessions
- **interview_questions**: Questions and answers for each interview
- **question_bank**: Pre-loaded questions with categories
- **users**: User authentication (extensible)

## Development

### Mock Data Mode
If no database connection is available, the application automatically falls back to mock data mode for development and testing.

### File Structure
```
bees-repo/
├── db/                    # Database configuration and migrations
├── services/              # Business logic services
├── config/                # Configuration files
├── uploads/               # Local file uploads (gitignored)
├── public/                # Static files
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

---

**Note**: This application is designed for interview management and includes features for photo capture, question tracking, and student evaluation. Make sure to comply with privacy regulations when handling student data and images.