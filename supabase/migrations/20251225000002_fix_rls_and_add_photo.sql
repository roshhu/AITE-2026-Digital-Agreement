-- Allow anonymous inserts for submissions (since we have custom auth logic on frontend)
DROP POLICY IF EXISTS "Allow authenticated manage submissions" ON submissions;
CREATE POLICY "Allow public insert submissions" ON submissions FOR INSERT TO public WITH CHECK (true);

-- Add photo_data column to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS photo_data TEXT;
