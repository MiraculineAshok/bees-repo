// Mock Data Service for testing without database
class MockDataService {
    constructor() {
        this.students = [
            {
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1-555-0123',
                address: '123 Main St, Anytown, USA',
                zeta_id: 'ZETA001',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@example.com',
                phone: '+1-555-0124',
                address: '456 Oak Ave, Somewhere, USA',
                zeta_id: 'ZETA002',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 3,
                first_name: 'Bob',
                last_name: 'Johnson',
                email: 'bob.johnson@example.com',
                phone: '+1-555-0125',
                address: '789 Pine St, Elsewhere, USA',
                zeta_id: 'ZETA003',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 4,
                first_name: 'Alice',
                last_name: 'Williams',
                email: 'alice.williams@example.com',
                phone: '+1-555-0126',
                address: '321 Elm St, Nowhere, USA',
                zeta_id: 'ZETA004',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 5,
                first_name: 'Charlie',
                last_name: 'Brown',
                email: 'charlie.brown@example.com',
                phone: '+1-555-0127',
                address: '654 Maple Dr, Anywhere, USA',
                zeta_id: 'ZETA005',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        this.users = [
            {
                id: 1,
                email: 'miraculine.j@zohocorp.com',
                name: 'Miraculine J',
                role: 'superadmin',
                zoho_user_id: 'mock_zoho_001',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                email: 'rajendran@zohocorp.com',
                name: 'Rajendran',
                role: 'admin',
                zoho_user_id: 'mock_zoho_002',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        this.authorizedUsers = [
            {
                id: 1,
                email: 'miraculine.j@zohocorp.com',
                name: 'Miraculine J',
                role: 'superadmin',
                is_superadmin: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 2,
                email: 'rajendran@zohocorp.com',
                name: 'Rajendran',
                role: 'admin',
                is_superadmin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        this.interviews = [];
        this.interviewQuestions = [];
    }

    // Student methods
    getAllStudents() {
        return Promise.resolve([...this.students]);
    }

    getStudentById(id) {
        const student = this.students.find(s => s.id === parseInt(id));
        if (!student) {
            throw new Error('Student not found');
        }
        return Promise.resolve({ ...student });
    }

    searchStudents(term) {
        const searchTerm = term.toLowerCase();
        const results = this.students.filter(student => 
            student.zeta_id.toLowerCase().includes(searchTerm) ||
            student.first_name.toLowerCase().includes(searchTerm) ||
            student.last_name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            (student.phone && student.phone.includes(searchTerm))
        );
        return Promise.resolve([...results]);
    }

    getStudentByZetaId(zetaId) {
        const student = this.students.find(s => s.zeta_id === zetaId);
        if (!student) {
            throw new Error('Student not found');
        }
        return Promise.resolve({ ...student });
    }

    createStudent(studentData) {
        const newId = Math.max(...this.students.map(s => s.id)) + 1;
        const newStudent = {
            id: newId,
            ...studentData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.students.push(newStudent);
        return Promise.resolve({ ...newStudent });
    }

    updateStudent(id, updateData) {
        const index = this.students.findIndex(s => s.id === parseInt(id));
        if (index === -1) {
            throw new Error('Student not found');
        }
        this.students[index] = {
            ...this.students[index],
            ...updateData,
            updated_at: new Date().toISOString()
        };
        return Promise.resolve({ ...this.students[index] });
    }

    deleteStudent(id) {
        const index = this.students.findIndex(s => s.id === parseInt(id));
        if (index === -1) {
            throw new Error('Student not found');
        }
        const deletedStudent = this.students.splice(index, 1)[0];
        return Promise.resolve({ ...deletedStudent });
    }

    getStudentsCount() {
        return Promise.resolve(this.students.length);
    }

    // User methods
    getAllUsers() {
        return Promise.resolve([...this.users]);
    }

    getUserByEmail(email) {
        const user = this.users.find(u => u.email === email);
        return Promise.resolve(user ? { ...user } : null);
    }

    createOrUpdateUser(userData) {
        const existingUser = this.users.find(u => u.email === userData.email);
        if (existingUser) {
            const index = this.users.findIndex(u => u.email === userData.email);
            this.users[index] = {
                ...this.users[index],
                ...userData,
                updated_at: new Date().toISOString()
            };
            return Promise.resolve({ ...this.users[index] });
        } else {
            const newId = Math.max(...this.users.map(u => u.id)) + 1;
            const newUser = {
                id: newId,
                ...userData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.users.push(newUser);
            return Promise.resolve({ ...newUser });
        }
    }

    // Authorized Users methods
    getAllAuthorizedUsers() {
        return Promise.resolve([...this.authorizedUsers]);
    }

    isUserAuthorized(email) {
        const authorizedUser = this.authorizedUsers.find(u => u.email === email);
        return Promise.resolve(!!authorizedUser);
    }

    addAuthorizedUser(userData) {
        const newId = Math.max(...this.authorizedUsers.map(u => u.id)) + 1;
        const newUser = {
            id: newId,
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.authorizedUsers.push(newUser);
        return Promise.resolve({ ...newUser });
    }

    updateAuthorizedUser(email, updateData) {
        const index = this.authorizedUsers.findIndex(u => u.email === email);
        if (index === -1) {
            throw new Error('Authorized user not found');
        }
        this.authorizedUsers[index] = {
            ...this.authorizedUsers[index],
            ...updateData,
            updated_at: new Date().toISOString()
        };
        return Promise.resolve({ ...this.authorizedUsers[index] });
    }

    removeAuthorizedUser(email) {
        const index = this.authorizedUsers.findIndex(u => u.email === email);
        if (index === -1) {
            throw new Error('Authorized user not found');
        }
        const deletedUser = this.authorizedUsers.splice(index, 1)[0];
        return Promise.resolve({ ...deletedUser });
    }

    // Interview methods
    createInterview(studentId, interviewerId, sessionId = null, verdict = null) {
        const newId = this.interviews.length > 0 ? Math.max(...this.interviews.map(i => i.id)) + 1 : 1;
        const newInterview = {
            id: newId,
            student_id: studentId,
            interviewer_id: interviewerId,
            session_id: sessionId,
            status: 'in_progress',
            verdict: verdict,
            overall_notes: null,
            interview_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.interviews.push(newInterview);
        return Promise.resolve({ ...newInterview });
    }

    getInterviewById(interviewId) {
        const interview = this.interviews.find(i => i.id === parseInt(interviewId));
        if (!interview) {
            throw new Error('Interview not found');
        }
        return Promise.resolve({ ...interview });
    }

    getInterviewByStudentId(studentId) {
        const interview = this.interviews.find(i => i.student_id === parseInt(studentId) && i.status === 'in_progress');
        return Promise.resolve(interview ? { ...interview } : null);
    }

    getStudentInterviewHistory(studentId) {
        const interviews = this.interviews
            .filter(i => i.student_id === parseInt(studentId))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(interview => ({
                ...interview,
                session_name: 'Face to Face for St Mary\'s School',
                interviewer_name: 'Mock Interviewer',
                interviewer_email: 'interviewer@example.com'
            }));
        return Promise.resolve([...interviews]);
    }

    addQuestion(interviewId, questionText) {
        const newId = this.interviewQuestions.length > 0 ? Math.max(...this.interviewQuestions.map(q => q.id)) + 1 : 1;
        const nextOrder = this.interviewQuestions.filter(q => q.interview_id === parseInt(interviewId)).length + 1;
        
        const newQuestion = {
            id: newId,
            interview_id: parseInt(interviewId),
            question_text: questionText,
            student_answer: null,
            answer_photo_url: null,
            question_order: nextOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.interviewQuestions.push(newQuestion);
        return Promise.resolve({ ...newQuestion });
    }

    updateAnswer(questionId, studentAnswer, answerPhotoUrl = null) {
        const index = this.interviewQuestions.findIndex(q => q.id === parseInt(questionId));
        if (index === -1) {
            throw new Error('Question not found');
        }
        this.interviewQuestions[index] = {
            ...this.interviewQuestions[index],
            student_answer: studentAnswer,
            answer_photo_url: answerPhotoUrl,
            updated_at: new Date().toISOString()
        };
        return Promise.resolve({ ...this.interviewQuestions[index] });
    }

    getInterviewQuestions(interviewId) {
        const questions = this.interviewQuestions
            .filter(q => q.interview_id === parseInt(interviewId))
            .sort((a, b) => a.question_order - b.question_order);
        return Promise.resolve([...questions]);
    }

    updateInterviewNotes(interviewId, notes) {
        const index = this.interviews.findIndex(i => i.id === parseInt(interviewId));
        if (index === -1) {
            throw new Error('Interview not found');
        }
        this.interviews[index] = {
            ...this.interviews[index],
            overall_notes: notes,
            updated_at: new Date().toISOString()
        };
        return Promise.resolve({ ...this.interviews[index] });
    }

    completeInterview(interviewId) {
        const index = this.interviews.findIndex(i => i.id === parseInt(interviewId));
        if (index === -1) {
            throw new Error('Interview not found');
        }
        this.interviews[index] = {
            ...this.interviews[index],
            status: 'completed',
            updated_at: new Date().toISOString()
        };
        return Promise.resolve({ ...this.interviews[index] });
    }

    updateVerdict(interviewId, verdict) {
        const interview = this.interviews.find(i => i.id === parseInt(interviewId));
        if (!interview) {
            throw new Error('Interview not found');
        }
        interview.verdict = verdict;
        interview.updated_at = new Date().toISOString();
        return Promise.resolve({ ...interview });
    }

    deleteQuestion(questionId) {
        console.log('🗑️ MockDataService.deleteQuestion called with questionId:', questionId);
        
        // Find the interview that contains this question
        for (let interview of this.interviews) {
            const questionIndex = interview.questions.findIndex(q => q.id === parseInt(questionId));
            if (questionIndex !== -1) {
                // Remove the question from the interview
                interview.questions.splice(questionIndex, 1);
                interview.updated_at = new Date().toISOString();
                console.log('✅ Mock question deleted successfully');
                return Promise.resolve({ success: true });
            }
        }
        
        throw new Error('Question not found');
    }

    updateDuration(interviewId, durationSeconds, endTime) {
        console.log('⏱️ MockDataService.updateDuration called with:', { interviewId, durationSeconds, endTime });
        
        const interview = this.interviews.find(i => i.id === parseInt(interviewId));
        if (!interview) {
            throw new Error('Interview not found');
        }
        
        interview.duration_seconds = durationSeconds;
        interview.end_time = endTime;
        interview.updated_at = new Date().toISOString();
        
        console.log('✅ Mock interview duration updated successfully');
        return Promise.resolve({ ...interview });
    }

    // Admin Dashboard Mock Data
    getOverviewStats() {
        return Promise.resolve({
            totalInterviews: this.interviews.length,
            activeSessions: 2,
            totalQuestions: 15,
            totalStudents: this.students.length
        });
    }

    getAllInterviews() {
        return Promise.resolve(this.interviews.map(interview => ({
            id: interview.id,
            interview_date: interview.created_at,
            status: interview.status,
            verdict: interview.verdict,
            duration_seconds: interview.duration_seconds,
            created_at: interview.created_at,
            student_name: this.students.find(s => s.id === interview.student_id)?.name || 'Unknown',
            student_email: this.students.find(s => s.id === interview.student_id)?.email || 'Unknown',
            zeta_id: this.students.find(s => s.id === interview.student_id)?.zeta_id || 'Unknown',
            interviewer_name: 'Mock Interviewer',
            interviewer_email: 'interviewer@example.com',
            session_name: 'Mock Session'
        })));
    }

    getInterviewStats() {
        return Promise.resolve({
            total: this.interviews.length,
            completed: this.interviews.filter(i => i.status === 'completed').length,
            in_progress: this.interviews.filter(i => i.status === 'in_progress').length,
            cancelled: this.interviews.filter(i => i.status === 'cancelled').length
        });
    }

    getQuestionsAnalytics() {
        return Promise.resolve([
            {
                id: 1,
                question: 'What is 2 + 2?',
                category: 'Math Aptitude',
                times_asked: 5,
                total_answers: 5,
                correct_answers: 4,
                success_rate: 80
            },
            {
                id: 2,
                question: 'Tell me about yourself',
                category: 'Generic HR Questions',
                times_asked: 3,
                total_answers: 3,
                correct_answers: 3,
                success_rate: 100
            }
        ]);
    }

    getQuestionDetails(questionId) {
        return Promise.resolve({
            id: questionId,
            question: 'What is 2 + 2?',
            category: 'Math Aptitude',
            times_asked: 5,
            total_answers: 5,
            correct_answers: 4,
            success_rate: 80,
            student_answers: [
                {
                    student_name: 'John Doe',
                    zeta_id: 'ZETA001',
                    answer_text: '4',
                    is_correct: true,
                    answered_at: new Date().toISOString()
                },
                {
                    student_name: 'Jane Smith',
                    zeta_id: 'ZETA002',
                    answer_text: '5',
                    is_correct: false,
                    answered_at: new Date().toISOString()
                }
            ]
        });
    }

    getAllSessions() {
        return Promise.resolve([
            {
                id: 1,
                name: 'Face to Face for St Mary\'s School',
                description: 'Interview session for St Mary\'s School students',
                status: 'active',
                created_at: new Date().toISOString(),
                created_by_name: 'Admin User',
                created_by_email: 'admin@example.com',
                interview_count: 3
            },
            {
                id: 2,
                name: 'Technical Interview Round 1',
                description: 'First round technical interviews',
                status: 'completed',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                created_by_name: 'Admin User',
                created_by_email: 'admin@example.com',
                interview_count: 5
            }
        ]);
    }

    createSession(sessionData) {
        const newSession = {
            id: this.sessions.length + 1,
            name: sessionData.name,
            description: sessionData.description,
            status: 'active',
            created_by: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.sessions.push(newSession);
        return Promise.resolve(newSession);
    }

    deleteSession(sessionId) {
        const index = this.sessions.findIndex(s => s.id === parseInt(sessionId));
        if (index === -1) {
            throw new Error('Session not found');
        }
        
        this.sessions.splice(index, 1);
        return Promise.resolve({ success: true });
    }

    getSessionStats() {
        return Promise.resolve({
            total: this.sessions ? this.sessions.length : 0,
            active: this.sessions ? this.sessions.filter(s => s.status === 'active').length : 0,
            completed: this.sessions ? this.sessions.filter(s => s.status === 'completed').length : 0,
            cancelled: this.sessions ? this.sessions.filter(s => s.status === 'cancelled').length : 0
        });
    }

    getQuestionsStats() {
        return Promise.resolve({
            total_questions: 15,
            math_questions: 5,
            hr_questions: 4,
            english_questions: 3,
            technical_questions: 3
        });
    }

    getAllStudents() {
        return Promise.resolve(this.students.map(student => ({
            ...student,
            interview_count: this.interviews.filter(i => i.student_id === student.id).length
        })));
    }

        getStudentStats() {
            return Promise.resolve({
                total: this.students.length
            });
        }

        // Interviewer Dashboard Mock Data
        getMyInterviews(interviewerId) {
            return Promise.resolve(this.interviews.map(interview => ({
                id: interview.id,
                interview_date: interview.created_at,
                status: interview.status,
                verdict: interview.verdict,
                duration_seconds: interview.duration_seconds,
                created_at: interview.created_at,
                student_name: this.students.find(s => s.id === interview.student_id)?.name || 'Unknown',
                student_email: this.students.find(s => s.id === interview.student_id)?.email || 'Unknown',
                zeta_id: this.students.find(s => s.id === interview.student_id)?.zeta_id || 'Unknown',
                session_name: 'Mock Session'
            })));
        }

        getMyStats(interviewerId) {
            return Promise.resolve({
                total: this.interviews.length,
                completed: this.interviews.filter(i => i.status === 'completed').length,
                in_progress: this.interviews.filter(i => i.status === 'in_progress').length,
                cancelled: this.interviews.filter(i => i.status === 'cancelled').length
            });
        }

        getFavorites(interviewerId) {
            return Promise.resolve([
                {
                    id: 1,
                    question_id: 1,
                    created_at: new Date().toISOString(),
                    question: 'What is 2 + 2?',
                    category: 'Math Aptitude'
                },
                {
                    id: 2,
                    question_id: 2,
                    created_at: new Date().toISOString(),
                    question: 'Tell me about yourself',
                    category: 'Generic HR Questions'
                }
            ]);
        }

        addFavorite(interviewerId, questionId) {
            return Promise.resolve({
                id: Date.now(),
                interviewer_id: interviewerId,
                question_id: questionId,
                created_at: new Date().toISOString()
            });
        }

        removeFavorite(interviewerId, questionId) {
            return Promise.resolve({
                id: Date.now(),
                interviewer_id: interviewerId,
                question_id: questionId,
                created_at: new Date().toISOString()
            });
        }

        getFavoriteQuestionIds(interviewerId) {
            return Promise.resolve([1, 2, 5]);
        }
}

module.exports = new MockDataService();
