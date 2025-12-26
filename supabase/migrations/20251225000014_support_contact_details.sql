-- Add contact details to support_tickets to handle cases where volunteer is not found or mismatch
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_mobile TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;
