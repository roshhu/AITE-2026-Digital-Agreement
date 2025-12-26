@echo off
echo ===================================================
echo   FIXING DB COLUMN NAME ERROR
echo ===================================================
echo.

echo 1. Staging Fixes...
call git add .

echo.
echo 2. Committing...
call git commit -m "Fix: Corrected 'otp_hash' to 'otp' column name in Auth Service"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ FIX DEPLOYED
echo   Wait 2 mins for Vercel.
echo ===================================================
pause
