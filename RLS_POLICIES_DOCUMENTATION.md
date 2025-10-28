# Row Level Security (RLS) Policies Documentation

This document provides a comprehensive overview of the RLS policies implemented for the JobPortal database.

## 🔒 Overview

Row Level Security (RLS) ensures that users can only access data they're authorized to see. Our policies are designed around three main user roles:

- **`admin`** - Full system access
- **`company`** - Can manage their own company and job posts
- **`job_seeker`** - Can browse jobs and submit applications

## 📋 Policy Summary

### Users Table Policies

| Policy | Type | Condition | Description |
|--------|------|-----------|-------------|
| `Users can view their own profile` | SELECT | `auth.uid() = id` | Users can only see their own profile |
| `Users can update their own profile` | UPDATE | `auth.uid() = id` | Users can only update their own profile |
| `Admins can view all users` | SELECT | `role = 'admin'` | Admins can see all users |
| `Admins can update all users` | UPDATE | `role = 'admin'` | Admins can update any user |
| `Allow user creation` | INSERT | `auth.uid() = id` | Users can create their own record |
| `Prevent role changes` | UPDATE | `role = OLD.role OR admin` | Only admins can change roles |

### Companies Table Policies

| Policy | Type | Condition | Description |
|--------|------|-----------|-------------|
| `Anyone can view approved companies` | SELECT | `status = 'approved'` | Public can see approved companies |
| `Company owners can view their own company` | SELECT | `created_by = auth.uid()` | Owners can see their company even if pending |
| `Admins can view all companies` | SELECT | `role = 'admin'` | Admins can see all companies |
| `Authenticated users can create company requests` | INSERT | `auth.uid() IS NOT NULL AND status = 'pending'` | Anyone can create company requests |
| `Company owners can update their own company` | UPDATE | `created_by = auth.uid()` | Owners can update their company |
| `Admins can update all companies` | UPDATE | `role = 'admin'` | Admins can update any company |
| `Admins can delete companies` | DELETE | `role = 'admin'` | Only admins can delete companies |
| `Prevent status changes` | UPDATE | `status = OLD.status OR admin` | Only admins can change company status |

### Posts Table Policies

| Policy | Type | Condition | Description |
|--------|------|-----------|-------------|
| `Anyone can view active posts` | SELECT | `is_active = true AND expires_at > NOW()` | Public can see active, non-expired posts |
| `Company owners can view their own posts` | SELECT | `created_by = auth.uid()` | Owners can see all their posts |
| `Admins can view all posts` | SELECT | `role = 'admin'` | Admins can see all posts |
| `Approved companies can create posts` | INSERT | `company.status = 'approved'` | Only approved companies can create posts |
| `Admins can create posts` | INSERT | `role = 'admin'` | Admins can create posts for any company |
| `Company owners can update their own posts` | UPDATE | `created_by = auth.uid()` | Owners can update their posts |
| `Admins can update all posts` | UPDATE | `role = 'admin'` | Admins can update any post |
| `Company owners can delete their own posts` | DELETE | `created_by = auth.uid()` | Owners can delete their posts |
| `Admins can delete all posts` | DELETE | `role = 'admin'` | Admins can delete any post |

### Applications Table Policies

| Policy | Type | Condition | Description |
|--------|------|-----------|-------------|
| `Job seekers can view their own applications` | SELECT | `applicant_id = auth.uid()` | Job seekers can see their applications |
| `Company owners can view applications for their posts` | SELECT | `post.created_by = auth.uid()` | Companies can see applications for their posts |
| `Admins can view all applications` | SELECT | `role = 'admin'` | Admins can see all applications |
| `Job seekers can create applications` | INSERT | `applicant_id = auth.uid() AND post is active` | Job seekers can apply to active posts |
| `Company owners can update applications for their posts` | UPDATE | `post.created_by = auth.uid()` | Companies can update applications for their posts |
| `Admins can update all applications` | UPDATE | `role = 'admin'` | Admins can update any application |
| `Company owners can delete applications for their posts` | DELETE | `post.created_by = auth.uid()` | Companies can delete applications for their posts |
| `Admins can delete all applications` | DELETE | `role = 'admin'` | Admins can delete any application |
| `Prevent duplicate applications` | INSERT | `NOT EXISTS (duplicate)` | Prevents duplicate applications |

## 🔧 Helper Functions

### Security Functions

```sql
-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns a company
CREATE OR REPLACE FUNCTION is_company_owner(company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN companies c ON c.created_by = u.id
    WHERE u.id = auth.uid() 
    AND u.role = 'company'
    AND c.id = company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns a post
CREATE OR REPLACE FUNCTION owns_post(post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM posts 
    WHERE id = post_id 
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if post is active and not expired
CREATE OR REPLACE FUNCTION is_post_active(post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM posts 
    WHERE id = post_id 
    AND is_active = true 
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🧪 Testing RLS Policies

### Test Function

```sql
-- View all RLS policies
SELECT * FROM test_rls_policies();
```

### Manual Testing Examples

#### 1. Test Company Access

```sql
-- As a company user, try to view all companies
-- Should only see approved companies + their own
SELECT id, name, status FROM companies;

-- As a company user, try to update another company
-- Should fail
UPDATE companies SET name = 'Hacked' WHERE id != (
  SELECT id FROM companies WHERE created_by = auth.uid() LIMIT 1
);
```

#### 2. Test Post Access

```sql
-- As a job seeker, try to view posts
-- Should only see active, non-expired posts
SELECT id, title, is_active, expires_at FROM posts;

-- As a company user, try to create a post
-- Should only work if company is approved
INSERT INTO posts (title, description, company_id, ...) 
VALUES ('Test Post', 'Description', 'company-uuid', ...);
```

#### 3. Test Application Access

```sql
-- As a job seeker, try to view applications
-- Should only see their own applications
SELECT id, post_id, applicant_id FROM applications;

-- As a company user, try to view applications
-- Should only see applications for their posts
SELECT a.id, p.title, a.applicant_id 
FROM applications a
JOIN posts p ON p.id = a.post_id;
```

## 🚨 Security Considerations

### 1. Authentication Required

All policies assume the user is authenticated (`auth.uid()` is not null). Unauthenticated users can only:
- View approved companies
- View active, non-expired posts

### 2. Role-Based Access

- **Admins**: Full access to all data
- **Companies**: Access to their own data and applications for their posts
- **Job Seekers**: Access to their own applications and public job data

### 3. Data Integrity

- Users cannot change their own role (only admins can)
- Companies cannot change their own approval status
- Duplicate applications are prevented
- Expired posts are automatically filtered out

### 4. Performance Optimization

Indexes are created on frequently queried columns:
- `users(role)`
- `companies(status, created_by)`
- `posts(is_active, expires_at, created_by)`
- `applications(applicant_id, post_id)`

## 🔍 Debugging RLS Issues

### Common Issues and Solutions

#### 1. "Permission denied" errors

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check if user is authenticated
SELECT auth.uid();

-- Check user role
SELECT role FROM users WHERE id = auth.uid();
```

#### 2. Policies not working as expected

```sql
-- List all policies for a table
SELECT policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'posts';

-- Test a specific policy
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM posts WHERE id = 'some-uuid';
```

#### 3. Performance issues

```sql
-- Check if indexes are being used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM posts WHERE is_active = true;

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;
```

## 📊 Policy Testing Checklist

- [ ] Unauthenticated users can only see public data
- [ ] Users can only see their own profile
- [ ] Companies can only see their own company data
- [ ] Job seekers can only see their own applications
- [ ] Admins can see all data
- [ ] Companies cannot change their approval status
- [ ] Users cannot change their own role
- [ ] Duplicate applications are prevented
- [ ] Expired posts are filtered out
- [ ] File access is properly restricted

## 🚀 Deployment Notes

1. **Apply policies in order**: Run the migration file in sequence
2. **Test thoroughly**: Use the test functions to verify policies
3. **Monitor performance**: Check query execution plans
4. **Backup first**: Always backup before applying RLS policies
5. **Gradual rollout**: Consider enabling RLS on one table at a time

This comprehensive RLS setup ensures data security while maintaining good performance and usability for all user types.
