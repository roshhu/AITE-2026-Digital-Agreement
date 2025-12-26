@echo off
echo Adding Roshan (Tester) to Database...
node --env-file=.env scripts/add_tester.cjs
pause
