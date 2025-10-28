-- RLS Policy Testing Script
-- Run this script to test Row Level Security policies

-- =============================================
-- SETUP TEST USERS
-- =============================================

-- Note: These are example UUIDs - replace with actual user IDs from your auth system
-- You'll need to create these users through Supabase Auth first

-- Test admin user (replace with actual admin user ID)
-- SET @admin_user_id = '00000000-0000-0000-0000-000000000001';

-- Test company user (replace with actual company user ID)  
-- SET @company_user_id = '00000000-0000-0000-0000-000000000002';

-- Test job seeker user (replace with actual job seeker user ID)
-- SET @job_seeker_user_id = '00000000-0000-0000-0000-000000000003';

-- =============================================
-- TEST 1: COMPANY POLICIES
-- =============================================

-- Test: Anyone can view approved companies
SELECT 'Test 1: View approved companies' as test_name;
SELECT id, name, status FROM companies WHERE status = 'approved' LIMIT 5;

-- Test: Company owners can view their own company (even if pending)
SELECT 'Test 2: Company owners view own company' as test_name;
-- This will only work if you're logged in as a company user
SELECT id, name, status FROM companies WHERE created_by = auth.uid();

-- Test: Admins can view all companies
SELECT 'Test 3: Admins view all companies' as test_name;
-- This will only work if you're logged in as an admin
SELECT id, name, status FROM companies;

-- =============================================
-- TEST 2: POST POLICIES
-- =============================================

-- Test: Anyone can view active, non-expired posts
SELECT 'Test 4: View active posts' as test_name;
SELECT id, title, is_active, expires_at 
FROM posts 
WHERE is_active = true AND expires_at > NOW() 
LIMIT 5;

-- Test: Company owners can view their own posts
SELECT 'Test 5: Company owners view own posts' as test_name;
-- This will only work if you're logged in as a company user
SELECT id, title, is_active, expires_at 
FROM posts 
WHERE created_by = auth.uid();

-- Test: Admins can view all posts
SELECT 'Test 6: Admins view all posts' as test_name;
-- This will only work if you're logged in as an admin
SELECT id, title, is_active, expires_at FROM posts LIMIT 5;

-- =============================================
-- TEST 3: APPLICATION POLICIES
-- =============================================

-- Test: Job seekers can view their own applications
SELECT 'Test 7: Job seekers view own applications' as test_name;
-- This will only work if you're logged in as a job seeker
SELECT id, post_id, status, created_at 
FROM applications 
WHERE applicant_id = auth.uid();

-- Test: Company owners can view applications for their posts
SELECT 'Test 8: Companies view applications for their posts' as test_name;
-- This will only work if you're logged in as a company user
SELECT a.id, p.title, a.applicant_id, a.status
FROM applications a
JOIN posts p ON p.id = a.post_id
WHERE p.created_by = auth.uid();

-- =============================================
-- TEST 4: SECURITY CONSTRAINTS
-- =============================================

-- Test: Users cannot change their own role
SELECT 'Test 9: Prevent role changes' as test_name;
-- This should fail if you're not an admin
-- UPDATE users SET role = 'admin' WHERE id = auth.uid();

-- Test: Companies cannot change their own status
SELECT 'Test 10: Prevent status changes' as test_name;
-- This should fail if you're not an admin
-- UPDATE companies SET status = 'approved' WHERE created_by = auth.uid();

-- =============================================
-- TEST 5: HELPER FUNCTIONS
-- =============================================

-- Test helper functions
SELECT 'Test 11: Helper functions' as test_name;
SELECT 
  is_admin() as is_admin,
  auth.uid() as current_user_id,
  (SELECT role FROM users WHERE id = auth.uid()) as current_role;

-- =============================================
-- TEST 6: POLICY VERIFICATION
-- =============================================

-- List all RLS policies
SELECT 'Test 12: List all policies' as test_name;
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if RLS is enabled on all tables
SELECT 'Test 13: RLS status' as test_name;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================
-- TEST 7: PERFORMANCE CHECKS
-- =============================================

-- Check if indexes are being used
SELECT 'Test 14: Index usage' as test_name;
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM posts 
WHERE is_active = true AND expires_at > NOW() 
LIMIT 10;

-- =============================================
-- TEST 8: EDGE CASES
-- =============================================

-- Test: Expired posts should not be visible to public
SELECT 'Test 15: Expired posts not visible' as test_name;
SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_posts,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_posts
FROM posts;

-- Test: Duplicate application prevention
SELECT 'Test 16: Duplicate applications check' as test_name;
SELECT 
  post_id,
  applicant_id,
  COUNT(*) as application_count
FROM applications 
GROUP BY post_id, applicant_id 
HAVING COUNT(*) > 1;

-- =============================================
-- SUMMARY
-- =============================================

SELECT 'RLS Testing Complete' as status;

-- Display current user context
SELECT 
  'Current User Context' as info,
  auth.uid() as user_id,
  (SELECT role FROM users WHERE id = auth.uid()) as user_role,
  (SELECT email FROM users WHERE id = auth.uid()) as user_email;
