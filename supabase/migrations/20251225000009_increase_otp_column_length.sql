-- Increase the length of the otp column to store hashed values (SHA-256 produces 64 chars)
ALTER TABLE email_otp_store ALTER COLUMN otp TYPE TEXT;
