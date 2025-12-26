-- Cleanup all data except Demo User Shaik Roshan
-- Delete related data first to avoid foreign key constraint violations

-- Delete submissions for non-demo users
DELETE FROM submissions 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Delete audit_logs for non-demo users
DELETE FROM audit_logs 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Delete otp_logs for non-demo users
DELETE FROM otp_logs 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Delete name_mismatch_logs for non-demo users
DELETE FROM name_mismatch_logs 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Delete email_change_logs for non-demo users
DELETE FROM email_change_logs 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Delete support_tickets for non-demo users
DELETE FROM support_tickets 
WHERE volunteer_id IN (SELECT id FROM volunteers WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL);

-- Finally delete the volunteers
DELETE FROM volunteers 
WHERE email != 'roshanbunny2002@gmail.com' OR email IS NULL;
