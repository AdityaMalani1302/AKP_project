@echo off
REM ============================================
REM AKP ERP Stop Script
REM ============================================

echo Stopping AKP ERP System...

REM Stop PM2 processes
pm2 stop akp-erp-backend 2>nul
pm2 delete akp-erp-backend 2>nul

REM Find and kill cloudflared processes
echo Stopping Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe 2>nul

echo.
echo AKP ERP System Stopped.
pause
