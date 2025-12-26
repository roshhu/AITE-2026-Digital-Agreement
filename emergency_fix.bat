@echo off
echo ===================================================
echo   EMERGENCY FIX: RESTORING MISSING VARIABLES
echo ===================================================
echo.

echo 1. Staging Fix (stats, charts, pdf)...
call git add .

echo.
echo 2. Committing...
call git commit -m "Critical Fix: Restored missing 'stats' and helper functions caused by refactor"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ FIXED.
echo   Wait 2 mins.
echo   Refresh Admin Panel.
echo   Pagination + Charts + Stats should all work now.
echo ===================================================
pause
