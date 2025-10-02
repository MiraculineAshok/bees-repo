// Shared authentication utilities for all pages
(function() {
    'use strict';
    
    // Function to get user data from localStorage or URL parameters
    function getUserData() {
        // Check URL parameters first (for OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const userEmail = urlParams.get('email');
        const userName = urlParams.get('name');
        
        if (userEmail || userName) {
            const userData = {
                email: userEmail,
                name: userName || userEmail?.split('@')[0] || 'User'
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
    
    // Function to display user info in header
    function displayUserInfo(userData) {
        const userNameElement = document.getElementById('user-name');
        const loginBtn = document.getElementById('login-btn');
        
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
    function initAuth() {
        const userData = getUserData();
        if (userData) {
            displayUserInfo(userData);
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
            initAuth();
            attachLoginListeners();
        });
    } else {
        initAuth();
        attachLoginListeners();
    }
    
    // Make functions globally available
    window.BeesAuth = {
        getUserData: getUserData,
        displayUserInfo: displayUserInfo,
        logoutUser: logoutUser,
        loginWithZoho: loginWithZoho
    };
})();
