@echo off
echo ===================================================
echo   INCREASING OTP LIMIT FOR TESTING
echo ===================================================
echo.

echo 1. Staging changes...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Increase daily OTP limit to 100"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   DONE! You can now send up to 100 OTPs per day.
echo   Wait 2 minutes for Vercel to update.
echo ===================================================
pause
