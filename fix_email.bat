@echo off
echo ===================================================
echo   FIXING EMAIL OTP (AWS SES INTEGRATION)
echo ===================================================
echo.

echo 1. Staging auth service changes...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Switch to Supabase Native Auth for AWS SES OTP"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   DONE! Email OTP will now work via AWS SES.
echo   Wait for Vercel to redeploy (Green Checkmark).
echo ===================================================
pause
