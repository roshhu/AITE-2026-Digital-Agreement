-- Add Gender column to Volunteers table
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS gender text;
