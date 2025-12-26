@echo off
echo ===================================================
echo   FIXING STICKY NOTIFICATIONS
echo ===================================================
echo.

echo 1. Staging UI fixes...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Fix sticky Access Granted popup"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   DONE! The annoying popup will be gone in 2 mins.
echo ===================================================
pause
