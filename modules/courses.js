class CourseModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeCourses();
    }

    initializeCourses() {
        if (!this.currentUser) return;

        // Load courses
        this.loadCourses();
        
        // Setup event listeners
        this.setupCourseListeners();
    }

    loadCourses() {
        const courses = this.currentUser.courses || [];
        this.renderCourses(courses);
    }

    renderCourses(courses) {
        const container = document.getElementById('courses-list');
        container.innerHTML = '';

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book fa-3x"></i>
                    <h3>No courses yet</h3>
                    <p>Add your first course to get started!</p>
                </div>
            `;
            return;
        }

        courses.forEach(course => {
            const courseCard = this.createCourseCard(course);
            container.appendChild(courseCard);
        });
    }

    createCourseCard(course) {
        const div = document.createElement('div');
        div.className = 'course-card';
        div.dataset.id = course.id;
        
        const gradeDisplay = course.grade ? 
            `<span class="course-grade grade-${course.grade}">${course.grade}</span>` : 
            '<span class="course-grade">Not Graded</span>';
        
        div.innerHTML = `
            <div class="course-header">
                <h3>${course.title}</h3>
                ${gradeDisplay}
            </div>
            <div class="course-details">
                <p><i class="fas fa-user"></i> ${course.instructor}</p>
                <p><i class="fas fa-certificate"></i> ${course.credits} Credits</p>
                <p><i class="fas fa-calendar"></i> ${course.semester}</p>
            </div>
            <div class="course-actions">
                <button class="btn btn-primary edit-course">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger delete-course">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return div;
    }

    setupCourseListeners() {
        // Add course button
        document.getElementById('add-course-btn').addEventListener('click', () => {
            this.openCourseModal();
        });

        // Course form submission
        document.getElementById('course-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCourse();
        });

        // Search functionality
        document.getElementById('course-search').addEventListener('input', (e) => {
            this.filterCourses(e.target.value);
        });

        // Semester filter
        document.getElementById('semester-filter').addEventListener('change', (e) => {
            this.filterCoursesBySemester(e.target.value);
        });

        // Sort functionality
        document.getElementById('course-sort').addEventListener('change', (e) => {
            this.sortCourses(e.target.value);
        });

        // Event delegation for edit/delete buttons
        document.getElementById('courses-list').addEventListener('click', (e) => {
            const courseCard = e.target.closest('.course-card');
            if (!courseCard) return;

            const courseId = courseCard.dataset.id;
            
            if (e.target.closest('.edit-course')) {
                this.editCourse(courseId);
            } else if (e.target.closest('.delete-course')) {
                this.deleteCourse(courseId);
            }
        });
    }

    openCourseModal(course = null) {
        const modal = document.getElementById('course-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('course-form');
        
        if (course) {
            modalTitle.textContent = 'Edit Course';
            document.getElementById('course-id').value = course.id;
            document.getElementById('course-title').value = course.title;
            document.getElementById('course-instructor').value = course.instructor;
            document.getElementById('course-credits').value = course.credits;
            document.getElementById('course-semester').value = course.semester;
            document.getElementById('course-grade').value = course.grade || '';
        } else {
            modalTitle.textContent = 'Add Course';
            form.reset();
            document.getElementById('course-id').value = '';
        }
        
        modal.style.display = 'flex';
    }

    saveCourse() {
        const courseId = document.getElementById('course-id').value;
        const title = document.getElementById('course-title').value.trim();
        const instructor = document.getElementById('course-instructor').value.trim();
        const credits = parseInt(document.getElementById('course-credits').value);
        const semester = document.getElementById('course-semester').value;
        const grade = document.getElementById('course-grade').value;

        // Validation
        if (!title || !instructor || !credits || !semester) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        const course = {
            id: courseId || `course_${Date.now()}`,
            title,
            instructor,
            credits,
            semester,
            grade: grade || null,
            assignments: [],
            attendance: []
        };

        // Update courses array
        let courses = this.currentUser.courses || [];
        
        if (courseId) {
            // Update existing course
            const index = courses.findIndex(c => c.id === courseId);
            if (index !== -1) {
                course.assignments = courses[index].assignments || [];
                course.attendance = courses[index].attendance || [];
                courses[index] = course;
            }
        } else {
            // Add new course
            courses.push(course);
        }

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.renderCourses(courses);
        
        // Close modal
        document.getElementById('course-modal').style.display = 'none';
        
        // Show success message
        this.showToast(courseId ? 'Course updated!' : 'Course added!', 'success');
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('coursesUpdated', { detail: courses }));
    }

    editCourse(courseId) {
        const courses = this.currentUser.courses || [];
        const course = courses.find(c => c.id === courseId);
        if (course) {
            this.openCourseModal(course);
        }
    }

    deleteCourse(courseId) {
        if (!confirm('Are you sure you want to delete this course?')) {
            return;
        }

        const courses = this.currentUser.courses || [];
        const updatedCourses = courses.filter(c => c.id !== courseId);
        
        // Update current user
        this.currentUser.courses = updatedCourses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.renderCourses(updatedCourses);
        
        // Show success message
        this.showToast('Course deleted!', 'success');
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('coursesUpdated', { detail: updatedCourses }));
    }

    filterCourses(searchTerm) {
        const courses = this.currentUser.courses || [];
        const filtered = courses.filter(course => 
            course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderCourses(filtered);
    }

    filterCoursesBySemester(semester) {
        const courses = this.currentUser.courses || [];
        if (!semester) {
            this.renderCourses(courses);
            return;
        }
        const filtered = courses.filter(course => course.semester === semester);
        this.renderCourses(filtered);
    }

    sortCourses(sortBy) {
        const courses = this.currentUser.courses || [];
        const sorted = [...courses].sort((a, b) => {
            switch(sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'credits':
                    return b.credits - a.credits;
                case 'grade':
                    const gradeOrder = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
                    const gradeA = a.grade ? gradeOrder[a.grade] || -1 : -1;
                    const gradeB = b.grade ? gradeOrder[b.grade] || -1 : -1;
                    return gradeB - gradeA;
                default:
                    return 0;
            }
        });
        this.renderCourses(sorted);
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

    // Public method to get courses
    getCourses() {
        return this.currentUser.courses || [];
    }
}

window.CourseModule = CourseModule;