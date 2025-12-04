class ProfileModule {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeProfile();
    }

    initializeProfile() {
        if (!this.currentUser) return;

        // Load profile data
        this.loadProfile();
        
        // Setup event listeners
        this.setupProfileListeners();
    }

    loadProfile() {
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('profile-id').textContent = `Student ID: ${this.currentUser.id.slice(-8)}`;
        
        if (this.currentUser.bio) {
            document.getElementById('profile-bio').value = this.currentUser.bio;
        }
        
        if (this.currentUser.major) {
            document.getElementById('profile-major').value = this.currentUser.major;
        }
        
        if (this.currentUser.year) {
            document.getElementById('profile-year').value = this.currentUser.year;
        }
        
        if (this.currentUser.profileImage) {
            document.getElementById('profile-image').src = this.currentUser.profileImage;
        }
    }

    setupProfileListeners() {
        // Profile form submission
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Image upload
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });
    }

    saveProfile() {
        const bio = document.getElementById('profile-bio').value;
        const major = document.getElementById('profile-major').value;
        const year = document.getElementById('profile-year').value;

        // Update current user
        this.currentUser.bio = bio;
        this.currentUser.major = major;
        this.currentUser.year = year;

        // Update in localStorage
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update in users array
        const users = JSON.parse(localStorage.getItem('students')) || [];
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...this.currentUser };
            localStorage.setItem('students', JSON.stringify(users));
        }

        this.showToast('Profile saved successfully!', 'success');
    }

    handleImageUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            this.showToast('Image size should be less than 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            // Update profile image
            document.getElementById('profile-image').src = imageUrl;
            
            // Save to current user
            this.currentUser.profileImage = imageUrl;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Update in users array
            const users = JSON.parse(localStorage.getItem('students')) || [];
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].profileImage = imageUrl;
                localStorage.setItem('students', JSON.stringify(users));
            }

            this.showToast('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
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

// Export for use in main app
window.ProfileModule = ProfileModule;