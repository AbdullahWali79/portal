# Frontend Admin Features Documentation

This document describes the frontend implementation of the Admin Time Limit Control features for the JobPortal application.

## 🎯 Features Implemented

### 1. AdminDashboard Component
- **Post Creation Form** with time limit control
- **Post Management** with expiry date display
- **Extend Post Modal** for extending visibility
- **Toast Notifications** for user feedback
- **Responsive Design** for all screen sizes

### 2. Updated Landing Page
- **Filtered Job Display** (only visible and non-expired posts)
- **Enhanced Job Cards** with expiry information
- **User Authentication** integration
- **Admin Dashboard Access** for admin users

### 3. Authentication System
- **AuthModal Component** for login/signup
- **Token Management** with localStorage
- **Role-based Access** control
- **User State Management**

## 🏗️ Component Structure

```
frontend/src/
├── components/
│   ├── AdminDashboard.jsx      # Main admin interface
│   ├── AdminDashboard.css      # Admin dashboard styles
│   ├── AuthModal.jsx           # Authentication modal
│   └── AuthModal.css           # Auth modal styles
├── App.tsx                     # Main app with landing page
└── App.css                     # Updated app styles
```

## 🔧 AdminDashboard Features

### Post Creation Form

**Key Fields:**
- Job Title (required)
- Company Selection (dropdown)
- Description (required)
- Location (required)
- Show for (days) - **NEW FIELD** (default: 7 days)
- Employment Type
- Experience Level
- Salary Range
- Requirements & Benefits

**Time Limit Control:**
```jsx
<div className="form-group">
  <label>Show for (days) *</label>
  <input
    type="number"
    min="1"
    max="365"
    value={createForm.daysLimit}
    onChange={(e) => setCreateForm({...createForm, daysLimit: parseInt(e.target.value)})}
    required
  />
</div>
```

### Post Management

**Post List Features:**
- **Expiry Date Display** with formatting
- **Days Until Expiry** calculation
- **Expired Post Styling** (red border, opacity)
- **Extend Button** for each post
- **Visibility Status** indicator

**Post Card Structure:**
```jsx
<div className="post-card">
  <div className="post-header">
    <h3>{post.title}</h3>
    <button onClick={() => openExtendModal(post)}>Extend</button>
  </div>
  
  <div className="post-meta">
    <div className="expiry-info">
      <p><strong>Expires:</strong> {formatDate(post.expires_at)}</p>
      <p className={`status ${isExpired(post.expires_at) ? 'expired' : 'active'}`}>
        {isExpired(post.expires_at) ? 'EXPIRED' : `${getDaysUntilExpiry(post.expires_at)} days left`}
      </p>
    </div>
    <div className="visibility-info">
      <p><strong>Visible:</strong> {post.visible ? 'Yes' : 'No'}</p>
    </div>
  </div>
</div>
```

### Extend Post Modal

**Features:**
- **Current Expiry Display**
- **Extra Days Input** (1-365 days)
- **Validation** with error handling
- **Success Feedback** with toast notification

**Modal Implementation:**
```jsx
<form onSubmit={handleExtendPost}>
  <div className="form-group">
    <label>Current Expiry: {formatDate(selectedPost.expires_at)}</label>
  </div>
  
  <div className="form-group">
    <label>Add Extra Days *</label>
    <input
      type="number"
      min="1"
      max="365"
      value={extendForm.extraDays}
      onChange={(e) => setExtendForm({...extendForm, extraDays: parseInt(e.target.value)})}
      required
    />
  </div>
</form>
```

## 🎨 Styling Features

### Admin Dashboard Styles

**Key CSS Classes:**
- `.admin-dashboard` - Main container
- `.post-card` - Individual post cards
- `.post-card.expired` - Expired post styling
- `.modal-overlay` - Modal backdrop
- `.toast` - Notification styling

**Visual Indicators:**
- **Green Border** - Active posts
- **Red Border** - Expired posts
- **Status Badges** - Active/Expired status
- **Hover Effects** - Interactive feedback

### Responsive Design

**Breakpoints:**
- **Desktop** - Full grid layout
- **Tablet** - Adjusted spacing
- **Mobile** - Single column layout

**Mobile Optimizations:**
```css
@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .post-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

## 🔄 API Integration

### Admin Endpoints

**Create Post:**
```javascript
const response = await axios.post('/api/admin/posts', createForm, {
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  }
});
```

**Extend Post:**
```javascript
const response = await axios.post(`/api/admin/posts/${selectedPost.id}/extend`, extendForm, {
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  }
});
```

**Fetch Posts:**
```javascript
const response = await axios.get('/api/admin/posts', {
  headers: { 'Authorization': `Bearer ${getAuthToken()}` }
});
```

### Landing Page Integration

**Filtered Job Fetching:**
```javascript
const fetchJobs = async () => {
  const response = await axios.get('/api/posts')
  // Filter jobs that are visible and not expired
  const visibleJobs = response.data.posts?.filter((job) => 
    job.visible === true && new Date(job.expires_at) > new Date()
  ) || []
  setJobs(visibleJobs)
}
```

## 🎯 User Experience Features

### Toast Notifications

**Success Messages:**
- "Post created successfully!"
- "Post extended by X days!"
- "Post updated successfully!"

**Error Messages:**
- "Failed to create post"
- "Failed to extend post"
- "Authentication failed"

**Implementation:**
```javascript
const showToast = (message, type = 'success') => {
  setToast({ message, type });
  setTimeout(() => setToast(null), 3000);
};
```

### Form Validation

**Client-side Validation:**
- Required field checking
- Number range validation (1-365 days)
- Email format validation
- Real-time feedback

**Error Handling:**
- API error display
- Network error handling
- User-friendly error messages

## 🔐 Authentication Integration

### User State Management

**Auth Check:**
```javascript
const checkUserAuth = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const response = await axios.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setUser(response.data.user)
    }
  } catch (error) {
    localStorage.removeItem('auth_token')
  }
}
```

### Role-based Access

**Admin Dashboard Access:**
```javascript
{user?.role === 'admin' && (
  <button 
    className="btn btn-secondary"
    onClick={() => setShowAdminDashboard(true)}
  >
    Admin Dashboard
  </button>
)}
```

## 📱 Mobile Responsiveness

### Key Responsive Features

1. **Flexible Grid Layouts**
   - Desktop: Multi-column grids
   - Mobile: Single column layout

2. **Touch-friendly Buttons**
   - Adequate button sizes
   - Proper spacing for touch targets

3. **Readable Typography**
   - Scalable font sizes
   - Proper line heights

4. **Optimized Forms**
   - Stacked form fields on mobile
   - Full-width inputs

## 🚀 Usage Instructions

### For Administrators

1. **Login** with admin credentials
2. **Click "Admin Dashboard"** button
3. **Create Posts** with time limits:
   - Fill out job details
   - Set "Show for (days)" field
   - Submit form
4. **Manage Posts**:
   - View all posts with expiry dates
   - Click "Extend" to add more days
   - Monitor post visibility status

### For Regular Users

1. **Browse Jobs** on landing page
2. **View Job Details** with expiry information
3. **Apply for Jobs** (if authenticated)
4. **See Only Active Jobs** (expired posts are hidden)

## 🔧 Development Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_API_URL=http://localhost:3001
```

### Component Usage

```jsx
// Import AdminDashboard
import AdminDashboard from './components/AdminDashboard'

// Use in your app
<AdminDashboard />
```

## 📊 Performance Considerations

### Optimization Features

1. **Lazy Loading** - Components load on demand
2. **Efficient Filtering** - Client-side job filtering
3. **Debounced Inputs** - Reduced API calls
4. **Memoized Calculations** - Cached date calculations

### Best Practices

1. **Error Boundaries** - Graceful error handling
2. **Loading States** - User feedback during operations
3. **Form Validation** - Client-side validation before API calls
4. **Responsive Images** - Optimized for different screen sizes

This frontend implementation provides a complete admin interface for managing job post time limits with an intuitive user experience and robust error handling.
