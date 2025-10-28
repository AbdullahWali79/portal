-- Add visible field to posts table for admin time limit control
-- This field will be used to hide posts when they expire

-- Add visible column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- Create index for better performance on visible queries
CREATE INDEX IF NOT EXISTS idx_posts_visible ON posts(visible);

-- Update existing posts to be visible by default
UPDATE posts SET visible = TRUE WHERE visible IS NULL;

-- Add constraint to ensure visible is not null
ALTER TABLE posts ALTER COLUMN visible SET NOT NULL;

-- Update RLS policies to include visible field
-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Anyone can view active posts" ON posts;
DROP POLICY IF EXISTS "Company owners can view their own posts" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;

-- Recreate policies with visible field consideration
CREATE POLICY "Anyone can view visible active posts" ON posts
  FOR SELECT USING (
    visible = true AND 
    is_active = true AND 
    expires_at > NOW()
  );

CREATE POLICY "Company owners can view their own posts" ON posts
  FOR SELECT USING (
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

-- Add policy for admins to update visible field
CREATE POLICY "Admins can update visible field" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
