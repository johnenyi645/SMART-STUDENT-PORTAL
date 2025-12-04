class Auth {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('students')) || [];
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
        }

        // Setup event listeners
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 8 && /\d/.test(password);
    }

    hashPassword(password) {
        // Simple encoding for demonstration (NOT secure for production)
        return btoa(password + 'studentportal');
    }

    login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Clear previous errors
        this.clearErrors('login');
        
        // Validate
        let valid = true;
        if (!this.validateEmail(email)) {
            this.showError('login-email-error', 'Please enter a valid email');
            valid = false;
        }
        if (password.length < 8) {
            this.showError('login-password-error', 'Password must be at least 8 characters');
            valid = false;
        }
        
        if (!valid) return;
        
        // Find user
        const user = this.users.find(u => 
            u.email === email && 
            u.password === this.hashPassword(password)
        );
        
        if (user) {
            this.currentUser = { ...user };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showApp();
            this.showToast('Login successful!');
        } else {
            this.showError('login-password-error', 'Invalid email or password');
        }
    }

    register() {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        // Clear previous errors
        this.clearErrors('register');
        
        // Validate
        let valid = true;
        
        if (name.length < 2) {
            this.showError('register-name-error', 'Name must be at least 2 characters');
            valid = false;
        }
        
        if (!this.validateEmail(email)) {
            this.showError('register-email-error', 'Please enter a valid email');
            valid = false;
        }
        
        if (!this.validatePassword(password)) {
            this.showError('register-password-error', 
                'Password must be at least 8 characters and include a number');
            valid = false;
        }
        
        if (password !== confirm) {
            this.showError('register-confirm-error', 'Passwords do not match');
            valid = false;
        }
        
        // Check if email exists
        if (this.users.some(u => u.email === email)) {
            this.showError('register-email-error', 'Email already registered');
            valid = false;
        }
        
        if (!valid) return;
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password: this.hashPassword(password),
            bio: '',
            major: '',
            year: 'Freshman',
            courses: [],
            assignments: [],
            attendance: [],
            grades: [],
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        localStorage.setItem('students', JSON.stringify(this.users));
        
        // Auto login
        this.currentUser = { ...newUser };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showApp();
        this.showToast('Registration successful!');
        this.switchAuthTab('login');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showAuth();
        this.showToast('Logged out successfully');
    }

    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        // Initialize other modules
        window.dispatchEvent(new Event('userLoggedIn'));
    }

    showAuth() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        this.clearErrors();
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
        }
    }

    clearErrors(form = 'all') {
        if (form === 'login' || form === 'all') {
            document.querySelectorAll('#login-form .error-message')
                .forEach(el => el.textContent = '');
        }
        if (form === 'register' || form === 'all') {
            document.querySelectorAll('#register-form .error-message')
                .forEach(el => el.textContent = '');
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Initialize Auth module
const auth = new Auth();