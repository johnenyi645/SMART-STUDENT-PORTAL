class StudentPortal {
    constructor() {
        this.modules = {};
        this.initializeApp();
    }

    initializeApp() {
        // Check if user is logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
        } else {
            this.showAuth();
        }

        // Setup navigation and event listeners
        this.setupNavigation();
        this.setupModals();
        this.setupMobileMenu();
        this.setupThemeToggle();
        
        // Listen for user login
        window.addEventListener('userLoggedIn', () => {
            this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
            this.showApp();
            this.initializeModules();
            this.loadDashboardData();
        });
    }

    setupNavigation() {
        // Page switching
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                this.switchPage(page);
            });
        });

        // Quick actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    setupModals() {
        // Close modal on X click
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').style.display = 'none';
            });
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-container')) {
                    navMenu.classList.remove('active');
                }
            });
        }
    }

    setupThemeToggle() {
        // Check for saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        
        // Add theme toggle button to navbar
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = savedTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
        themeToggle.title = `Switch to ${savedTheme === 'dark' ? 'light' : 'dark'} mode`;
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            themeToggle.innerHTML = newTheme === 'dark' ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
            themeToggle.title = `Switch to ${newTheme === 'dark' ? 'light' : 'dark'} mode`;
        });
        
        // Add to navbar
        const navContainer = document.querySelector('.nav-container');
        if (navContainer) {
            navContainer.appendChild(themeToggle);
        }
    }

    switchPage(page) {
        // Update active navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Show selected page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        const targetPage = document.getElementById(page);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Close mobile menu
            document.querySelector('.nav-menu').classList.remove('active');
            
            // Load data for the page
            this.loadPageData(page);
        }
    }

    loadPageData(page) {
        switch(page) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'courses':
                if (this.modules.courses) {
                    this.modules.courses.loadCourses();
                }
                break;
            case 'assignments':
                if (this.modules.assignments) {
                    this.modules.assignments.loadAssignments();
                }
                break;
            case 'attendance':
                if (this.modules.attendance) {
                    this.modules.attendance.loadAttendance();
                }
                break;
            case 'grades':
                if (this.modules.grades) {
                    this.modules.grades.loadGrades();
                }
                break;
        }
    }

    initializeModules() {
        // Initialize all modules
        this.modules.profile = new ProfileModule();
        this.modules.courses = new CourseModule();
        this.modules.assignments = new AssignmentModule();
        this.modules.grades = new GradeModule();
        this.modules.attendance = new AttendanceModule();
        this.modules.report = new ReportModule();
        
        // Store modules globally for inter-module communication
        window.profileModule = this.modules.profile;
        window.courseModule = this.modules.courses;
        window.assignmentModule = this.modules.assignments;
        window.gradeModule = this.modules.grades;
        window.attendanceModule = this.modules.attendance;
        window.reportModule = this.modules.report;
        
        // Setup import/export
        this.modules.report.setupImportExport();
    }

    loadDashboardData() {
        if (!this.currentUser) return;

        // Update course count
        const courseCount = this.currentUser.courses?.length || 0;
        document.getElementById('course-count').textContent = courseCount;

        // Update assignment count (pending)
        let pendingAssignments = 0;
        if (this.currentUser.courses) {
            this.currentUser.courses.forEach(course => {
                if (course.assignments) {
                    pendingAssignments += course.assignments.filter(a => !a.submitted).length;
                }
            });
        }
        document.getElementById('assignment-count').textContent = pendingAssignments;

        // Update GPA
        const gpa = this.calculateGPA();
        document.getElementById('gpa-display').textContent = gpa.toFixed(2);

        // Update attendance
        const attendance = this.calculateOverallAttendance();
        document.getElementById('attendance-percent').textContent = `${attendance}%`;
        
        // Load upcoming assignments
        this.loadUpcomingAssignments();
        
        // Load recent grades
        this.loadRecentGrades();
    }

    calculateGPA() {
        if (!this.currentUser.courses || this.currentUser.courses.length === 0) return 0;
        
        const gradePoints = {
            'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0
        };
        
        let totalPoints = 0;
        let totalCredits = 0;
        
        this.currentUser.courses.forEach(course => {
            const grade = course.calculatedGrade || course.grade;
            if (grade && gradePoints[grade]) {
                totalPoints += gradePoints[grade] * course.credits;
                totalCredits += course.credits;
            }
        });
        
        return totalCredits > 0 ? totalPoints / totalCredits : 0;
    }

    calculateOverallAttendance() {
        if (!this.currentUser.courses || this.currentUser.courses.length === 0) return 0;
        
        let totalPresent = 0;
        let totalClasses = 0;
        
        this.currentUser.courses.forEach(course => {
            if (course.attendance) {
                const presentCount = course.attendance.filter(a => a.status === 'present').length;
                totalPresent += presentCount;
                totalClasses += course.attendance.length;
            }
        });
        
        return totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    }

    loadUpcomingAssignments() {
        const upcomingList = document.getElementById('upcoming-list');
        upcomingList.innerHTML = '';
        
        if (!this.currentUser.courses) return;
        
        let allAssignments = [];
        this.currentUser.courses.forEach(course => {
            if (course.assignments) {
                course.assignments.forEach(assignment => {
                    if (!assignment.submitted) {
                        allAssignments.push({
                            ...assignment,
                            courseTitle: course.title
                        });
                    }
                });
            }
        });
        
        // Sort by due date
        allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        // Show 5 most urgent assignments
        const upcoming = allAssignments.slice(0, 5);
        
        if (upcoming.length === 0) {
            upcomingList.innerHTML = '<p class="empty-message">No upcoming assignments</p>';
            return;
        }
        
        upcoming.forEach(assignment => {
            const dueDate = new Date(assignment.dueDate).toLocaleDateString();
            const item = document.createElement('div');
            item.className = 'upcoming-item';
            item.innerHTML = `
                <div class="upcoming-header">
                    <strong>${assignment.title}</strong>
                    <span class="upcoming-due">Due: ${dueDate}</span>
                </div>
                <div class="upcoming-course">${assignment.courseTitle}</div>
            `;
            upcomingList.appendChild(item);
        });
    }

    loadRecentGrades() {
        const recentGradesList = document.getElementById('recent-grades-list');
        recentGradesList.innerHTML = '';
        
        if (!this.currentUser.courses) return;
        
        let allGrades = [];
        this.currentUser.courses.forEach(course => {
            if (course.assignments) {
                course.assignments.forEach(assignment => {
                    if (assignment.grade !== undefined) {
                        allGrades.push({
                            ...assignment,
                            courseTitle: course.title
                        });
                    }
                });
            }
        });
        
        // Sort by submission date (most recent first)
        allGrades.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        
        // Show 5 most recent grades
        const recent = allGrades.slice(0, 5);
        
        if (recent.length === 0) {
            recentGradesList.innerHTML = '<p class="empty-message">No recent grades</p>';
            return;
        }
        
        recent.forEach(assignment => {
            const percentage = (assignment.grade / assignment.points) * 100;
            const grade = this.percentageToGrade(percentage);
            
            const item = document.createElement('div');
            item.className = 'recent-grade-item';
            item.innerHTML = `
                <div class="recent-grade-header">
                    <strong>${assignment.title}</strong>
                    <span class="grade-badge grade-${grade}">${grade}</span>
                </div>
                <div class="recent-grade-details">
                    ${assignment.courseTitle} - ${assignment.grade}/${assignment.points}
                </div>
            `;
            recentGradesList.appendChild(item);
        });
    }

    percentageToGrade(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    handleQuickAction(action) {
        switch(action) {
            case 'add-course':
                document.getElementById('add-course-btn').click();
                this.switchPage('courses');
                break;
            case 'mark-attendance':
                document.getElementById('mark-attendance-btn').click();
                this.switchPage('attendance');
                break;
            case 'generate-report':
                if (this.modules.report) {
                    this.modules.report.generateReport();
                }
                break;
        }
    }

    showApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        
        // Switch to dashboard
        this.switchPage('dashboard');
    }

    showAuth() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        
        // Clear errors
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Start the application
const app = new StudentPortal();