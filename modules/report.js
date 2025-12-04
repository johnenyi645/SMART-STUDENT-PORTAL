class ReportModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeReport();
    }

    initializeReport() {
        if (!this.currentUser) return;

        // Setup event listeners
        this.setupReportListeners();
    }

    setupReportListeners() {
        // Generate report button (dashboard)
        document.querySelector('[data-action="generate-report"]').addEventListener('click', () => {
            this.generateReport();
        });

        // Print report button
        document.getElementById('print-report').addEventListener('click', () => {
            this.printReport();
        });

        // Close report button
        document.getElementById('close-report').addEventListener('click', () => {
            this.closeReport();
        });
    }

    generateReport() {
        // Calculate grades and attendance
        this.updateCalculations();
        
        // Populate report data
        this.populateReportData();
        
        // Show report
        document.getElementById('report-card').classList.remove('hidden');
    }

    updateCalculations() {
        // Ensure grades and attendance are calculated
        if (window.gradeModule) {
            window.gradeModule.loadGrades();
        }
        
        if (window.attendanceModule) {
            window.attendanceModule.loadAttendance();
        }
    }

    populateReportData() {
        const courses = this.currentUser.courses || [];
        const { gpa, totalCredits } = this.calculateGPA();
        const overallAttendance = this.calculateOverallAttendance();

        // Student info
        document.getElementById('report-name').textContent = this.currentUser.name;
        document.getElementById('report-id').textContent = `Student ID: ${this.currentUser.id.slice(-8)}`;
        document.getElementById('report-date').textContent = 
            `Date: ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}`;

        // Summary
        document.getElementById('report-gpa').textContent = gpa.toFixed(2);
        document.getElementById('report-credits').textContent = totalCredits;
        document.getElementById('report-attendance').textContent = `${overallAttendance}%`;

        // Courses table
        const tbody = document.getElementById('report-courses');
        tbody.innerHTML = '';

        if (courses.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="empty-row">
                    No courses enrolled
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        courses.forEach(course => {
            const grade = course.calculatedGrade || course.grade || 'N/A';
            const attendance = course.attendancePercentage || 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.title}</td>
                <td>${course.instructor}</td>
                <td>${course.credits}</td>
                <td>${grade}</td>
                <td>${attendance}%</td>
            `;
            tbody.appendChild(row);
        });
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

        return totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    }

    printReport() {
        window.print();
    }

    closeReport() {
        document.getElementById('report-card').classList.add('hidden');
    }

    // Export data as JSON
    exportData() {
        const data = {
            student: {
                name: this.currentUser.name,
                email: this.currentUser.email,
                id: this.currentUser.id
            },
            courses: this.currentUser.courses || [],
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `student_data_${this.currentUser.id}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Data exported successfully!', 'success');
    }

    // Import data from JSON
    importData(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data
                if (!this.validateImportedData(importedData)) {
                    this.showToast('Invalid data format', 'error');
                    return;
                }
                
                // Merge with existing data
                this.mergeImportedData(importedData);
                
                this.showToast('Data imported successfully!', 'success');
                
                // Refresh the app
                window.location.reload();
            } catch (error) {
                this.showToast('Error importing data', 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
    }

    validateImportedData(data) {
        return data && 
               data.student && 
               data.student.id === this.currentUser.id &&
               Array.isArray(data.courses);
    }

    mergeImportedData(importedData) {
        const currentCourses = this.currentUser.courses || [];
        const importedCourses = importedData.courses || [];
        
        // Merge courses by ID
        const mergedCourses = [...currentCourses];
        
        importedCourses.forEach(importedCourse => {
            const existingIndex = mergedCourses.findIndex(c => c.id === importedCourse.id);
            if (existingIndex !== -1) {
                // Merge assignments and attendance
                const existingCourse = mergedCourses[existingIndex];
                importedCourse.assignments = [
                    ...(existingCourse.assignments || []),
                    ...(importedCourse.assignments || [])
                ];
                importedCourse.attendance = [
                    ...(existingCourse.attendance || []),
                    ...(importedCourse.attendance || [])
                ];
                mergedCourses[existingIndex] = importedCourse;
            } else {
                mergedCourses.push(importedCourse);
            }
        });
        
        // Update current user
        this.currentUser.courses = mergedCourses;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
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

    // Public methods for import/export
    setupImportExport() {
        // Add import/export buttons to the UI
        const importExportHtml = `
            <div class="import-export-section">
                <button id="export-data" class="btn btn-secondary">
                    <i class="fas fa-download"></i> Export Data
                </button>
                <label for="import-data" class="btn btn-secondary">
                    <i class="fas fa-upload"></i> Import Data
                </label>
                <input type="file" id="import-data" accept=".json" style="display: none;">
            </div>
        `;
        
        // Add to grades page
        const gradesHeader = document.querySelector('#grades .page-header');
        if (gradesHeader) {
            gradesHeader.insertAdjacentHTML('beforeend', importExportHtml);
            
            // Add event listeners
            document.getElementById('export-data').addEventListener('click', () => {
                this.exportData();
            });
            
            document.getElementById('import-data').addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.importData(e.target.files[0]);
                }
            });
        }
    }
}

window.ReportModule = ReportModule;