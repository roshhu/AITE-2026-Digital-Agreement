@echo off
echo ===================================================
echo   TRAE.AI BULK IMPORT TOOL
echo ===================================================

if not exist volunteers.csv (
    echo [ERROR] volunteers.csv not found!
    echo.
    echo Please save your Excel file as "volunteers.csv" 
    echo and place it in this folder.
    echo.
    pause
    exit /b
)

echo Reading volunteers.csv...
echo This will upload data to Supabase automatically.
echo.

node scripts/import_volunteers.cjs

echo.
pause
