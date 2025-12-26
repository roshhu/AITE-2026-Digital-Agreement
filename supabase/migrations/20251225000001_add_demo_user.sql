INSERT INTO volunteers (mobile_number, full_name, district, auth_code, status)
VALUES ('8555007177', 'Demo User', 'Hyderabad', '7177-HYD', 'pending')
ON CONFLICT (mobile_number) DO NOTHING;
