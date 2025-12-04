class AttendanceModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeAttendance();
    }

    initializeAttendance() {
        if (!this.currentUser) return;

        // Load attendance
        this.loadAttendance();
        
        // Setup event listeners
        this.setupAttendanceListeners();
        
        // Listen for course updates
        window.addEventListener('coursesUpdated', () => {
            this.updateCourseSelectors();
        });
    }

    loadAttendance() {
        this.calculateAttendance();
        this.renderAttendance();
        this.updateDashboardAttendance();
    }

    calculateAttendance() {
        const courses = this.currentUser.courses || [];
        
        courses.forEach(course => {
            if (course.attendance && course.attendance.length > 0) {
                const presentCount = course.attendance.filter(a => a.status === 'present').length;
                const totalCount = course.attendance.length;
                course.attendancePercentage = totalCount > 0 ? 
                    Math.round((presentCount / totalCount) * 100) : 0;
            } else {
                course.attendancePercentage = 0;
            }
        });
        
        // Calculate overall attendance
        this.calculateOverallAttendance();
        
        // Update current user
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    calculateOverallAttendance() {
        const courses = this.currentUser.courses || [];
        let totalPresent = 0;
        let totalClasses = 0;

        courses.forEach(course => {
            if (course.attendance) {
                const presentCount = course.attendance.filter(a => a.status === 'present').length;
                totalPresent += presentCount;
                totalClasses += course.attendance.length;
            }
        });

        this.currentUser.overallAttendance = totalClasses > 0 ? 
            Math.round((totalPresent / totalClasses) * 100) : 0;
    }

    renderAttendance() {
        const container = document.getElementById('attendance-records');
        container.innerHTML = '';

        const courses = this.currentUser.courses || [];
        
        // Update overall attendance
        document.getElementById('overall-attendance').textContent = 
            `${this.currentUser.overallAttendance}%`;

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check fa-3x"></i>
                    <h3>No attendance records</h3>
                    <p>Mark attendance for your courses</p>
                </div>
            `;
            return;
        }

        courses.forEach(course => {
            const attendanceItem = this.createAttendanceItem(course);
            container.appendChild(attendanceItem);
        });
    }

    createAttendanceItem(course) {
        const div = document.createElement('div');
        div.className = 'attendance-item';
        
        const attendanceCount = course.attendance ? course.attendance.length : 0;
        const presentCount = course.attendance ? 
            course.attendance.filter(a => a.status === 'present').length : 0;
        
        div.innerHTML = `
            <div class="attendance-course">
                <h4>${course.title}</h4>
                <p class="course-instructor">${course.instructor}</p>
            </div>
            
            <div class="attendance-stats">
                <div class="stat">
                    <span class="stat-label">Present:</span>
                    <span class="stat-value">${presentCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total:</span>
                    <span class="stat-value">${attendanceCount}</span>
                </div>
            </div>
            
            <div class="attendance-percentage-display">
                <div class="percentage-circle" style="--percentage: ${course.attendancePercentage}%">
                    <span>${course.attendancePercentage}%</span>
                </div>
            </div>
            
            <div class="attendance-actions">
                <button class="btn btn-primary view-attendance" data-course-id="${course.id}">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;

        return div;
    }

    setupAttendanceListeners() {
        // Mark attendance button
        document.getElementById('mark-attendance-btn').addEventListener('click', () => {
            this.openAttendanceModal();
        });

        // Attendance form submission
        document.getElementById('attendance-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAttendance();
        });

        // Event delegation for view details
        document.getElementById('attendance-records').addEventListener('click', (e) => {
            if (e.target.closest('.view-attendance')) {
                const courseId = e.target.closest('.view-attendance').dataset.courseId;
                this.viewAttendanceDetails(courseId);
            }
        });

        // Populate course selectors
        this.updateCourseSelectors();
    }

    updateCourseSelectors() {
        const courses = this.currentUser.courses || [];
        const selector = document.getElementById('attendance-course');
        
        if (selector) {
            selector.innerHTML = '<option value="">Select a course</option>';
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.title;
                selector.appendChild(option);
            });
        }
    }

    openAttendanceModal(attendance = null) {
        const modal = document.getElementById('attendance-modal');
        
        // Set default date to today
        document.getElementById('attendance-date').valueAsDate = new Date();
        
        modal.style.display = 'flex';
    }

    saveAttendance() {
        const courseId = document.getElementById('attendance-course').value;
        const date = document.getElementById('attendance-date').value;
        const status = document.getElementById('attendance-status').value;

        // Validation
        if (!courseId || !date || !status) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const attendanceRecord = {
            id: `attendance_${Date.now()}`,
            courseId,
            date: new Date(date).toISOString(),
            status,
            markedAt: new Date().toISOString()
        };

        // Find the course
        const courses = this.currentUser.courses || [];
        const courseIndex = courses.findIndex(c => c.id === courseId);
        
        if (courseIndex === -1) {
            this.showToast('Course not found', 'error');
            return;
        }

        // Add attendance to course
        if (!courses[courseIndex].attendance) {
            courses[courseIndex].attendance = [];
        }

        // Check if attendance already marked for this date
        const existingIndex = courses[courseIndex].attendance.findIndex(a => 
            new Date(a.date).toDateString() === new Date(date).toDateString()
        );

        if (existingIndex !== -1) {
            // Update existing record
            courses[courseIndex].attendance[existingIndex] = attendanceRecord;
        } else {
            // Add new record
            courses[courseIndex].attendance.push(attendanceRecord);
        }

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.loadAttendance();
        
        // Close modal
        document.getElementById('attendance-modal').style.display = 'none';
        
        // Show success message
        this.showToast('Attendance marked successfully!', 'success');
    }

    viewAttendanceDetails(courseId) {
        const courses = this.currentUser.courses || [];
        const course = courses.find(c => c.id === courseId);
        
        if (!course || !course.attendance || course.attendance.length === 0) {
            alert('No attendance records found for this course.');
            return;
        }

        let details = `Attendance Details for ${course.title}:\n\n`;
        
        // Sort by date (most recent first)
        const sortedAttendance = [...course.attendance].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        sortedAttendance.forEach(record => {
            const date = new Date(record.date).toLocaleDateString();
            const status = record.status === 'present' ? '✅ Present' : '❌ Absent';
            details += `${date}: ${status}\n`;
        });

        alert(details);
    }

    updateDashboardAttendance() {
        // Update dashboard attendance
        document.getElementById('attendance-percent').textContent = 
            `${this.currentUser.overallAttendance}%`;
    }

    updateUserInStorage() {
        const users = JSON.parse(localStorage.getItem('students')) || [];
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...this.currentUser };
            localStorage.setItem('students', JSON.stringify(users));
        }
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

    // Public method to get attendance percentage
    getOverallAttendance() {
        return this.currentUser.overallAttendance || 0;
    }
}

window.AttendanceModule = AttendanceModule;