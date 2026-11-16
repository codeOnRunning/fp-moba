@echo off
setlocal
cd /d "%~dp0"
set "GAME_PORT=4173"
set "GAME_URL=http://127.0.0.1:%GAME_PORT%/"

powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%GAME_URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if "%errorlevel%"=="0" (
  start "" "%GAME_URL%"
  exit /b 0
)

start "FP MOBA Dev Server" cmd /k "npm run dev -- --host 0.0.0.0 --port %GAME_PORT%"
timeout /t 2 /nobreak >nul
start "" "%GAME_URL%"
