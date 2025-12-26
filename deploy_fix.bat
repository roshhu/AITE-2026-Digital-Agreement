@echo off
echo ===================================================
echo   PROFESSIONAL FIX: 6-DIGIT OTP & ADMIN COUNT
echo ===================================================
echo.

echo 1. Staging Fixes...
call git add .

echo.
echo 2. Committing...
call git commit -m "Fix: Force 6-Digit OTP via Custom Edge Function & Fix Admin Panel Count"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ DEPLOYMENT STARTED
echo   
echo   IMPORTANT: You MUST add 'RESEND_API_KEY' to Supabase Secrets!
echo   Go to Dashboard -> Settings -> Edge Functions -> Secrets
echo   Add Name: RESEND_API_KEY
echo   Add Value: (Your Resend Key)
echo.
echo   If you used AWS SES credentials in Supabase, this script tries to use them via Supabase Auth as fallback.
echo   But to force 6-Digits, we need the Custom Function working.
echo ===================================================
pause
