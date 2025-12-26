-- Update the check constraint to allow 'blocked' status
ALTER TABLE volunteers DROP CONSTRAINT IF EXISTS volunteers_status_check;

ALTER TABLE volunteers
ADD CONSTRAINT volunteers_status_check 
CHECK (status IN ('pending', 'completed', 'blocked'));
