@echo off
echo ===================================================
echo   🚀 INITIATING PRODUCTION DEPLOYMENT
echo ===================================================
echo.

echo 1. Staging Import Tool Fixes...
call git add .

echo.
echo 2. Committing Production Release...
call git commit -m "Production Release: Import Tool Fixes & Final Checks"

echo.
echo 3. Pushing to GitHub (Triggers Vercel)...
call git push

echo.
echo ===================================================
echo   ✅ DEPLOYMENT TRIGGERED
echo   Wait for Vercel to complete (Green Checkmark).
echo   Live URL: https://tgaite2026.site
echo ===================================================
pause
