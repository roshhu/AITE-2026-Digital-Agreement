-- Seed Specific Volunteer: Shaik Roshan
INSERT INTO volunteers (full_name, mobile_number, email, district, status, auth_code)
VALUES 
  ('Shaik Roshan', '7075557578', 'roshanbunny2002@gmail.com', 'Nagarkurnool', 'pending', 'SHAIK123')
ON CONFLICT (mobile_number) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  district = EXCLUDED.district;
