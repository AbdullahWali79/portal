-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Create an index on company for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- Create an index on location for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read jobs
CREATE POLICY "Anyone can read jobs" ON jobs
  FOR SELECT USING (true);

-- Create a policy that allows anyone to insert jobs
CREATE POLICY "Anyone can insert jobs" ON jobs
  FOR INSERT WITH CHECK (true);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
