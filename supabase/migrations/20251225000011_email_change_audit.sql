-- Create audit log table for email change actions
CREATE TABLE IF NOT EXISTS email_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id),
    admin_user TEXT DEFAULT 'admin', -- In real app this would be UUID of admin
    old_email TEXT,
    new_email TEXT,
    decision TEXT CHECK (decision IN ('approved', 'rejected')),
    decision_at TIMESTAMPTZ DEFAULT NOW(),
    reason_provided TEXT
);

-- Ensure index on email for fast uniqueness check
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers (email);
