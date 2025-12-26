@echo off
echo ===================================================
echo   TRAE.AI ADMIN SETUP
echo ===================================================
echo.
echo Please paste the 'service_role' key you just copied:
set /p ADMIN_KEY=

if "%ADMIN_KEY%"=="" (
    echo Error: Key cannot be empty.
    pause
    exit /b
)

echo.
echo Saving key to .env...
echo. >> .env
echo SUPABASE_SERVICE_ROLE_KEY=%ADMIN_KEY%>> .env

echo.
echo ===================================================
echo   SETUP COMPLETE!
echo   Running Auto-Fix now...
echo ===================================================

call auto_fix.bat
