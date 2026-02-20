@echo off
REM ============================================
REM AKP ERP Production Startup Script
REM Run this script as Administrator
REM ============================================

echo Starting AKP ERP System...
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator
    pause
    exit /b 1
)

REM Navigate to project directory
cd /d C:\AKP_project

REM Create logs directory if not exists
if not exist "logs" mkdir logs

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorLevel% neq 0 (
    echo PM2 not found. Installing PM2...
    npm install -g pm2
    npm install -g pm2-windows-startup
)

REM Start backend with PM2
echo Starting Backend Server...
pm2 start ecosystem.config.json

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start Cloudflare Tunnel
echo Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /c "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000

echo.
echo ============================================
echo AKP ERP System Started Successfully!
echo ============================================
echo.
echo Backend: http://localhost:5000
echo Tunnel: Check the new window for tunnel URL
echo.
echo To stop: pm2 stop akp-erp-backend
echo To view logs: pm2 logs akp-erp-backend
echo.
pause
