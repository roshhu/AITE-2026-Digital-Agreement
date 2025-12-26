@echo off
echo ===================================================
echo   UPDATING PLACEHOLDER TEXT
echo ===================================================
echo.

echo 1. Staging Change...
call git add .

echo.
echo 2. Committing...
call git commit -m "UI Update: Changed mobile placeholder to 0123456789"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ UPDATED.
echo   Wait 2 mins.
echo   Check volunteers.tgaite2026.site
echo ===================================================
pause
