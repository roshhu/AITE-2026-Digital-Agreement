-- Add new columns to volunteers table
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS fraud_score VARCHAR(20) DEFAULT 'Low' CHECK (fraud_score IN ('Low', 'Medium', 'High'));
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS attempts_count INT DEFAULT 0;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Ensure mobile number and email are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);

-- Create email_otp_store table
CREATE TABLE IF NOT EXISTS email_otp_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts_count INT DEFAULT 0,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast OTP lookup
CREATE INDEX IF NOT EXISTS idx_email_otp_email ON email_otp_store(email);

-- Enable RLS for otp store
ALTER TABLE email_otp_store ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert/select OTPs (controlled by app logic)
CREATE POLICY "Allow anon access otp" ON email_otp_store FOR ALL TO anon USING (true);

-- Update RLS for volunteers to allow updates to attempts/fraud score
DROP POLICY IF EXISTS "Allow anon read volunteers" ON volunteers;
CREATE POLICY "Allow anon read volunteers" ON volunteers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update volunteers" ON volunteers FOR UPDATE TO anon USING (true);

-- Update sample data with emails (using dummy emails for demo)
UPDATE volunteers SET email = 'volunteer1@example.com' WHERE mobile_number = '8686196814';
UPDATE volunteers SET email = 'volunteer2@example.com' WHERE mobile_number = '9123456789';
UPDATE volunteers SET email = 'volunteer3@example.com' WHERE mobile_number = '9876543210';
UPDATE volunteers SET email = 'demo@example.com' WHERE mobile_number = '8555007177';
