-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'company', 'job_seeker');
CREATE TYPE application_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');
CREATE TYPE company_status AS ENUM ('pending', 'approved', 'rejected');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'job_seeker',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  status company_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table (job postings)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'USD',
  location TEXT NOT NULL,
  remote_ok BOOLEAN DEFAULT FALSE,
  employment_type TEXT NOT NULL, -- full-time, part-time, contract, internship
  experience_level TEXT NOT NULL, -- entry, mid, senior, executive
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  cv_url TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, applicant_id) -- Prevent duplicate applications
);

-- Create Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('cvs', 'cvs', false),
  ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_company_id ON posts(company_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_is_active ON posts(is_active);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location);
CREATE INDEX IF NOT EXISTS idx_posts_employment_type ON posts(employment_type);
CREATE INDEX IF NOT EXISTS idx_posts_experience_level ON posts(experience_level);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_post_id ON applications(post_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_posts_title_search ON posts USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_posts_description_search ON posts USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_companies_name_search ON companies USING gin(to_tsvector('english', name));

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for companies table
CREATE POLICY "Anyone can view approved companies" ON companies
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Company owners can view their own company" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

CREATE POLICY "Company owners can update their own company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

CREATE POLICY "Admins can view all companies" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all companies" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can approve companies" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for posts table
CREATE POLICY "Anyone can view active posts" ON posts
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Company owners can view their own posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

CREATE POLICY "Company owners can create posts for their company" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    ) AND
    EXISTS (
      SELECT 1 FROM companies 
      WHERE id = company_id AND created_by = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Company owners can update their own posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'company' AND id = created_by
    )
  );

CREATE POLICY "Admins can view all posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all posts" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for applications table
CREATE POLICY "Applicants can view their own applications" ON applications
  FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Applicants can create applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Company owners can view applications for their posts" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = post_id AND u.id = auth.uid() AND u.role = 'company'
    )
  );

CREATE POLICY "Company owners can update applications for their posts" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = post_id AND u.id = auth.uid() AND u.role = 'company'
    )
  );

CREATE POLICY "Admins can view all applications" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all applications" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage policies for CVs bucket
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
      WHERE a.cv_url = name AND u.id = auth.uid() AND u.role = 'company'
    )
  );

-- Storage policies for post-images bucket
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

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@jobportal.com',
    '$2a$10$rQZ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K', -- password: admin123
    'Admin',
    'User',
    'admin'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample company
INSERT INTO companies (id, name, description, website, industry, size, location, status, created_by) VALUES 
  (
    '00000000-0000-0000-0000-000000000002',
    'TechCorp Inc.',
    'Leading technology company specializing in innovative solutions',
    'https://techcorp.com',
    'Technology',
    '500-1000',
    'San Francisco, CA',
    'approved',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample job seeker
INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES 
  (
    '00000000-0000-0000-0000-000000000003',
    'jobseeker@example.com',
    '$2a$10$rQZ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K', -- password: user123
    'John',
    'Doe',
    'job_seeker'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample posts
INSERT INTO posts (id, title, description, requirements, benefits, salary_min, salary_max, location, remote_ok, employment_type, experience_level, company_id, created_by) VALUES 
  (
    '00000000-0000-0000-0000-000000000004',
    'Senior Frontend Developer',
    'We are looking for an experienced frontend developer to join our team. You will be responsible for building user interfaces using React, TypeScript, and modern web technologies.',
    '5+ years of React experience, TypeScript, CSS/SCSS, Git, REST APIs',
    'Health insurance, 401k, flexible hours, remote work options',
    120000,
    150000,
    'San Francisco, CA',
    true,
    'full-time',
    'senior',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Full Stack Engineer',
    'Join our fast-growing startup as a full-stack engineer. You will work on both frontend and backend development, using technologies like Node.js, React, and PostgreSQL.',
    '3+ years full-stack experience, Node.js, React, PostgreSQL, AWS',
    'Equity, health insurance, unlimited PTO, learning budget',
    90000,
    120000,
    'Remote',
    true,
    'full-time',
    'mid',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;
