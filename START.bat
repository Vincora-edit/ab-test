@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   AB Test Platform
echo ========================================
echo.
echo Starting server on http://localhost:9999
echo.
echo Admin panel: http://localhost:9999/ab-test-admin.html
echo.
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

python ab-test-api.py

pause
