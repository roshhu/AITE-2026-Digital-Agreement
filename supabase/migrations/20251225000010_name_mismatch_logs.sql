-- Create table for logging name mismatches
CREATE TABLE IF NOT EXISTS name_mismatch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id),
    email TEXT,
    entered_name TEXT,
    stored_name TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT DEFAULT 'Name mismatch'
);

-- Ensure we have the necessary columns in volunteers if not already present (relying on attempts_count from previous setup)
-- We might want to separate name mismatch counts if we want to distinguish from generic login attempts, 
-- but usually 'attempts_count' on the volunteer record serves as the "failed login attempts" counter.
-- We'll use attempts_count for this as per existing pattern.
