@echo off
echo ===================================================
echo   FINAL UPDATE: SUPPORTING 8-DIGIT OTP
echo ===================================================
echo.

echo 1. Staging UI Updates (8-Digit Input)...
call git add .

echo.
echo 2. Committing...
call git commit -m "UI Update: Volunteer Portal now accepts 8-digit OTPs"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ UPDATE DEPLOYED
echo   Wait 2 mins for Vercel.
echo   Then check https://volunteers.tgaite2026.site
echo ===================================================
pause
