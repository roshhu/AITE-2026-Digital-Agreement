@echo off
echo ===================================================
echo   TRAE.AI AUTOMATED RESET
echo ===================================================

echo This script uses the Admin Key to fix issues remotely.
echo.

if not exist .env (
    echo [ERROR] .env file not found.
    goto end
)

echo Resetting user limits...
node --env-file=.env scripts/admin_manager.cjs reset roshanbunny2002@gmail.com

echo.
echo If that failed, you need to add SUPABASE_SERVICE_ROLE_KEY to .env
echo.
:end
pause
