# JobPortal API Documentation

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. **Sign up/Login** via Supabase Auth
2. **Get the access token** from the auth response
3. **Include it** in the Authorization header

## 📋 API Endpoints

### Public Endpoints (No Auth Required)

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "JobPortal API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### Get All Job Posts
```http
GET /api/posts
```

**Query Parameters:**
- `limit` (optional): Number of posts to return
- `offset` (optional): Number of posts to skip
- `location` (optional): Filter by location
- `employment_type` (optional): Filter by employment type
- `experience_level` (optional): Filter by experience level

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Senior Frontend Developer",
    "description": "Job description...",
    "location": "San Francisco, CA",
    "remote_ok": true,
    "employment_type": "full-time",
    "experience_level": "senior",
    "salary_min": 120000,
    "salary_max": 150000,
    "currency": "USD",
    "created_at": "2024-01-01T00:00:00.000Z",
    "companies": {
      "id": "uuid",
      "name": "TechCorp Inc.",
      "logo_url": "https://...",
      "location": "San Francisco, CA"
    }
  }
]
```

#### Get Single Job Post
```http
GET /api/posts/:id
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Senior Frontend Developer",
  "description": "Job description...",
  "requirements": "5+ years React experience...",
  "benefits": "Health insurance, 401k...",
  "salary_min": 120000,
  "salary_max": 150000,
  "currency": "USD",
  "location": "San Francisco, CA",
  "remote_ok": true,
  "employment_type": "full-time",
  "experience_level": "senior",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "companies": {
    "id": "uuid",
    "name": "TechCorp Inc.",
    "description": "Company description...",
    "website": "https://techcorp.com",
    "logo_url": "https://...",
    "location": "San Francisco, CA"
  }
}
```

### Authentication Endpoints

#### Get Current User
```http
GET /api/auth/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "job_seeker",
    "phone": "+1-555-0123"
  }
}
```

### Company Management (Admin Only)

#### Get All Companies
```http
GET /api/companies
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `approved`, `rejected`)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "TechCorp Inc.",
    "description": "Company description...",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "size": "500-1000",
    "location": "San Francisco, CA",
    "status": "approved",
    "admin_notes": "Approved after review",
    "created_at": "2024-01-01T00:00:00.000Z",
    "users": {
      "id": "uuid",
      "email": "company@techcorp.com",
      "first_name": "Company",
      "last_name": "Admin"
    }
  }
]
```

#### Approve/Reject Company
```http
PATCH /api/companies/:id/approve
```

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "approved",
  "admin_notes": "Approved after review"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "TechCorp Inc.",
  "status": "approved",
  "admin_notes": "Approved after review",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Job Post Management

#### Create Job Post
```http
POST /api/posts
```

**Headers:**
```
Authorization: Bearer <company-token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Senior Frontend Developer",
  "description": "Job description...",
  "requirements": "5+ years React experience...",
  "benefits": "Health insurance, 401k...",
  "salary_min": 120000,
  "salary_max": 150000,
  "currency": "USD",
  "location": "San Francisco, CA",
  "remote_ok": true,
  "employment_type": "full-time",
  "experience_level": "senior",
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Senior Frontend Developer",
  "description": "Job description...",
  "created_at": "2024-01-01T00:00:00.000Z",
  "companies": {
    "id": "uuid",
    "name": "TechCorp Inc.",
    "logo_url": "https://..."
  }
}
```

#### Get My Job Posts
```http
GET /api/my/posts
```

**Headers:**
```
Authorization: Bearer <company-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Senior Frontend Developer",
    "description": "Job description...",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "companies": {
      "id": "uuid",
      "name": "TechCorp Inc.",
      "logo_url": "https://..."
    }
  }
]
```

#### Update Job Post
```http
PATCH /api/posts/:id
```

**Headers:**
```
Authorization: Bearer <company-token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated Job Title",
  "description": "Updated description...",
  "is_active": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Updated Job Title",
  "description": "Updated description...",
  "is_active": false,
  "updated_at": "2024-01-01T00:00:00.000Z",
  "companies": {
    "id": "uuid",
    "name": "TechCorp Inc.",
    "logo_url": "https://..."
  }
}
```

### Application Management

#### Apply for Job
```http
POST /api/posts/:id/apply
```

**Headers:**
```
Authorization: Bearer <job-seeker-token>
Content-Type: application/json
```

**Body:**
```json
{
  "cover_letter": "I am interested in this position...",
  "cv_url": "https://storage.supabase.co/object/public/cvs/user-cv.pdf"
}
```

**Response:**
```json
{
  "id": "uuid",
  "post_id": "uuid",
  "applicant_id": "uuid",
  "cover_letter": "I am interested in this position...",
  "cv_url": "https://storage.supabase.co/object/public/cvs/user-cv.pdf",
  "status": "pending",
  "created_at": "2024-01-01T00:00:00.000Z",
  "posts": {
    "id": "uuid",
    "title": "Senior Frontend Developer",
    "companies": {
      "name": "TechCorp Inc."
    }
  }
}
```

#### Get My Applications
```http
GET /api/my/applications
```

**Headers:**
```
Authorization: Bearer <job-seeker-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "post_id": "uuid",
    "cover_letter": "I am interested...",
    "cv_url": "https://...",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z",
    "posts": {
      "id": "uuid",
      "title": "Senior Frontend Developer",
      "companies": {
        "name": "TechCorp Inc.",
        "logo_url": "https://..."
      }
    }
  }
]
```

#### Get Applications for Job Post
```http
GET /api/posts/:id/applications
```

**Headers:**
```
Authorization: Bearer <company-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "post_id": "uuid",
    "cover_letter": "I am interested...",
    "cv_url": "https://...",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z",
    "users": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123"
    }
  }
]
```

## 🔒 Role-Based Access Control

### User Roles

- **`admin`**: Full system access
- **`company`**: Can create/manage job posts for their company
- **`job_seeker`**: Can browse jobs and submit applications

### Permission Matrix

| Endpoint | Admin | Company | Job Seeker | Public |
|----------|-------|---------|------------|--------|
| `GET /api/health` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/posts` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/posts/:id` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | ❌ |
| `GET /api/companies` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /api/companies/:id/approve` | ✅ | ❌ | ❌ | ❌ |
| `POST /api/posts` | ✅ | ✅ | ❌ | ❌ |
| `GET /api/my/posts` | ✅ | ✅ | ❌ | ❌ |
| `PATCH /api/posts/:id` | ✅ | ✅* | ❌ | ❌ |
| `POST /api/posts/:id/apply` | ❌ | ❌ | ✅ | ❌ |
| `GET /api/my/applications` | ❌ | ❌ | ✅ | ❌ |
| `GET /api/posts/:id/applications` | ✅ | ✅* | ❌ | ❌ |

*Can only access their own posts/applications

## 🚨 Error Responses

### Authentication Errors

```json
{
  "error": "Access token required"
}
```

```json
{
  "error": "Invalid or expired token"
}
```

### Authorization Errors

```json
{
  "error": "Insufficient permissions",
  "required": ["admin"],
  "current": "job_seeker"
}
```

### Validation Errors

```json
{
  "error": "Validation failed",
  "details": {
    "title": "Title is required",
    "description": "Description is required"
  }
}
```

### Not Found Errors

```json
{
  "error": "Job post not found"
}
```

### Server Errors

```json
{
  "error": "Internal server error"
}
```

## 🔧 Environment Variables

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
```

## 📝 Example Usage

### Frontend Integration

```javascript
// Login and get token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

const token = data.session.access_token;

// Make authenticated request
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const userData = await response.json();
```

### cURL Examples

```bash
# Health check
curl http://localhost:3001/api/health

# Get job posts
curl http://localhost:3001/api/posts

# Get current user
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me

# Create job post
curl -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Job", "description": "Job description..."}'
```
