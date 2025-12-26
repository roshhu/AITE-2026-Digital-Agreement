@echo off
echo ===================================================
echo   UPDATING LOGIN LOGIC
echo ===================================================
echo.

echo 1. Staging changes (Name Match Removal + Caption)...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Update: Relaxed Name Matching & Added Mobile Helper Text"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ UPDATES DEPLOYED
echo   Wait 2 mins for Vercel to update.
echo ===================================================
pause
