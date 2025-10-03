// Single Page Application Manager for Bees Interview Platform

class SPAManager {
    constructor() {
        this.currentView = null;
        this.currentRole = 'interviewer'; // Default role
        this.userData = null;
        this.init();
    }

    async init() {
        console.log('Initializing SPA Manager...');
        
        // Check authentication
        await this.checkAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Handle initial routing
        this.handleInitialRoute();
    }

    async checkAuth() {
        // Check URL parameters first (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const userEmail = urlParams.get('email');
        const userName = urlParams.get('name');
        const userRole = urlParams.get('role');

        if (userEmail && userName) {
            // User just logged in via OAuth
            this.userData = {
                email: userEmail,
                name: userName,
                role: userRole || 'interviewer'
            };
            
            // Store in localStorage
            localStorage.setItem('bees_user_data', JSON.stringify(this.userData));
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Check localStorage
            const storedData = localStorage.getItem('bees_user_data');
            if (storedData) {
                this.userData = JSON.parse(storedData);
            } else {
                // No authentication, redirect to login
                window.location.href = '/';
                return;
            }
        }

        // Fetch and update role if needed
        if (this.userData && this.userData.email) {
            try {
                const response = await fetch(`/api/user/role?email=${encodeURIComponent(this.userData.email)}`);
                const result = await response.json();
                if (result.success) {
                    this.currentRole = result.role;
                    this.userData.role = result.role;
                    localStorage.setItem('bees_user_data', JSON.stringify(this.userData));
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        }

        // Update UI
        this.updateUserUI();
    }

    updateUserUI() {
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && this.userData) {
            userNameEl.textContent = `Logged in as ${this.userData.name}`;
            userNameEl.classList.remove('hidden');
        }

        // Show/hide dashboard links based on role
        const adminLink = document.getElementById('admin-dashboard-link');
        const interviewerLink = document.getElementById('interviewer-dashboard-link');

        if (this.currentRole === 'superadmin' || this.currentRole === 'admin') {
            if (adminLink) adminLink.classList.remove('hidden');
            if (interviewerLink) interviewerLink.classList.remove('hidden');
        } else {
            if (adminLink) adminLink.classList.add('hidden');
            if (interviewerLink) interviewerLink.classList.remove('hidden');
        }
    }

    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.showView(e.state.view, false);
            }
        });
    }

    handleInitialRoute() {
        const hash = window.location.hash.substring(1); // Remove #
        
        if (hash) {
            this.showView(hash);
        } else {
            // Default view based on role
            if (this.currentRole === 'superadmin' || this.currentRole === 'admin') {
                this.showAdminDashboard();
            } else {
                this.showInterviewerDashboard();
            }
        }
    }

    showView(viewId, pushState = true) {
        console.log('Showing view:', viewId);

        // Hide all views
        const allViews = document.querySelectorAll('.view');
        allViews.forEach(view => view.classList.remove('active'));

        // Show requested view
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;

            // Update URL
            if (pushState) {
                window.history.pushState({ view: viewId }, '', `#${viewId}`);
            }

            // Load content if needed
            this.loadViewContent(viewId);
        } else {
            console.error('View not found:', viewId);
        }
    }

    async loadViewContent(viewId) {
        const viewElement = document.getElementById(`${viewId}-view`);
        
        // Check if content is already loaded
        if (viewElement && viewElement.dataset.loaded === 'true') {
            console.log('View content already loaded');
            return;
        }

        console.log('Loading content for view:', viewId);

        switch (viewId) {
            case 'interview-search':
                await this.loadInterviewSearchView();
                break;
            case 'interview-session':
                await this.loadInterviewSessionView();
                break;
            case 'admin-overview':
                await this.loadAdminOverviewView();
                break;
            case 'admin-interviews':
                await this.loadAdminInterviewsView();
                break;
            case 'admin-questions':
                await this.loadAdminQuestionsView();
                break;
            case 'admin-sessions':
                await this.loadAdminSessionsView();
                break;
            case 'admin-students':
                await this.loadAdminStudentsView();
                break;
            case 'interviewer-interviews':
                await this.loadInterviewerInterviewsView();
                break;
            case 'interviewer-questions':
                await this.loadInterviewerQuestionsView();
                break;
        }

        // Mark as loaded
        if (viewElement) {
            viewElement.dataset.loaded = 'true';
        }
    }

    // Show/Hide Sidebar
    showSidebar(navItems) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const sidebarNav = document.getElementById('sidebar-nav');

        if (navItems && navItems.length > 0) {
            // Show sidebar with navigation items
            sidebar.classList.remove('hidden');
            mainContent.classList.remove('full-width');

            // Populate navigation
            sidebarNav.innerHTML = navItems.map(item => `
                <li class="nav-item">
                    <a class="nav-link ${item.active ? 'active' : ''}" 
                       onclick="spaManager.showView('${item.viewId}'); return false;">
                        <i>${item.icon}</i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `).join('');
        } else {
            // Hide sidebar
            sidebar.classList.add('hidden');
            mainContent.classList.add('full-width');
        }
    }

    // Navigation Methods
    showInterviewSearch() {
        this.showSidebar(null); // Hide sidebar for interview
        this.showView('interview-search');
    }

    showInterviewSession(studentData) {
        this.showSidebar(null); // Hide sidebar for interview
        this.currentStudentData = studentData;
        this.showView('interview-session');
    }

    showAdminDashboard() {
        const navItems = [
            { viewId: 'admin-overview', icon: '📊', label: 'Overview', active: true },
            { viewId: 'admin-interviews', icon: '🎯', label: 'Interviews', active: false },
            { viewId: 'admin-questions', icon: '❓', label: 'Questions', active: false },
            { viewId: 'admin-sessions', icon: '📅', label: 'Sessions', active: false },
            { viewId: 'admin-students', icon: '👥', label: 'Students', active: false }
        ];
        this.showSidebar(navItems);
        this.showView('admin-overview');
    }

    showInterviewerDashboard() {
        const navItems = [
            { viewId: 'interviewer-interviews', icon: '📋', label: 'My Interviews', active: true },
            { viewId: 'interviewer-questions', icon: '❓', label: 'Question Bank', active: false }
        ];
        this.showSidebar(navItems);
        this.showView('interviewer-interviews');
    }

    showDashboard() {
        // Return to appropriate dashboard based on role
        if (this.currentRole === 'superadmin' || this.currentRole === 'admin') {
            this.showAdminDashboard();
        } else {
            this.showInterviewerDashboard();
        }
    }

    // View Loading Methods
    async loadInterviewSearchView() {
        const viewElement = document.getElementById('interview-search-view');
        viewElement.innerHTML = `
            <div class="interview-view">
                <div class="section-card">
                    <h2 class="section-title">Start New Interview</h2>
                    <div id="interview-search-content">
                        <!-- Interview search content will be loaded here -->
                        <p>Loading interview search...</p>
                    </div>
                </div>
            </div>
        `;

        // Load interview.js content dynamically
        // This is a placeholder - we'll implement the actual interview search
        await this.loadInterviewSearchContent();
    }

    async loadInterviewSearchContent() {
        // Placeholder for loading interview search functionality
        console.log('Loading interview search content...');
        // We'll implement this by extracting the interview search logic
    }

    async loadInterviewSessionView() {
        const viewElement = document.getElementById('interview-session-view');
        viewElement.innerHTML = `
            <div class="interview-view">
                <button class="back-btn" onclick="spaManager.showDashboard()">← Back to Dashboard</button>
                <div id="interview-session-content">
                    <!-- Interview session content will be loaded here -->
                    <p>Loading interview session...</p>
                </div>
            </div>
        `;

        // Load interview session content
        await this.loadInterviewSessionContent();
    }

    async loadInterviewSessionContent() {
        // Placeholder for loading interview session functionality
        console.log('Loading interview session content...');
        // We'll implement this by extracting the interview session logic
    }

    async loadAdminOverviewView() {
        const viewElement = document.getElementById('admin-overview-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">Dashboard Overview</h2>
                <div id="admin-overview-content">
                    <p>Loading overview...</p>
                </div>
            </div>
        `;
        // Load admin overview content
    }

    async loadAdminInterviewsView() {
        const viewElement = document.getElementById('admin-interviews-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">All Interviews</h2>
                <div id="admin-interviews-content">
                    <p>Loading interviews...</p>
                </div>
            </div>
        `;
        // Load admin interviews content
    }

    async loadAdminQuestionsView() {
        const viewElement = document.getElementById('admin-questions-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">Questions Analytics</h2>
                <div id="admin-questions-content">
                    <p>Loading questions...</p>
                </div>
            </div>
        `;
    }

    async loadAdminSessionsView() {
        const viewElement = document.getElementById('admin-sessions-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">Interview Sessions</h2>
                <div id="admin-sessions-content">
                    <p>Loading sessions...</p>
                </div>
            </div>
        `;
    }

    async loadAdminStudentsView() {
        const viewElement = document.getElementById('admin-students-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">Students</h2>
                <div id="admin-students-content">
                    <p>Loading students...</p>
                </div>
            </div>
        `;
    }

    async loadInterviewerInterviewsView() {
        const viewElement = document.getElementById('interviewer-interviews-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">My Interviews</h2>
                <div id="interviewer-interviews-content">
                    <p>Loading interviews...</p>
                </div>
            </div>
        `;
    }

    async loadInterviewerQuestionsView() {
        const viewElement = document.getElementById('interviewer-questions-view');
        viewElement.innerHTML = `
            <div class="section-card">
                <h2 class="section-title">Question Bank</h2>
                <div id="interviewer-questions-content">
                    <p>Loading question bank...</p>
                </div>
            </div>
        `;
    }
}

// Utility Functions
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('bees_user_data');
        window.location.href = '/';
    }
}

function showDashboard() {
    if (window.spaManager) {
        window.spaManager.showDashboard();
    }
}

function showAdminDashboard() {
    if (window.spaManager) {
        window.spaManager.showAdminDashboard();
    }
}

function showInterviewerDashboard() {
    if (window.spaManager) {
        window.spaManager.showInterviewerDashboard();
    }
}

function showInterviewSearch() {
    if (window.spaManager) {
        window.spaManager.showInterviewSearch();
    }
}

// Initialize SPA Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.spaManager = new SPAManager();
});

