@echo off
cd /d D:\iponto
if not exist node_modules call npm install
start "Iponto" /min cmd /c "npm start >> data\iponto.log 2>&1"
timeout /t 2 /nobreak >nul
start http://localhost:3077
