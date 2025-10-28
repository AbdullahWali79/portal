-- Row Level Security (RLS) Policies for JobPortal
-- This file contains comprehensive RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow user creation (handled by auth signup)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- COMPANIES TABLE POLICIES
-- =============================================

-- Anyone can view approved companies
CREATE POLICY "Anyone can view approved companies" ON companies
  FOR SELECT USING (status = 'approved');

-- Company owners can view their own company (even if not approved)
CREATE POLICY "Company owners can view their own company" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

-- Admins can view all companies
CREATE POLICY "Admins can view all companies" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create company requests
CREATE POLICY "Authenticated users can create company requests" ON companies
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    status = 'pending'
  );

-- Company owners can update their own company (limited fields)
CREATE POLICY "Company owners can update their own company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  ) WITH CHECK (
    -- Prevent changing status unless admin
    status = OLD.status OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all companies
CREATE POLICY "Admins can update all companies" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete companies
CREATE POLICY "Admins can delete companies" ON companies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- POSTS TABLE POLICIES
-- =============================================

-- Anyone can view active, non-expired posts
CREATE POLICY "Anyone can view active posts" ON posts
  FOR SELECT USING (
    is_active = true AND 
    expires_at > NOW()
  );

-- Company owners can view their own posts (even if inactive/expired)
CREATE POLICY "Company owners can view their own posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

-- Admins can view all posts
CREATE POLICY "Admins can view all posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company users can create posts for their approved company
CREATE POLICY "Approved companies can create posts" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN companies c ON c.created_by = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'company'
      AND c.id = company_id
      AND c.status = 'approved'
    )
  );

-- Admins can create posts for any company
CREATE POLICY "Admins can create posts" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company owners can update their own posts
CREATE POLICY "Company owners can update their own posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

-- Admins can update all posts
CREATE POLICY "Admins can update all posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company owners can delete their own posts
CREATE POLICY "Company owners can delete their own posts" ON posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

-- Admins can delete all posts
CREATE POLICY "Admins can delete all posts" ON posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- APPLICATIONS TABLE POLICIES
-- =============================================

-- Job seekers can view their own applications
CREATE POLICY "Job seekers can view their own applications" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'job_seeker' AND id = applicant_id
    )
  );

-- Company owners can view applications for their posts
CREATE POLICY "Company owners can view applications for their posts" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = post_id 
      AND u.id = auth.uid() 
      AND u.role = 'company'
    )
  );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Job seekers can create applications
CREATE POLICY "Job seekers can create applications" ON applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'job_seeker' AND id = applicant_id
    ) AND
    -- Ensure the post is active and not expired
    EXISTS (
      SELECT 1 FROM posts 
      WHERE id = post_id 
      AND is_active = true 
      AND expires_at > NOW()
    )
  );

-- Company owners can update applications for their posts
CREATE POLICY "Company owners can update applications for their posts" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = post_id 
      AND u.id = auth.uid() 
      AND u.role = 'company'
    )
  );

-- Admins can update all applications
CREATE POLICY "Admins can update all applications" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Company owners can delete applications for their posts
CREATE POLICY "Company owners can delete applications for their posts" ON applications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = post_id 
      AND u.id = auth.uid() 
      AND u.role = 'company'
    )
  );

-- Admins can delete all applications
CREATE POLICY "Admins can delete all applications" ON applications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- STORAGE BUCKET POLICIES
-- =============================================

-- CVs bucket policies
CREATE POLICY "Users can upload their own CVs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own CVs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Company owners can view CVs from applications" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN posts p ON p.id = a.post_id
      JOIN users u ON u.id = p.created_by
      WHERE a.cv_url LIKE '%' || name || '%'
      AND u.id = auth.uid() 
      AND u.role = 'company'
    )
  );

-- Post images bucket policies
CREATE POLICY "Anyone can view post images" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Company owners can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company'
    )
  );

CREATE POLICY "Company owners can update their post images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company'
    )
  );

CREATE POLICY "Company owners can delete their post images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company'
    )
  );

-- =============================================
-- ADDITIONAL SECURITY POLICIES
-- =============================================

-- Prevent users from changing their own role
CREATE POLICY "Prevent role changes" ON users
  FOR UPDATE WITH CHECK (
    role = OLD.role OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prevent companies from changing their own status
CREATE POLICY "Prevent status changes" ON companies
  FOR UPDATE WITH CHECK (
    status = OLD.status OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prevent duplicate applications
CREATE POLICY "Prevent duplicate applications" ON applications
  FOR INSERT WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM applications 
      WHERE post_id = NEW.post_id 
      AND applicant_id = NEW.applicant_id
    )
  );

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is company owner
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

-- Function to check if user owns post
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

-- Function to check if post is active and not expired
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

-- =============================================
-- INDEXES FOR RLS PERFORMANCE
-- =============================================

-- Indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_is_active_expires ON posts(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_post_id ON applications(post_id);

-- =============================================
-- TESTING POLICIES
-- =============================================

-- Create a test function to verify RLS policies
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  policy_type TEXT,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::TEXT as table_name,
    policyname::TEXT as policy_name,
    cmd::TEXT as policy_type,
    permissive as is_enabled
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_rls_policies() TO authenticated;
