@echo off
echo ===================================================
echo   FIXING BUILD ERRORS & UPDATING DEPLOYMENT
echo ===================================================
echo.

echo 1. Staging fixes...
call git add .

echo.
echo 2. Committing changes...
call git commit -m "Fix TypeScript build errors for Vercel"

echo.
echo 3. Pushing to GitHub...
call git push

echo.
echo ===================================================
echo   DONE! Vercel will auto-detect this and rebuild.
echo   Check your Vercel dashboard in 30 seconds.
echo ===================================================
pause
