-- Update volunteers table with new security fields
ALTER TABLE volunteers
ADD COLUMN IF NOT EXISTS otp_sent_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS otp_failed_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_otp_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_otp_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_lockout_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS new_email_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS new_email_value TEXT,
ADD COLUMN IF NOT EXISTS request_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_approval_status TEXT DEFAULT 'none' CHECK (admin_approval_status IN ('none', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS risk_score_value INT DEFAULT 0; -- Numeric score for calculation

-- Create OTP Log table for audit and daily limit tracking
CREATE TABLE IF NOT EXISTS otp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id),
    email TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    status TEXT -- 'sent', 'failed', 'verified'
);

-- Index for faster daily count queries
CREATE INDEX IF NOT EXISTS idx_otp_logs_email_date ON otp_logs (email, sent_at);
