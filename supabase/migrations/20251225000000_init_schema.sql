-- create table
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    auth_code VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'fraud_suspect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes
CREATE INDEX idx_volunteers_mobile ON volunteers(mobile_number);
CREATE INDEX idx_volunteers_auth_code ON volunteers(auth_code);
CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_district ON volunteers(district);

-- create table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    signature_url TEXT NOT NULL,
    agreement_text TEXT NOT NULL,
    ip_address INET NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    fraud_flag BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes
CREATE INDEX idx_submissions_volunteer_id ON submissions(volunteer_id);
CREATE INDEX idx_submissions_fraud_flag ON submissions(fraud_flag);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- create table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes
CREATE INDEX idx_audit_volunteer_id ON audit_logs(volunteer_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant basic read access to anon role
GRANT SELECT ON volunteers TO anon;
GRANT SELECT ON submissions TO anon;

-- Grant full access to authenticated role
GRANT ALL PRIVILEGES ON volunteers TO authenticated;
GRANT ALL PRIVILEGES ON submissions TO authenticated;
GRANT ALL PRIVILEGES ON audit_logs TO authenticated;

-- RLS Policies for volunteers table
CREATE POLICY "Allow anon read volunteers" ON volunteers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access" ON volunteers FOR ALL TO authenticated USING (true);

-- RLS Policies for submissions table
CREATE POLICY "Allow anon read submissions" ON submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated manage submissions" ON submissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anon insert submissions" ON submissions FOR INSERT TO anon WITH CHECK (true);

-- RLS Policies for audit_logs table
CREATE POLICY "Allow anon insert audit_logs" ON audit_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access audit_logs" ON audit_logs FOR ALL TO authenticated USING (true);


-- Sample district codes and volunteer data
INSERT INTO volunteers (mobile_number, full_name, district, auth_code) VALUES
('8686196814', 'Sample Volunteer 1', 'Amrabad Tiger Reserve', '6814-ATR'),
('9123456789', 'Sample Volunteer 2', 'Kawal Tiger Reserve', '6789-KTR'),
('9876543210', 'Sample Volunteer 3', 'Hyderabad', '3210-HYD');
