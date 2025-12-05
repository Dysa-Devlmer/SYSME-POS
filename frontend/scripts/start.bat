@echo off
REM =====================================================
REM SYSME POS - Quick Start Script (Windows)
REM =====================================================
echo.
echo ========================================
echo   SYSME POS v2.1 - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

REM Check if database exists
if not exist "backend\database.sqlite" (
    echo [INFO] Database not found. Initializing...
    cd backend
    call npm install
    node init-database.js
    cd ..
    echo.
    echo [SUCCESS] Database initialized!
    echo.
)

REM Check if backend node_modules exists
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Check if frontend node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
    echo.
)

echo ========================================
echo   Starting SYSME POS...
echo ========================================
echo.
echo [INFO] Backend will start on: http://localhost:3000
echo [INFO] Frontend will start on: http://localhost:5173
echo.
echo [INFO] Default Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Press Ctrl+C to stop the servers
echo.

REM Start backend in new window
start "SYSME POS - Backend" cmd /k "cd backend && npm start"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "SYSME POS - Frontend" cmd /k "npm run dev"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Open browser
start http://localhost:5173

echo.
echo ========================================
echo   SYSME POS is now running!
echo ========================================
echo.
echo Backend API: http://localhost:3000
echo Frontend App: http://localhost:5173
echo.
echo Check the terminal windows for logs
echo.
pause
