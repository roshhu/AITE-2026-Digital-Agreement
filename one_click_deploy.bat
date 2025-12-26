@echo off
echo ===================================================
echo   AITE-2026 AUTO-DEPLOYMENT SCRIPT
echo ===================================================
echo.
echo 1. Initializing Git Repository...
call git init

echo.
echo 2. Adding all files...
call git add .

echo.
echo 3. Committing files...
call git commit -m "Production Release v1.0"

echo.
echo 4. Setting up main branch...
call git branch -M main

echo.
echo ===================================================
echo   IMPORTANT: PASTE YOUR GITHUB REPO URL BELOW
echo   Example: https://github.com/username/aite-repo.git
echo ===================================================
set /p repo_url="Repository URL: "

echo.
echo 5. Linking Remote Repository...
call git remote add origin %repo_url%

echo.
echo 6. Pushing to GitHub...
call git push -u origin main

echo.
echo ===================================================
echo   SUCCESS! Vercel should now deploy automatically.
echo ===================================================
pause
