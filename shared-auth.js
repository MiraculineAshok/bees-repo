// Shared authentication utilities for all pages
(function() {
    'use strict';
    
    // Function to get user data from localStorage or URL parameters
    window.getUserData = function getUserData() {
               // Check URL parameters first (for OAuth callback)
               const urlParams = new URLSearchParams(window.location.search);
               const userEmail = urlParams.get('email');
               const userName = urlParams.get('name');
               const userRole = urlParams.get('role');
               
               if (userEmail || userName) {
                   const userData = {
                       email: userEmail,
                       name: userName || userEmail?.split('@')[0] || 'User',
                       role: userRole || 'interviewer' // Include role from URL
                   };
                   
                   // Store in localStorage for future visits
                   localStorage.setItem('bees_user_data', JSON.stringify(userData));
                   
                   // Clean up URL parameters
                   window.history.replaceState({}, document.title, window.location.pathname);
                   
                   return userData;
               }
        
        // Check localStorage for existing user data
        const storedUserData = localStorage.getItem('bees_user_data');
        if (storedUserData) {
            try {
                return JSON.parse(storedUserData);
            } catch (e) {
                console.error('Error parsing stored user data:', e);
                localStorage.removeItem('bees_user_data');
            }
        }
        
        return null;
    }
    
    // Enhanced fetch wrapper that automatically adds user information
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Only modify API requests
        if (typeof url === 'string' && url.startsWith('/api/')) {
            const userData = getUserData();
            if (userData && userData.email) {
                // Add user email to headers
                options.headers = options.headers || {};
                options.headers['x-user-email'] = userData.email;
                
                console.log('🔍 Adding user email to API request:', {
                    url: url,
                    email: userData.email,
                    method: options.method || 'GET'
                });
            }
        }
        
        return originalFetch.call(this, url, options);
    };
    
    // Function to check if user is admin
    async function checkUserRole() {
        try {
            const userData = getUserData();
            const userEmail = userData ? userData.email : null;
            
            const url = userEmail ? `/api/user/role?email=${encodeURIComponent(userEmail)}` : '/api/user/role';
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                return result.role;
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
        
        return 'interviewer'; // Default role
    }

    // Function to display user info in header
    async function displayUserInfo(userData) {
        const userNameElement = document.getElementById('user-name');
        const loginBtn = document.getElementById('login-btn');
        const adminDashboardBtn = document.getElementById('admin-dashboard-btn');
        const interviewerDashboardBtn = document.getElementById('interviewer-dashboard-btn');
        
        if (userData && userData.name) {
            // Show user name and hide login button
            if (userNameElement) {
                userNameElement.textContent = `Logged in as ${userData.name}`;
                userNameElement.classList.remove('hidden');
                userNameElement.style.cursor = 'pointer';
                userNameElement.title = 'Click to logout';
                
                // Add logout functionality
                userNameElement.onclick = function() {
                    if (confirm('Are you sure you want to logout?')) {
                        logoutUser();
                    }
                };
            }
            
            if (loginBtn) {
                loginBtn.classList.add('hidden');
            }
            
                   // Check user role and show appropriate dashboard button
                   let userRole = 'interviewer'; // Default role
                   
                   // If role is already in userData (from OAuth callback), use it
                   if (userData.role) {
                       userRole = userData.role;
                       console.log('Using role from userData:', userRole);
                   } else {
                       // Otherwise, fetch from API
                       userRole = await checkUserRole();
                       console.log('Fetched role from API:', userRole);
                   }
            
            // Ensure both buttons stay hidden until role is determined
            if (adminDashboardBtn) adminDashboardBtn.classList.add('hidden');
            if (interviewerDashboardBtn) interviewerDashboardBtn.classList.add('hidden');
            
            if (userRole === 'superadmin' || userRole === 'admin') {
                // Admin users: show only admin dashboard button
                if (adminDashboardBtn) {
                    adminDashboardBtn.classList.remove('hidden');
                }
                // Keep interviewer dashboard button hidden for admins
            } else {
                // Regular interviewers: show only interviewer dashboard button
                if (interviewerDashboardBtn) {
                    interviewerDashboardBtn.classList.remove('hidden');
                }
                // Keep admin dashboard button hidden for interviewers
            }
            
            return true;
        }
        
        return false;
    }
    
    // Function to logout user
    function logoutUser() {
        localStorage.removeItem('bees_user_data');
        window.location.href = '/';
    }
    
    // Function to initialize authentication on page load
    async function initAuth(requireAuth = false) {
        const userData = getUserData();
        if (userData) {
            // Verify the user is still authorized
            try {
                const response = await fetch(`/api/user/role?email=${encodeURIComponent(userData.email)}`);
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    console.log('❌ User not authorized');
                    localStorage.removeItem('bees_user_data');
                    if (requireAuth) {
                        window.location.href = '/';
                        return;
                    }
                } else {
                    await displayUserInfo(userData);
                }
            } catch (error) {
                console.error('Error verifying user authorization:', error);
                localStorage.removeItem('bees_user_data');
                if (requireAuth) {
                    window.location.href = '/';
                    return;
                }
            }
        } else if (requireAuth) {
            // No user data found and authentication is required
            console.log('❌ No user data found, redirecting to home');
            window.location.href = '/';
        }
    }
    
    // Function to handle Zoho OAuth login
    function loginWithZoho() {
        console.log('Initiating Zoho OAuth login...');
        
        // Show loading state on login buttons
        const loginButtons = document.querySelectorAll('#login-btn');
        loginButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Redirecting...';
        });
        
        // Redirect to the authredirction endpoint
        window.location.href = '/authredirction';
    }
    
    // Add event listeners for login buttons
    function attachLoginListeners() {
        const loginButtons = document.querySelectorAll('#login-btn');
        loginButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                loginWithZoho();
            });
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Check if page requires authentication (can be set by individual pages)
            const requireAuth = window.BEES_REQUIRE_AUTH || false;
            initAuth(requireAuth);
            attachLoginListeners();
        });
    } else {
        // Check if page requires authentication (can be set by individual pages)
        const requireAuth = window.BEES_REQUIRE_AUTH || false;
        initAuth(requireAuth);
        attachLoginListeners();
    }
    
    // Make functions globally available
    window.BeesAuth = {
        getUserData: getUserData,
        displayUserInfo: displayUserInfo,
        logoutUser: logoutUser,
        loginWithZoho: loginWithZoho,
        initAuth: initAuth
    };
})();
