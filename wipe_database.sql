-- =========================================================
-- ⚠️ DANGER: WIPE DATABASE SCRIPT
-- This will delete ALL data from the volunteer system.
-- =========================================================

BEGIN;

-- 1. Clear Dependent Logs
TRUNCATE TABLE otp_logs CASCADE;
TRUNCATE TABLE email_otp_store CASCADE;
TRUNCATE TABLE name_mismatch_logs CASCADE;
TRUNCATE TABLE submissions CASCADE;
TRUNCATE TABLE support_tickets CASCADE;

-- 2. Clear Main Volunteer Table
TRUNCATE TABLE volunteers CASCADE;

COMMIT;

-- =========================================================
-- RESULT: Database is now empty and ready for fresh testing.
-- =========================================================
