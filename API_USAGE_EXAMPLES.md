# JobPortal API Usage Examples

This document provides practical examples of how to use the JobPortal API endpoints.

## 🔐 Authentication Setup

First, you need to authenticate with Supabase to get a JWT token:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

const token = data.session.access_token;
```

## 📋 API Endpoints Examples

### 1. Company Registration

#### Create Company Request
```bash
curl -X POST http://localhost:3001/api/companies/request \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechStart Inc.",
    "description": "A cutting-edge technology startup",
    "website": "https://techstart.com",
    "industry": "Technology",
    "size": "10-50",
    "location": "San Francisco, CA",
    "contact_email": "hr@techstart.com",
    "contact_phone": "+1-555-0123",
    "logo_url": "https://example.com/logo.png"
  }'
```

**Response:**
```json
{
  "message": "Company request submitted successfully",
  "company": {
    "id": "uuid",
    "name": "TechStart Inc.",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Check Company Status
```bash
curl http://localhost:3001/api/companies/status/uuid
```

### 2. Admin Operations

#### List Pending Companies
```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3001/api/admin/companies?status=pending&page=1&limit=10"
```

#### Approve Company
```bash
curl -X POST http://localhost:3001/api/admin/companies/uuid/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "admin_notes": "Company verified and approved"
  }'
```

#### Get Admin Dashboard Stats
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3001/api/admin/stats
```

### 3. Job Post Management

#### Create Job Post (Company)
```bash
curl -X POST http://localhost:3001/api/companies/uuid/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior React Developer",
    "description": "We are looking for an experienced React developer...",
    "requirements": "5+ years React experience, TypeScript, CSS",
    "benefits": "Health insurance, 401k, flexible hours",
    "salary_min": 120000,
    "salary_max": 150000,
    "currency": "USD",
    "location": "San Francisco, CA",
    "remote_ok": true,
    "employment_type": "full-time",
    "experience_level": "senior",
    "contact_email": "jobs@techstart.com",
    "contact_phone": "+1-555-0123",
    "image_url": "https://example.com/job-image.jpg",
    "days_to_expire": 30
  }'
```

#### List All Job Posts (Public)
```bash
curl "http://localhost:3001/api/posts?page=1&limit=10&location=San Francisco&employment_type=full-time"
```

#### Get Single Job Post
```bash
curl http://localhost:3001/api/posts/uuid
```

#### Admin: List All Posts
```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3001/api/admin/posts?status=active&page=1&limit=10"
```

#### Admin: Extend Post Expiry
```bash
curl -X POST http://localhost:3001/api/admin/posts/uuid/extend \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

### 4. Job Applications

#### Apply for Job (with CV URL)
```bash
curl -X POST http://localhost:3001/api/posts/uuid/apply \
  -H "Authorization: Bearer <job-seeker-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cover_letter": "I am very interested in this position...",
    "cv_url": "https://storage.supabase.co/object/public/cvs/user-cv.pdf"
  }'
```

#### Apply for Job (with File Upload)
```javascript
// Frontend example with file upload
const formData = new FormData();
formData.append('cover_letter', 'I am very interested in this position...');
formData.append('cv_file', fileInput.files[0]); // PDF file

const response = await fetch('/api/posts/uuid/apply', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### Get My Applications
```bash
curl -H "Authorization: Bearer <job-seeker-token>" \
  http://localhost:3001/api/my/applications
```

#### Get Applications for Job Post (Company)
```bash
curl -H "Authorization: Bearer <company-token>" \
  "http://localhost:3001/api/posts/uuid/applications?status=pending"
```

#### Update Application Status
```bash
curl -X PATCH http://localhost:3001/api/posts/uuid/applications/app-uuid \
  -H "Authorization: Bearer <company-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "notes": "Great candidate, moving to next round"
  }'
```

## 🔧 Frontend Integration Examples

### React Hook for API Calls

```javascript
// hooks/useApi.js
import { useState, useEffect } from 'react';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};
```

### Job Posts Component

```javascript
// components/JobPosts.jsx
import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';

const JobPosts = () => {
  const [filters, setFilters] = useState({
    location: '',
    employment_type: '',
    experience_level: ''
  });

  const { data, loading, error } = useApi(
    `/api/posts?${new URLSearchParams(filters).toString()}`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="filters">
        <input
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters({...filters, location: e.target.value})}
        />
        <select
          value={filters.employment_type}
          onChange={(e) => setFilters({...filters, employment_type: e.target.value})}
        >
          <option value="">All Types</option>
          <option value="full-time">Full Time</option>
          <option value="part-time">Part Time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div className="job-list">
        {data?.posts?.map(post => (
          <div key={post.id} className="job-card">
            <h3>{post.title}</h3>
            <p>{post.companies.name}</p>
            <p>{post.location}</p>
            <p>${post.salary_min} - ${post.salary_max}</p>
            <button onClick={() => applyForJob(post.id)}>
              Apply Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### File Upload Component

```javascript
// components/FileUpload.jsx
import React, { useState } from 'react';

const FileUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv_file', file);

      const response = await fetch('/api/upload/cv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      onUpload(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
      />
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload CV'}
      </button>
    </div>
  );
};
```

## 🚨 Error Handling

### Common Error Responses

```javascript
// Handle API errors
const handleApiError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.status === 403) {
    // Show permission denied message
    alert('You do not have permission to perform this action');
  } else if (error.status === 404) {
    // Show not found message
    alert('Resource not found');
  } else {
    // Show generic error
    alert('An error occurred. Please try again.');
  }
};
```

### Validation Error Handling

```javascript
// Handle validation errors
const handleValidationError = (error) => {
  if (error.details) {
    Object.keys(error.details).forEach(field => {
      const message = error.details[field];
      // Show field-specific error message
      console.error(`${field}: ${message}`);
    });
  }
};
```

## 🔒 Security Best Practices

### Token Management

```javascript
// Token storage and refresh
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  async refreshAuthToken() {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: this.refreshToken
    });

    if (data.session) {
      this.token = data.session.access_token;
      localStorage.setItem('auth_token', this.token);
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }
}
```

### Input Validation

```javascript
// Client-side validation
const validateJobPost = (data) => {
  const errors = {};

  if (!data.title || data.title.length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }

  if (!data.description || data.description.length < 50) {
    errors.description = 'Description must be at least 50 characters';
  }

  if (!data.location) {
    errors.location = 'Location is required';
  }

  if (data.salary_min && data.salary_max && data.salary_min > data.salary_max) {
    errors.salary = 'Minimum salary cannot be greater than maximum salary';
  }

  return errors;
};
```

## 📊 Performance Optimization

### Pagination

```javascript
// Implement pagination
const usePaginatedData = (baseUrl, pageSize = 10) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPage = async (pageNum) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}?page=${pageNum}&limit=${pageSize}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(page);
  }, [page]);

  return { data, loading, page, setPage, loadPage };
};
```

### Caching

```javascript
// Simple caching mechanism
class ApiCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

This comprehensive guide covers all the major API endpoints with practical examples for both backend testing and frontend integration!
