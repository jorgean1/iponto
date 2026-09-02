@echo off
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar-Iponto.ps1" -PackagePath "%~dp0Iponto-app.zip"
