// Client-side JavaScript for Bees Interview Platform
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bees Interview Platform loaded successfully');
    
    // Check if user is already logged in (from URL parameters or localStorage)
    checkUserLoginStatus();
    
    // Function to handle Zoho OAuth login using direct redirect
    function loginWithZoho() {
        console.log('Initiating Zoho OAuth login...');
        console.log('Redirecting to /authredirction...');
        
        // Show loading state on all login buttons
        const loginButtons = document.querySelectorAll('#login-btn');
        loginButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Redirecting...';
        });
        
        // Direct redirect to the authredirction endpoint
        // The server will handle the redirect to Zoho OAuth
        window.location.href = '/authredirction';
    }
    
    // Function to show status messages
    function showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
            statusDiv.style.display = 'block';
            
            // Hide status after 5 seconds
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    // Function to display user information after login
    function displayUserInfo(userData) {
        const userNameElement = document.getElementById('user-name');
        const loginBtn = document.getElementById('login-btn');
        const startInterviewMainBtn = document.getElementById('start-interview-main-btn');
        const interviewDashboard = document.getElementById('interview-dashboard');
        
        if (userData && userData.name) {
            // Show user name and hide login button
            userNameElement.textContent = `Logged in as ${userData.name}`;
            userNameElement.classList.remove('hidden');
            if (loginBtn) {
                loginBtn.classList.add('hidden');
            }
            
            // Show the main start interview button
            if (startInterviewMainBtn) {
                console.log('Showing start interview button');
                startInterviewMainBtn.classList.remove('hidden');
            } else {
                console.log('Start interview button not found');
            }
            
            // Show interview dashboard
            if (interviewDashboard) {
                interviewDashboard.classList.remove('hidden');
            }
            
            // User logged in successfully
            
            console.log('User logged in:', userData);
        }
    }
    
    // Function to check if user is logged in
    function checkUserLoginStatus() {
        // Check URL parameters for user data (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const userEmail = urlParams.get('email');
        const userName = urlParams.get('name');
        
        if (userEmail || userName) {
            // User just logged in, display their info
            const userData = {
                email: userEmail,
                name: userName || userEmail?.split('@')[0] || 'User'
            };
            displayUserInfo(userData);
            
            // Store user data in localStorage for future visits
            localStorage.setItem('bees_user_data', JSON.stringify(userData));
            
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Check localStorage for existing user data
            const storedUserData = localStorage.getItem('bees_user_data');
            if (storedUserData) {
                try {
                    const userData = JSON.parse(storedUserData);
                    displayUserInfo(userData);
                } catch (e) {
                    console.error('Error parsing stored user data:', e);
                    localStorage.removeItem('bees_user_data');
                }
            }
        }
    }
    
    // Function to logout user
    function logoutUser() {
        localStorage.removeItem('bees_user_data');
        window.location.reload();
    }
    
    // Add event listeners when DOM is loaded
    const loginButton = document.getElementById('login-btn');
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Login button clicked');
            loginWithZoho();
        });
    }
    
    
    // Add event listener for the main start interview button
    const startInterviewMainBtn = document.getElementById('start-interview-main-btn');
    if (startInterviewMainBtn) {
        startInterviewMainBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Main start interview button clicked');
            startInterview();
        });
    }
    
    // Add logout functionality to user name (if clicked)
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logoutUser();
            }
        });
        userNameElement.style.cursor = 'pointer';
        userNameElement.title = 'Click to logout';
    }
    
    // Function to start interview
    function startInterview() {
        console.log('=== START INTERVIEW FUNCTION CALLED ===');
        console.log('Starting interview...');
        console.log('Current URL:', window.location.href);
        console.log('Redirecting to /interview');
        
        try {
            // Redirect to interview page
            window.location.href = '/interview';
            console.log('Redirect command executed');
        } catch (error) {
            console.error('Error during redirect:', error);
        }
    }
    
    // Make startInterview function globally available
    window.startInterview = startInterview;
    
    // Add event listener for the interview button
    let retryCount = 0;
    const maxRetries = 10;
    
    function attachInterviewButtonListener() {
        const interviewBtn = document.getElementById('start-interview-main-btn');
        if (interviewBtn) {
            console.log('Interview button found, adding event listener');
            interviewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Interview button clicked via event listener');
                startInterview();
            });
        } else if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Interview button not found, will retry... (${retryCount}/${maxRetries})`);
            // Retry after a short delay if button not found
            setTimeout(attachInterviewButtonListener, 100);
        } else {
            console.log('Interview button not found after maximum retries, giving up');
        }
    }

    // Try to attach the listener immediately
    attachInterviewButtonListener();

    // Also try when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachInterviewButtonListener);
    }

    // Log when the page is fully loaded
    console.log('All event listeners attached successfully');
}); // End of DOMContentLoaded event listener
