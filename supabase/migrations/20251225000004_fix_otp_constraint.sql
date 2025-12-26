-- Fix missing unique constraint for email_otp_store
ALTER TABLE email_otp_store
ADD CONSTRAINT email_otp_store_email_key UNIQUE (email);
