# SMART-STUDENT-PORTAL

# Smart Student Portal

A comprehensive web application for students to manage their academic life, built with HTML, CSS, and JavaScript.

## Features

### 1. User Authentication
- Registration with validation
- Login with credential checking
- Password requirements: 8+ characters with at least one number
- Secure localStorage persistence

### 2. Profile Management
- Upload profile picture
- Edit personal information (bio, major, year)
- Persistent profile data

### 3. Course Management
- Add/Edit/Delete courses
- Course details: title, instructor, credits, semester, grade
- Sort by title, credits, or grade
- Filter by semester

### 4. Assignment System
- Create assignments with due dates and points
- Submit assignments (text or file upload)
- Track submission status
- Enter grades for assignments

### 5. Grade Calculation
- Automatic grade calculation per course
- GPA computation (4.0 scale)
- Grade-to-letter conversion
- Weighted assignment scores

### 6. Attendance Tracker
- Mark daily attendance per course
- Calculate attendance percentage
- Overall attendance summary

### 7. Report Generation
- Printable report card
- Course grades and GPA
- Attendance summary
- Clean print formatting

### 8. Dashboard
- Overview of key statistics
- Upcoming assignments
- Recent grades
- Quick actions

### 9. Additional Features
- Dark/Light mode toggle
- Data import/export (JSON)
- Search functionality
- Responsive design
- Toast notifications

## Technical Implementation

### Architecture
- Modular JavaScript (ES6 classes)
- Single Page Application (SPA) pattern
- LocalStorage for data persistence
- Event-driven communication between modules

### Security Notes
- Passwords are encoded (NOT securely hashed - for demonstration only)
- User data is stored locally in browser
- No backend server required

### Data Structure
```json
{
  "users": [
    {
      "id": "unique_id",
      "name": "Student Name",
      "email": "student@example.com",
      "password": "encoded_password",
      "courses": [
        {
          "id": "course_id",
          "title": "Course Title",
          "instructor": "Instructor Name",
          "credits": 3,
          "semester": "Fall 2024",
          "grade": "A",
          "assignments": [],
          "attendance": []
        }
      ]
    }
  ]
}
