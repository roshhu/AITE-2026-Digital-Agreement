-- Add timestamp for email change requests
ALTER TABLE volunteers
ADD COLUMN IF NOT EXISTS email_requested_at TIMESTAMPTZ;
