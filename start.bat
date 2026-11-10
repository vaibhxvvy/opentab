@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title OpenTab - DEV

where npm >nul 2>nul
if errorlevel 1 (
    echo [X] npm not found. Install Node.js first: https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo [*] Dependencies not found ^(node_modules is missing^).
    set /p answer=Install them now? [Y/N]: 
    if /i "!answer!"=="Y" (
        echo [*] Installing dependencies...
        call npm install
        if errorlevel 1 (
            echo [X] npm install failed.
            pause
            exit /b 1
        )
    ) else (
        echo [X] Dependencies are required to run. Re-run start.bat and choose Y to install.
        pause
        exit /b 1
    )
)

echo [*] Starting dev server - the browser will open automatically...
call npm run dev -- --open

echo.
echo [*] Dev server stopped.
pause