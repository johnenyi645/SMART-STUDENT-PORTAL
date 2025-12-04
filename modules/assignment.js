class AssignmentModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeAssignments();
    }

    initializeAssignments() {
        if (!this.currentUser) return;

        // Load assignments
        this.loadAssignments();
        
        // Setup event listeners
        this.setupAssignmentListeners();
        
        // Listen for course updates
        window.addEventListener('coursesUpdated', () => {
            this.updateCourseSelectors();
        });
    }

    loadAssignments() {
        const assignments = this.getAllAssignments();
        this.renderAssignments(assignments);
        this.updateDashboardAssignments();
    }

    getAllAssignments() {
        const courses = this.currentUser.courses || [];
        let allAssignments = [];
        
        courses.forEach(course => {
            if (course.assignments) {
                course.assignments.forEach(assignment => {
                    allAssignments.push({
                        ...assignment,
                        courseId: course.id,
                        courseTitle: course.title
                    });
                });
            }
        });
        
        // Sort by due date
        return allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    renderAssignments(assignments) {
        const container = document.getElementById('assignments-list');
        container.innerHTML = '';

        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks fa-3x"></i>
                    <h3>No assignments yet</h3>
                    <p>Add your first assignment to get started!</p>
                </div>
            `;
            return;
        }

        assignments.forEach(assignment => {
            const assignmentItem = this.createAssignmentItem(assignment);
            container.appendChild(assignmentItem);
        });
    }

    createAssignmentItem(assignment) {
        const div = document.createElement('div');
        div.className = `assignment-item ${assignment.status || 'pending'}`;
        div.dataset.id = assignment.id;
        div.dataset.courseId = assignment.courseId;
        
        const dueDate = new Date(assignment.dueDate).toLocaleDateString();
        const status = assignment.submitted ? 'Submitted' : 'Pending';
        const statusClass = assignment.submitted ? 'status-submitted' : 'status-pending';
        
        let gradeDisplay = '';
        if (assignment.grade !== undefined) {
            gradeDisplay = `
                <div class="assignment-grade">
                    Grade: ${assignment.grade}/${assignment.points}
                </div>
            `;
        }
        
        div.innerHTML = `
            <div class="assignment-header">
                <div>
                    <h4>${assignment.title}</h4>
                    <p class="assignment-course">${assignment.courseTitle}</p>
                </div>
                <div class="assignment-status ${statusClass}">
                    ${status}
                </div>
            </div>
            
            <div class="assignment-details">
                <p><i class="far fa-calendar"></i> Due: ${dueDate}</p>
                <p><i class="fas fa-weight-hanging"></i> Weight: ${assignment.weight}%</p>
                <p><i class="fas fa-star"></i> Points: ${assignment.points}</p>
                ${gradeDisplay}
            </div>
            
            <div class="assignment-description">
                ${assignment.description || 'No description provided.'}
            </div>
            
            <div class="assignment-actions">
                ${!assignment.submitted ? `
                    <button class="btn btn-primary submit-assignment">
                        <i class="fas fa-paper-plane"></i> Submit
                    </button>
                ` : ''}
                
                ${assignment.submitted && assignment.grade === undefined ? `
                    <button class="btn btn-secondary enter-grade">
                        <i class="fas fa-chart-line"></i> Enter Grade
                    </button>
                ` : ''}
                
                <button class="btn btn-danger delete-assignment">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return div;
    }

    setupAssignmentListeners() {
        // Add assignment button
        document.getElementById('add-assignment-btn').addEventListener('click', () => {
            this.openAssignmentModal();
        });

        // Assignment form submission
        document.getElementById('assignment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAssignment();
        });

        // Submission form
        document.getElementById('submission-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitAssignment();
        });

        // Event delegation for assignment actions
        document.getElementById('assignments-list').addEventListener('click', (e) => {
            const assignmentItem = e.target.closest('.assignment-item');
            if (!assignmentItem) return;

            const assignmentId = assignmentItem.dataset.id;
            const courseId = assignmentItem.dataset.courseId;
            
            if (e.target.closest('.submit-assignment')) {
                this.openSubmissionModal(assignmentId, courseId);
            } else if (e.target.closest('.enter-grade')) {
                this.openGradeModal(assignmentId, courseId);
            } else if (e.target.closest('.delete-assignment')) {
                this.deleteAssignment(assignmentId, courseId);
            }
        });

        // Populate course selectors
        this.updateCourseSelectors();
    }

    updateCourseSelectors() {
        const courses = this.currentUser.courses || [];
        const courseSelectors = [
            document.getElementById('assignment-course'),
            document.getElementById('attendance-course'),
            document.getElementById('grade-course-selector')
        ];

        courseSelectors.forEach(selector => {
            if (selector) {
                selector.innerHTML = '<option value="">Select a course</option>';
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = course.title;
                    selector.appendChild(option);
                });
            }
        });
    }

    openAssignmentModal(assignment = null) {
        const modal = document.getElementById('assignment-modal');
        const modalTitle = document.getElementById('assignment-modal-title');
        const form = document.getElementById('assignment-form');
        
        if (assignment) {
            modalTitle.textContent = 'Edit Assignment';
            document.getElementById('assignment-id').value = assignment.id;
            document.getElementById('assignment-title').value = assignment.title;
            document.getElementById('assignment-course').value = assignment.courseId;
            document.getElementById('assignment-due').value = assignment.dueDate.split('T')[0];
            document.getElementById('assignment-description').value = assignment.description || '';
            document.getElementById('assignment-points').value = assignment.points;
            document.getElementById('assignment-weight').value = assignment.weight;
        } else {
            modalTitle.textContent = 'Add Assignment';
            form.reset();
            document.getElementById('assignment-id').value = '';
            document.getElementById('assignment-due').min = new Date().toISOString().split('T')[0];
        }
        
        modal.style.display = 'flex';
    }

    saveAssignment() {
        const assignmentId = document.getElementById('assignment-id').value;
        const title = document.getElementById('assignment-title').value.trim();
        const courseId = document.getElementById('assignment-course').value;
        const dueDate = document.getElementById('assignment-due').value;
        const description = document.getElementById('assignment-description').value.trim();
        const points = parseInt(document.getElementById('assignment-points').value);
        const weight = parseInt(document.getElementById('assignment-weight').value);

        // Validation
        if (!title || !courseId || !dueDate || !points || !weight) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (points <= 0) {
            this.showToast('Points must be greater than 0', 'error');
            return;
        }

        if (weight <= 0 || weight > 100) {
            this.showToast('Weight must be between 1 and 100', 'error');
            return;
        }

        const assignment = {
            id: assignmentId || `assignment_${Date.now()}`,
            title,
            courseId,
            dueDate: new Date(dueDate).toISOString(),
            description,
            points,
            weight,
            submitted: false,
            submission: null,
            grade: undefined
        };

        // Find the course
        const courses = this.currentUser.courses || [];
        const courseIndex = courses.findIndex(c => c.id === courseId);
        
        if (courseIndex === -1) {
            this.showToast('Course not found', 'error');
            return;
        }

        // Add assignment to course
        if (!courses[courseIndex].assignments) {
            courses[courseIndex].assignments = [];
        }

        const courseAssignments = courses[courseIndex].assignments;
        
        if (assignmentId) {
            // Update existing assignment
            const assignmentIndex = courseAssignments.findIndex(a => a.id === assignmentId);
            if (assignmentIndex !== -1) {
                // Keep existing submission and grade if they exist
                const existingAssignment = courseAssignments[assignmentIndex];
                assignment.submitted = existingAssignment.submitted;
                assignment.submission = existingAssignment.submission;
                assignment.grade = existingAssignment.grade;
                courseAssignments[assignmentIndex] = assignment;
            }
        } else {
            // Add new assignment
            courseAssignments.push(assignment);
        }

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.loadAssignments();
        
        // Close modal
        document.getElementById('assignment-modal').style.display = 'none';
        
        // Show success message
        this.showToast(assignmentId ? 'Assignment updated!' : 'Assignment added!', 'success');
    }

    openSubmissionModal(assignmentId, courseId) {
        const modal = document.getElementById('submission-modal');
        document.getElementById('submission-assignment-id').value = assignmentId;
        modal.style.display = 'flex';
    }

    submitAssignment() {
        const assignmentId = document.getElementById('submission-assignment-id').value;
        const submissionText = document.getElementById('submission-text').value.trim();
        const submissionFile = document.getElementById('submission-file').files[0];

        if (!submissionText && !submissionFile) {
            this.showToast('Please provide a solution or upload a file', 'error');
            return;
        }

        // Find the assignment
        const courses = this.currentUser.courses || [];
        let assignment = null;
        let courseIndex = -1;
        let assignmentIndex = -1;

        for (let i = 0; i < courses.length; i++) {
            if (courses[i].assignments) {
                assignmentIndex = courses[i].assignments.findIndex(a => a.id === assignmentId);
                if (assignmentIndex !== -1) {
                    assignment = courses[i].assignments[assignmentIndex];
                    courseIndex = i;
                    break;
                }
            }
        }

        if (!assignment) {
            this.showToast('Assignment not found', 'error');
            return;
        }

        // Create submission object
        const submission = {
            text: submissionText,
            fileName: submissionFile ? submissionFile.name : null,
            fileType: submissionFile ? submissionFile.type : null,
            submittedAt: new Date().toISOString()
        };

        // Update assignment
        assignment.submitted = true;
        assignment.submission = submission;
        assignment.status = 'submitted';

        // Update course assignments
        courses[courseIndex].assignments[assignmentIndex] = assignment;

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.loadAssignments();
        
        // Close modal and reset form
        document.getElementById('submission-modal').style.display = 'none';
        document.getElementById('submission-form').reset();
        
        // Show success message
        this.showToast('Assignment submitted successfully!', 'success');
    }

    openGradeModal(assignmentId, courseId) {
        // Dispatch event for grade module
        window.dispatchEvent(new CustomEvent('openGradeModal', { 
            detail: { assignmentId, courseId } 
        }));
        
        // Switch to grades page
        document.querySelector('[data-page="grades"]').click();
    }

    deleteAssignment(assignmentId, courseId) {
        if (!confirm('Are you sure you want to delete this assignment?')) {
            return;
        }

        const courses = this.currentUser.courses || [];
        const courseIndex = courses.findIndex(c => c.id === courseId);
        
        if (courseIndex === -1 || !courses[courseIndex].assignments) {
            this.showToast('Assignment not found', 'error');
            return;
        }

        // Remove assignment
        courses[courseIndex].assignments = courses[courseIndex].assignments.filter(
            a => a.id !== assignmentId
        );

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh display
        this.loadAssignments();
        
        // Show success message
        this.showToast('Assignment deleted!', 'success');
    }

    updateDashboardAssignments() {
        const assignments = this.getAllAssignments();
        const pendingAssignments = assignments.filter(a => !a.submitted);
        
        // Update dashboard count
        document.getElementById('assignment-count').textContent = pendingAssignments.length;
        
        // Update upcoming assignments
        const upcomingList = document.getElementById('upcoming-list');
        upcomingList.innerHTML = '';
        
        const upcoming = pendingAssignments.slice(0, 5);
        upcoming.forEach(assignment => {
            const dueDate = new Date(assignment.dueDate).toLocaleDateString();
            const item = document.createElement('div');
            item.className = 'upcoming-item';
            item.innerHTML = `
                <strong>${assignment.title}</strong>
                <span>Due: ${dueDate}</span>
            `;
            upcomingList.appendChild(item);
        });
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

    // Public method to get assignments
    getAssignments() {
        return this.getAllAssignments();
    }
}

window.AssignmentModule = AssignmentModule;