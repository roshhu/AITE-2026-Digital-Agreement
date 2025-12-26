@echo off
echo ===================================================
echo   FINAL PROJECT EXPORT & DEPLOYMENT
echo ===================================================
echo.

echo 1. Staging Final Changes (Admin Fix v2.0)...
call git add .

echo.
echo 2. Committing...
call git commit -m "Final Polish: Admin Count Fix v2.0 & UI Updates"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ DEPLOYED.
echo   Wait 2 mins.
echo   Check Admin Panel (v2.0) for correct count.
echo ===================================================
pause
