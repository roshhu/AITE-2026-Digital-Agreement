-- Remove all existing records to start fresh
TRUNCATE TABLE submissions, email_otp_store, volunteers RESTART IDENTITY CASCADE;

-- Re-insert ONLY the main demo user for testing
INSERT INTO volunteers (full_name, mobile_number, email, district, status, auth_code)
VALUES 
  ('Demo Volunteer', '8555007177', 'demo@example.com', 'Hyderabad', 'pending', 'DEMO123');
