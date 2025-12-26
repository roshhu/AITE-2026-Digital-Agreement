@echo off
echo ===================================================
echo   DEPLOYING SERVER-SIDE PAGINATION FIX
echo ===================================================
echo.

echo 1. Staging Pagination Updates...
call git add .

echo.
echo 2. Committing...
call git commit -m "Urgent Fix: Implemented Server-Side Pagination (100/page) & Full Backend Search"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   ✅ DEPLOYED.
echo   Wait 2 mins.
echo   Refresh Admin Panel.
echo   You should see "Page 1 of X" at the bottom.
echo ===================================================
pause
