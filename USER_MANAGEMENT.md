# User Management Guide

This guide explains how to create and manage different types of users in the JobPortal application.

## 🔐 User Roles

The system supports three user roles:

- **`admin`** - Full system access, can approve companies, manage all content
- **`company`** - Can create and manage job posts for their company
- **`job_seeker`** - Can browse jobs and submit applications

## 🚀 Quick Setup

### 1. Run the Seeder Script

First, set up your environment variables:

```bash
# Copy the example file
cp env.example .env

# Add your Supabase credentials to .env
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

Then run the seeder:

```bash
node supabase-seed.js
```

This will create:
- ✅ Admin user: `admin@jobportal.com`
- ✅ Company user: `company@techcorp.com`
- ✅ Job seeker: `candidate@example.com`

## 👥 Manual User Creation

### Creating Users via Supabase Dashboard

#### Step 1: Create Auth User
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"**
4. Fill in:
   - **Email**: User's email address
   - **Password**: Secure password
   - **Auto Confirm User**: ✅ Check this
   - **User Metadata**:
     ```json
     {
       "first_name": "John",
       "last_name": "Doe",
       "role": "job_seeker"
     }
     ```

#### Step 2: Create User Record
1. Go to **Table Editor** → **users**
2. Click **"Insert"** → **"Insert row"**
3. Fill in:
   - **id**: Copy the UUID from the auth user you just created
   - **email**: Same email as auth user
   - **first_name**: User's first name
   - **last_name**: User's last name
   - **role**: Choose from `admin`, `company`, or `job_seeker`
   - **phone**: Optional phone number
   - **password_hash**: Set to `managed_by_auth`

### Creating Users via SQL

#### Admin User
```sql
-- 1. Create auth user (use Supabase Dashboard for this)
-- 2. Insert user record
INSERT INTO users (id, email, first_name, last_name, role, phone, password_hash)
VALUES (
  'user-uuid-from-auth',
  'admin@yourcompany.com',
  'Admin',
  'User',
  'admin',
  '+1-555-0123',
  'managed_by_auth'
);
```

#### Company User
```sql
-- 1. Create auth user first
-- 2. Create company record
INSERT INTO companies (name, description, website, industry, size, location, status, created_by)
VALUES (
  'Your Company Name',
  'Company description',
  'https://yourcompany.com',
  'Technology',
  '50-100',
  'Your City, State',
  'pending', -- Will need admin approval
  'user-uuid-from-auth'
);

-- 3. Create user record
INSERT INTO users (id, email, first_name, last_name, role, phone, password_hash)
VALUES (
  'user-uuid-from-auth',
  'company@yourcompany.com',
  'Company',
  'Admin',
  'company',
  '+1-555-0124',
  'managed_by_auth'
);
```

#### Job Seeker User
```sql
-- 1. Create auth user first
-- 2. Insert user record
INSERT INTO users (id, email, first_name, last_name, role, phone, password_hash)
VALUES (
  'user-uuid-from-auth',
  'candidate@example.com',
  'John',
  'Doe',
  'job_seeker',
  '+1-555-0125',
  'managed_by_auth'
);
```

## 🏢 Company Approval Process

### For Admins: Approving Companies

1. Go to **Table Editor** → **companies**
2. Find companies with `status = 'pending'`
3. Update the status:
   ```sql
   UPDATE companies 
   SET status = 'approved', 
       admin_notes = 'Approved after review'
   WHERE id = 'company-uuid';
   ```

### For Companies: Checking Approval Status

Companies can check their approval status by querying:
```sql
SELECT name, status, admin_notes 
FROM companies 
WHERE created_by = 'your-user-uuid';
```

## 🔧 User Management Scripts

### Update User Role
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

### Deactivate User
```sql
-- Soft delete by updating email (recommended)
UPDATE users 
SET email = CONCAT('deleted_', email)
WHERE id = 'user-uuid';

-- Or hard delete (use with caution)
DELETE FROM users WHERE id = 'user-uuid';
```

### Reset User Password
Use the Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Find the user
3. Click **"..."** → **"Reset password"**

## 🛡️ Security Considerations

### RLS Policies
The database uses Row Level Security (RLS) policies that ensure:
- Users can only see their own data
- Companies can only manage their own posts
- Admins have full access
- Job seekers can only see active job posts

### Password Security
- Passwords are hashed by Supabase Auth
- Never store plain text passwords
- Use `managed_by_auth` in the password_hash field

### Role Verification
Always verify user roles in your application:
```javascript
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single();

if (user.role !== 'admin') {
  throw new Error('Unauthorized');
}
```

## 🚨 Troubleshooting

### Common Issues

1. **User can't log in**
   - Check if email is confirmed in Auth
   - Verify password is correct
   - Check if user record exists in users table

2. **Company can't create posts**
   - Verify company status is 'approved'
   - Check if user role is 'company'
   - Ensure company_id matches the user's company

3. **RLS blocking access**
   - Check if RLS policies are correctly set
   - Verify user authentication
   - Test with admin user first

### Debug Queries

```sql
-- Check user roles
SELECT email, role, created_at FROM users ORDER BY created_at;

-- Check company status
SELECT name, status, created_by FROM companies;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 📞 Support

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify your RLS policies
3. Test with the admin user first
4. Check the browser console for errors
