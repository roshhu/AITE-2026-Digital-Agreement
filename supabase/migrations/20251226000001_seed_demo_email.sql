INSERT INTO volunteers (mobile_number, full_name, email, district, status, auth_code)
VALUES ('8555007177', 'Demo Volunteer', 'demo@example.com', 'Adilabad', 'pending', '7177-ADB')
ON CONFLICT (mobile_number) 
DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  district = EXCLUDED.district;
