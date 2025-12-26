@echo off
echo ===================================================
echo   FIXING ADMIN PANEL & DEPLOYING
echo ===================================================
echo.

echo 1. Staging Admin Panel Fixes...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Fix: Admin Panel now shows exact total count (bypassing 1000 limit)"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ FIX DEPLOYED
echo   Wait 2 mins for Vercel to update.
echo ===================================================
pause
