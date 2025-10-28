# Admin Time Limit Control Documentation

This document describes the Admin Time Limit Control feature for the JobPortal application, which allows administrators to set time limits on job posts and automatically hide them when they expire.

## 🎯 Overview

The Admin Time Limit Control system provides:
- **Time-based post expiration** with configurable day limits
- **Automatic post hiding** when expiry dates are reached
- **Manual post extension** by administrators
- **Cron job automation** for background processing

## 🏗️ Architecture

### Database Schema

```sql
-- Posts table with visible field
ALTER TABLE posts ADD COLUMN visible BOOLEAN DEFAULT TRUE;

-- Index for performance
CREATE INDEX idx_posts_visible ON posts(visible);
```

### Key Components

1. **Admin API Endpoints** - Create and manage posts with time limits
2. **Cron Job** - Automatically expire posts in the background
3. **RLS Policies** - Updated to respect the visible field
4. **Frontend Integration** - Display time-limited posts appropriately

## 🔧 API Endpoints

### 1. Create Post with Time Limit

```http
POST /api/admin/posts
```

**Request Body:**
```json
{
  "title": "Senior React Developer",
  "description": "We are looking for an experienced React developer...",
  "requirements": "5+ years React experience, TypeScript",
  "benefits": "Health insurance, 401k, flexible hours",
  "salary_min": 120000,
  "salary_max": 150000,
  "currency": "USD",
  "location": "San Francisco, CA",
  "employment_type": "full-time",
  "experience_level": "senior",
  "contact_email": "jobs@company.com",
  "contact_phone": "+1-555-0123",
  "image_url": "https://example.com/job-image.jpg",
  "company_id": "uuid",
  "daysLimit": 30
}
```

**Response:**
```json
{
  "message": "Job post created successfully with admin time limit control",
  "post": {
    "id": "uuid",
    "title": "Senior React Developer",
    "visible": true,
    "expires_at": "2024-02-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "companies": {
      "id": "uuid",
      "name": "TechCorp Inc.",
      "logo_url": "https://..."
    }
  },
  "time_limit": {
    "days_limit": 30,
    "expires_at": "2024-02-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Extend Post Expiry

```http
POST /api/admin/posts/:id/extend
```

**Request Body:**
```json
{
  "extraDays": 15
}
```

**Response:**
```json
{
  "message": "Post expiry extended by 15 days",
  "post": {
    "id": "uuid",
    "title": "Senior React Developer",
    "visible": true,
    "expires_at": "2024-02-16T00:00:00.000Z",
    "updated_at": "2024-01-15T00:00:00.000Z",
    "companies": {
      "id": "uuid",
      "name": "TechCorp Inc."
    }
  },
  "extension_details": {
    "previous_expiry": "2024-02-01T00:00:00.000Z",
    "new_expiry": "2024-02-16T00:00:00.000Z",
    "days_added": 15,
    "was_visible": true,
    "now_visible": true
  }
}
```

## 🤖 Cron Job System

### Automatic Post Expiration

The cron job automatically hides posts when their expiry date passes:

```javascript
// Runs every 6 hours
cron.schedule('0 */6 * * *', async () => {
  const result = await expirePosts();
  // Sets visible = false for expired posts
});
```

### Manual Execution

```bash
# Run the expiration job manually
npm run expire-posts

# Start the cron scheduler
npm run cron

# Start cron in development mode
npm run cron:dev
```

### Cron Job Features

- **Automatic Detection**: Finds posts where `expires_at < NOW()` and `visible = true`
- **Batch Processing**: Updates multiple posts efficiently
- **Logging**: Detailed logs of expired posts
- **Statistics**: Provides before/after counts
- **Error Handling**: Graceful error handling and reporting

## 📊 Database Operations

### Expire Posts Query

```sql
-- Find posts that should be expired
SELECT id, title, expires_at, visible, companies.name
FROM posts 
WHERE visible = true 
AND expires_at < NOW();

-- Update posts to hide them
UPDATE posts 
SET visible = false, updated_at = NOW()
WHERE visible = true 
AND expires_at < NOW();
```

### RLS Policy Updates

```sql
-- Updated policy to respect visible field
CREATE POLICY "Anyone can view visible active posts" ON posts
  FOR SELECT USING (
    visible = true AND 
    is_active = true AND 
    expires_at > NOW()
  );
```

## 🔍 Usage Examples

### 1. Create a 30-Day Job Post

```bash
curl -X POST http://localhost:3001/api/admin/posts \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Frontend Developer",
    "description": "Join our team...",
    "location": "Remote",
    "employment_type": "full-time",
    "experience_level": "mid",
    "company_id": "company-uuid",
    "daysLimit": 30
  }'
```

### 2. Extend Post by 15 Days

```bash
curl -X POST http://localhost:3001/api/admin/posts/post-uuid/extend \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"extraDays": 15}'
```

### 3. Check Post Status

```bash
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3001/api/admin/posts?status=active"
```

### 4. Run Expiration Job

```bash
# Manual execution
node backend/src/jobs/expirePosts.js

# Or using npm script
npm run expire-posts
```

## 🚀 Deployment

### 1. Database Migration

```bash
# Apply the visible field migration
psql -d your_database -f supabase/migrations/004_add_visible_field.sql
```

### 2. Install Dependencies

```bash
cd backend
npm install node-cron
```

### 3. Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Start Cron Jobs

```bash
# Production
npm run cron

# Development
npm run cron:dev
```

### 5. System Cron (Optional)

Add to your system crontab for more reliable scheduling:

```bash
# Edit crontab
crontab -e

# Add this line to run every 6 hours
0 */6 * * * cd /path/to/your/project && npm run expire-posts
```

## 📈 Monitoring

### Statistics Endpoint

```bash
# Get post statistics
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3001/api/admin/stats
```

**Response:**
```json
{
  "companies": {
    "pending": 5,
    "approved": 25,
    "total": 30
  },
  "posts": {
    "total": 150,
    "active": 120,
    "expired": 30
  },
  "applications": {
    "total": 500
  }
}
```

### Log Monitoring

The cron job provides detailed logging:

```
🕐 Starting post expiration job at 2024-01-15T10:00:00.000Z
📋 Found 3 posts to expire
   - "Senior Developer" (TechCorp Inc.) - Expired: 2024-01-14T23:59:59.000Z
   - "Frontend Engineer" (StartupXYZ) - Expired: 2024-01-15T08:30:00.000Z
   - "DevOps Specialist" (CloudTech) - Expired: 2024-01-15T09:15:00.000Z
✅ Successfully expired 3 posts in 150ms
```

## 🔧 Configuration

### Cron Schedule Options

```javascript
// Every 6 hours (default)
'0 */6 * * *'

// Every hour
'0 * * * *'

// Every 30 minutes
'*/30 * * * *'

// Daily at 2 AM
'0 2 * * *'

// Weekdays only at 9 AM
'0 9 * * 1-5'
```

### Validation Rules

- **daysLimit**: 1-365 days
- **extraDays**: 1-365 days
- **expiry_date**: Automatically calculated
- **visible**: Boolean (true/false)

## 🚨 Troubleshooting

### Common Issues

1. **Posts not expiring**
   - Check if cron job is running
   - Verify database connection
   - Check logs for errors

2. **Permission errors**
   - Ensure service role key is correct
   - Check RLS policies
   - Verify user permissions

3. **Performance issues**
   - Check database indexes
   - Monitor query execution time
   - Consider batch size limits

### Debug Commands

```bash
# Test expiration job manually
node backend/src/jobs/expirePosts.js

# Check cron job status
ps aux | grep cron

# View logs
tail -f /var/log/cron.log
```

## 📋 Best Practices

1. **Regular Monitoring**: Check cron job logs regularly
2. **Backup Before Changes**: Always backup before schema changes
3. **Test in Staging**: Test expiration logic in staging environment
4. **Set Reasonable Limits**: Use appropriate day limits (7-90 days)
5. **Monitor Performance**: Watch for slow queries and optimize
6. **Error Handling**: Implement proper error handling and alerts

This Admin Time Limit Control system provides a robust solution for managing job post lifecycles with automatic expiration and manual extension capabilities.
