-- Seed Demo User 2
INSERT INTO volunteers (full_name, mobile_number, email, district, status, auth_code)
VALUES 
  ('Demo User Two', '9876543210', 'demo2@example.com', 'Warangal', 'pending', 'DEMO456')
ON CONFLICT (mobile_number) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  district = EXCLUDED.district;
