// Interview Page JavaScript
class InterviewPage {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.attachEventListeners();
        this.focusZetaIdInput();
        this.loadInterviewSessions();
    }

    checkAuthentication() {
        const userEmail = this.getUrlParameter('email');
        
        // If no email in URL, check localStorage for user data
        if (!userEmail) {
            const storedUserData = localStorage.getItem('bees_user_data');
            if (storedUserData) {
                try {
                    const userData = JSON.parse(storedUserData);
                    if (userData.email) {
                        // User is authenticated via localStorage
                        console.log('User authenticated via localStorage:', userData.email);
                        return;
                    }
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                }
            }
            
            // No authentication found, redirect to login
            console.log('No authentication found, redirecting to login');
            window.location.href = '/';
            return;
        }
        
        console.log('User authenticated via URL parameters:', userEmail);
    }

    attachEventListeners() {
        // Back to Dashboard button
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goBack();
            });
        }

        // Search for Student button
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.searchStudent();
            });
        }

        // Enter key on Zeta ID input
        const zetaIdInput = document.getElementById('zeta-id');
        if (zetaIdInput) {
            zetaIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchStudent();
                }
            });
        }

        // New Student Form submission
        const newStudentForm = document.getElementById('new-student-form');
        if (newStudentForm) {
            newStudentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitNewStudent();
            });
        }
    }

    focusZetaIdInput() {
        const zetaIdInput = document.getElementById('zeta-id');
        if (zetaIdInput) {
            zetaIdInput.focus();
        }
    }

    goBack() {
        console.log('Going back to dashboard...');
        window.location.href = '/';
    }

    async searchStudent() {
        const zetaId = document.getElementById('zeta-id').value.trim();
        
        if (!zetaId) {
            this.showError('Please enter a Zeta ID');
            return;
        }

        this.showLoading();
        this.hideMessages();

        try {
            const response = await fetch(`/api/students/search/${encodeURIComponent(zetaId)}`);
            const result = await response.json();

            console.log('Search result:', result);
            console.log('Response ok:', response.ok);
            console.log('Result success:', result.success);
            console.log('Data length:', result.data ? result.data.length : 'no data');

            if (response.ok && result.success && result.data && result.data.length > 0) {
                // Student found - display student info
                console.log('Student found, displaying info for:', result.data[0]);
                this.displayStudentInfo(result.data[0]);
            } else {
                // Student not found - show new student form
                console.log('Student not found, showing form for zeta ID:', zetaId);
                this.showNewStudentForm(zetaId);
            }
        } catch (error) {
            console.error('Error searching for student:', error);
            this.showError('Error searching for student. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    displayStudentInfo(student) {
        const studentInfoDiv = document.getElementById('student-info');
        const newStudentFormDiv = document.getElementById('new-student-form-container');
        
        // Hide new student form
        if (newStudentFormDiv) {
            newStudentFormDiv.classList.add('hidden');
        }

        // Show student info
        if (studentInfoDiv) {
            studentInfoDiv.innerHTML = `
                <h3>Student Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Zeta ID</strong>
                        <span>${student.zeta_id}</span>
                    </div>
                    <div class="info-item">
                        <strong>First Name</strong>
                        <span>${student.first_name}</span>
                    </div>
                    <div class="info-item">
                        <strong>Last Name</strong>
                        <span>${student.last_name}</span>
                    </div>
                    <div class="info-item">
                        <strong>Email</strong>
                        <span>${student.email}</span>
                    </div>
                    <div class="info-item">
                        <strong>Phone</strong>
                        <span>${student.phone}</span>
                    </div>
                    <div class="info-item">
                        <strong>Address</strong>
                        <span>${student.address}</span>
                    </div>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button class="submit-btn" onclick="interviewPage.startInterviewSession('${student.zeta_id}')">
                        Start Interview Session
                    </button>
                </div>
            `;
            studentInfoDiv.classList.remove('hidden');
        }
    }

    showNewStudentForm(zetaId) {
        const studentInfoDiv = document.getElementById('student-info');
        const newStudentFormDiv = document.getElementById('new-student-form-container');
        
        // Hide student info
        if (studentInfoDiv) {
            studentInfoDiv.classList.add('hidden');
        }

        // Show new student form
        if (newStudentFormDiv) {
            // Pre-fill the zeta ID
            const zetaIdInput = document.getElementById('new-zeta-id');
            if (zetaIdInput) {
                zetaIdInput.value = zetaId;
            }
            
            newStudentFormDiv.classList.remove('hidden');
        }
    }

    async submitNewStudent() {
        const formData = {
            zeta_id: document.getElementById('new-zeta-id').value.trim(),
            first_name: document.getElementById('new-first-name').value.trim(),
            last_name: document.getElementById('new-last-name').value.trim(),
            email: document.getElementById('new-email').value.trim(),
            phone: document.getElementById('new-phone').value.trim(),
            address: document.getElementById('new-address').value.trim()
        };

        // Validate required fields
        if (!formData.zeta_id || !formData.first_name || !formData.last_name || !formData.email) {
            this.showError('Please fill in all required fields (Zeta ID, First Name, Last Name, Email)');
            return;
        }

        this.showLoading();
        this.hideMessages();

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Display the newly created student info
                this.displayStudentInfo(data.data);
            } else {
                this.showError(data.error || 'Error creating student. Please try again.');
            }
        } catch (error) {
            console.error('Error creating student:', error);
            this.showError('Error creating student. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async loadInterviewSessions() {
        try {
            const response = await fetch('/api/admin/sessions');
            const data = await response.json();
            
            if (data.success) {
                this.sessions = data.data.filter(session => session.status === 'active');
                this.displaySessions();
            } else {
                console.log('No active sessions found');
                this.showError('No active interview sessions available');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Error loading interview sessions');
        }
    }

    displaySessions() {
        const sessionSelect = document.getElementById('session-select');
        if (!sessionSelect) return;

        sessionSelect.innerHTML = '<option value="">Select Interview Session</option>';
        
        this.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = session.name;
            sessionSelect.appendChild(option);
        });
    }

    startInterviewSession(zetaId) {
        console.log('Starting interview session for Zeta ID:', zetaId);
        
        // Check if session is selected
        const sessionSelect = document.getElementById('session-select');
        const selectedSessionId = sessionSelect.value;
        
        if (!selectedSessionId) {
            this.showError('Please select an interview session first');
            return;
        }
        
        // Find the student data from the displayed student info
        const studentInfoDiv = document.getElementById('student-info');
        if (studentInfoDiv && !studentInfoDiv.classList.contains('hidden')) {
            // Extract student data from the displayed info
            const studentData = this.extractStudentDataFromDisplay();
            if (studentData) {
                // Add session ID to student data
                studentData.sessionId = selectedSessionId;
                
                // Store student data in sessionStorage
                sessionStorage.setItem('currentStudent', JSON.stringify(studentData));
                console.log('Student data stored in sessionStorage:', studentData);
            }
        }
        
        // Redirect to interview session page with student data
        window.location.href = `/interview-session?zeta_id=${encodeURIComponent(zetaId)}&session_id=${selectedSessionId}`;
    }
    
    extractStudentDataFromDisplay() {
        const studentInfoDiv = document.getElementById('student-info');
        if (!studentInfoDiv) return null;
        
        // Extract data from the displayed student info
        const infoItems = studentInfoDiv.querySelectorAll('.info-item');
        const studentData = {};
        
        infoItems.forEach(item => {
            const label = item.querySelector('strong');
            const value = item.querySelector('span');
            
            if (label && value) {
                const labelText = label.textContent.trim();
                const valueText = value.textContent.trim();
                
                // Map display labels to database field names
                switch (labelText) {
                    case 'Zeta ID':
                        studentData.zeta_id = valueText;
                        break;
                    case 'First Name':
                        studentData.first_name = valueText;
                        break;
                    case 'Last Name':
                        studentData.last_name = valueText;
                        break;
                    case 'Email':
                        studentData.email = valueText;
                        break;
                    case 'Phone':
                        studentData.phone = valueText;
                        break;
                    case 'Address':
                        studentData.address = valueText;
                        break;
                }
            }
        });
        
        return Object.keys(studentData).length > 0 ? studentData : null;
    }

    showError(message) {
        this.hideMessages();
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }


    showLoading() {
        const loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) {
            loadingDiv.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }

    hideMessages() {
        const errorDiv = document.getElementById('error-message');
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
}

// Initialize the interview page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.interviewPage = new InterviewPage();
});
