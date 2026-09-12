@echo off
title Room System Server
cd /d "%~dp0"

if not exist node_modules (
 echo Installing dependencies...
 call npm install
 if errorlevel 1 (
  echo npm install failed
  pause
  exit /b
 )
)

echo Starting server on port 3005...
call npm start

pause
