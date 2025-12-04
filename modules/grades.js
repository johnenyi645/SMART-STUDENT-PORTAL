class GradeModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeGrades();
    }

    initializeGrades() {
        if (!this.currentUser) return;

        // Load grades
        this.loadGrades();
        
        // Setup event listeners
        this.setupGradeListeners();
        
        // Listen for events
        window.addEventListener('openGradeModal', (e) => {
            this.openGradeModal(e.detail.assignmentId, e.detail.courseId);
        });
    }

    loadGrades() {
        this.calculateAllGrades();
        this.renderGrades();
        this.updateDashboardGrades();
    }

    calculateAllGrades() {
        const courses = this.currentUser.courses || [];
        
        courses.forEach(course => {
            if (course.assignments && course.assignments.length > 0) {
                this.calculateCourseGrade(course);
            }
        });
        
        // Update current user
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    calculateCourseGrade(course) {
        const assignments = course.assignments || [];
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let hasGrades = false;

        assignments.forEach(assignment => {
            if (assignment.grade !== undefined && assignment.weight) {
                const percentage = (assignment.grade / assignment.points) * 100;
                totalWeightedScore += percentage * assignment.weight;
                totalWeight += assignment.weight;
                hasGrades = true;
            }
        });

        if (!hasGrades || totalWeight === 0) {
            course.calculatedGrade = null;
            return;
        }

        const finalPercentage = totalWeightedScore / totalWeight;
        course.calculatedGrade = this.percentageToGrade(finalPercentage);
        course.finalPercentage = finalPercentage;
    }

    percentageToGrade(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    calculateGPA() {
        const courses = this.currentUser.courses || [];
        let totalPoints = 0;
        let totalCredits = 0;

        const gradePoints = {
            'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0
        };

        courses.forEach(course => {
            const grade = course.calculatedGrade || course.grade;
            if (grade && gradePoints[grade]) {
                totalPoints += gradePoints[grade] * course.credits;
                totalCredits += course.credits;
            }
        });

        return {
            gpa: totalCredits > 0 ? totalPoints / totalCredits : 0,
            totalCredits: totalCredits
        };
    }

    renderGrades() {
        const container = document.getElementById('grades-list');
        container.innerHTML = '';

        const courses = this.currentUser.courses || [];
        const { gpa, totalCredits } = this.calculateGPA();

        // Update GPA display
        document.getElementById('current-gpa').textContent = gpa.toFixed(2);
        document.getElementById('total-credits').textContent = totalCredits;

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line fa-3x"></i>
                    <h3>No courses with grades</h3>
                    <p>Add courses and enter grades to see your GPA</p>
                </div>
            `;
            return;
        }

        courses.forEach(course => {
            const gradeItem = this.createGradeItem(course);
            container.appendChild(gradeItem);
        });
    }

    createGradeItem(course) {
        const div = document.createElement('div');
        div.className = 'grade-item';
        
        const grade = course.calculatedGrade || course.grade;
        const percentage = course.finalPercentage;
        const gradeDisplay = grade ? 
            `<span class="grade-value grade-${grade}">${grade}</span>` : 
            '<span class="grade-value">No Grade</span>';
        
        const percentageDisplay = percentage ? 
            `<div class="grade-percentage">${percentage.toFixed(1)}%</div>` : '';
        
        div.innerHTML = `
            <div class="grade-header">
                <h4>${course.title}</h4>
                ${gradeDisplay}
            </div>
            
            <div class="grade-details">
                <p>Instructor: ${course.instructor}</p>
                <p>Credits: ${course.credits}</p>
                <p>Semester: ${course.semester}</p>
            </div>
            
            ${percentageDisplay}
            
            <div class="grade-assignments">
                <h5>Assignments:</h5>
                ${this.createAssignmentGradesList(course)}
            </div>
        `;

        return div;
    }

    createAssignmentGradesList(course) {
        const assignments = course.assignments || [];
        
        if (assignments.length === 0) {
            return '<p>No assignments</p>';
        }

        let html = '<div class="assignment-grades">';
        
        assignments.forEach(assignment => {
            const gradeDisplay = assignment.grade !== undefined ? 
                `${assignment.grade}/${assignment.points}` : 
                'Not graded';
            
            html += `
                <div class="assignment-grade-item">
                    <span class="assignment-title">${assignment.title}</span>
                    <span class="assignment-score">${gradeDisplay}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    setupGradeListeners() {
        // Calculate GPA button
        document.getElementById('calculate-gpa-btn').addEventListener('click', () => {
            this.loadGrades();
            this.showToast('GPA calculated successfully!', 'success');
        });

        // Grade form submission
        document.getElementById('grade-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGrade();
        });

        // Listen for grade modal opening
        document.getElementById('grade-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openGradeModal(assignmentId, courseId) {
        // Find the assignment
        const courses = this.currentUser.courses || [];
        const course = courses.find(c => c.id === courseId);
        if (!course || !course.assignments) return;

        const assignment = course.assignments.find(a => a.id === assignmentId);
        if (!assignment) return;

        const modal = document.getElementById('grade-modal');
        document.getElementById('grade-assignment-id').value = assignmentId;
        document.getElementById('max-points').textContent = assignment.points;
        
        // Set current grade if exists
        if (assignment.grade !== undefined) {
            document.getElementById('grade-score').value = assignment.grade;
        } else {
            document.getElementById('grade-score').value = '';
        }
        
        modal.style.display = 'flex';
    }

    saveGrade() {
        const assignmentId = document.getElementById('grade-assignment-id').value;
        const score = parseInt(document.getElementById('grade-score').value);
        const maxPoints = parseInt(document.getElementById('max-points').textContent);

        // Validation
        if (isNaN(score) || score < 0 || score > maxPoints) {
            this.showToast(`Please enter a valid score between 0 and ${maxPoints}`, 'error');
            return;
        }

        // Find the assignment
        const courses = this.currentUser.courses || [];
        let assignmentFound = false;

        for (let i = 0; i < courses.length; i++) {
            if (courses[i].assignments) {
                const assignmentIndex = courses[i].assignments.findIndex(a => a.id === assignmentId);
                if (assignmentIndex !== -1) {
                    // Update assignment grade
                    courses[i].assignments[assignmentIndex].grade = score;
                    assignmentFound = true;
                    
                    // Recalculate course grade
                    this.calculateCourseGrade(courses[i]);
                    break;
                }
            }
        }

        if (!assignmentFound) {
            this.showToast('Assignment not found', 'error');
            return;
        }

        // Update current user
        this.currentUser.courses = courses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        this.updateUserInStorage();

        // Refresh displays
        this.loadGrades();
        
        // Update assignments page
        if (window.assignmentModule) {
            window.assignmentModule.loadAssignments();
        }
        
        // Close modal
        document.getElementById('grade-modal').style.display = 'none';
        
        // Show success message
        this.showToast('Grade saved successfully!', 'success');
    }

    updateDashboardGrades() {
        const { gpa } = this.calculateGPA();
        
        // Update dashboard GPA
        document.getElementById('gpa-display').textContent = gpa.toFixed(2);
        
        // Update recent grades
        const recentGradesList = document.getElementById('recent-grades-list');
        recentGradesList.innerHTML = '';
        
        const allAssignments = [];
        const courses = this.currentUser.courses || [];
        
        courses.forEach(course => {
            if (course.assignments) {
                course.assignments.forEach(assignment => {
                    if (assignment.grade !== undefined) {
                        allAssignments.push({
                            ...assignment,
                            courseTitle: course.title
                        });
                    }
                });
            }
        });
        
        // Sort by submission date (most recent first)
        allAssignments.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        
        // Show 5 most recent grades
        const recent = allAssignments.slice(0, 5);
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

    // Public method to get GPA
    getGPA() {
        return this.calculateGPA().gpa;
    }
}

window.GradeModule = GradeModule;