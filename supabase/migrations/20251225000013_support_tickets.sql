-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id),
    category TEXT NOT NULL CHECK (category IN (
        'Email not receiving OTP',
        'Name mismatch in records',
        'Auth Code not working',
        'District allocation incorrect',
        'Agreement page issue',
        'General technical support'
    )),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
    assigned_officer TEXT,
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    is_escalated BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_volunteer_id ON support_tickets (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
