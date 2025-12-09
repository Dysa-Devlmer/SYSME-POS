@echo off
REM ====================================================================
REM SYSME POS v2.1 - Sistema de Inicio Rápido
REM ====================================================================
REM Este script inicia todo el sistema SYSME POS automáticamente
REM ====================================================================

echo.
echo ========================================================================
echo  SYSME POS v2.1 - Enterprise Edition
echo  Sistema de Inicio Rapido
echo ========================================================================
echo.

cd /d "%~dp0"

REM Verificar Node.js
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    echo Descarga desde: https://nodejs.org
    pause
    exit /b 1
)
echo OK - Node.js instalado
echo.

REM Verificar MySQL
echo [2/6] Verificando MySQL...
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ADVERTENCIA: MySQL no encontrado en PATH
    echo Asegurate de que MySQL este corriendo
    echo.
) else (
    echo OK - MySQL encontrado
    echo.
)

REM Verificar e instalar dependencias del backend
echo [3/6] Verificando dependencias del backend...
cd backend
if not exist "node_modules\" (
    echo Instalando dependencias del backend...
    call npm install
    if errorlevel 1 (
        echo ERROR: Fallo la instalacion de dependencias del backend
        pause
        exit /b 1
    )
) else (
    echo OK - Dependencias del backend ya instaladas
)
echo.

REM Verificar archivo .env
echo [4/6] Verificando configuracion...
if not exist ".env" (
    echo ADVERTENCIA: No existe archivo .env
    echo Creando .env desde .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANTE: Edita backend/.env con tus credenciales de MySQL
    echo Presiona cualquier tecla para continuar o Ctrl+C para cancelar...
    pause >nul
)
echo OK - Archivo .env existe
echo.

REM Iniciar backend
echo [5/6] Iniciando Backend API...
echo Backend corriendo en: http://localhost:3001
echo.
start "SYSME Backend API" cmd /k "npm run dev"

REM Esperar 5 segundos para que el backend inicie
timeout /t 5 /nobreak >nul

REM Verificar que el backend responde
echo Verificando backend...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001' -TimeoutSec 5; Write-Host 'OK - Backend respondiendo' } catch { Write-Host 'ADVERTENCIA: Backend no responde aun' }"
echo.

REM Iniciar frontend
echo [6/6] Iniciando Frontend Dashboard...
cd ..\frontend

if not exist "node_modules\" (
    echo Instalando dependencias del frontend...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ERROR: Fallo la instalacion de dependencias del frontend
        pause
        exit /b 1
    )
)

echo Frontend corriendo en: http://localhost:5173
echo.
start "SYSME Frontend Dashboard" cmd /k "npm run dev"

echo.
echo ========================================================================
echo  SISTEMA INICIADO EXITOSAMENTE!
echo ========================================================================
echo.
echo Backend API:       http://localhost:3001
echo Frontend Dashboard: http://localhost:5173
echo.
echo Credenciales default:
echo   Usuario: admin
echo   Password: admin123
echo.
echo IMPORTANTE:
echo - Asegurate de que MySQL este corriendo
echo - Verifica configuracion en backend/.env
echo - Si tienes Redis, configuralo en backend/.env
echo.
echo Para detener el sistema:
echo - Cierra las ventanas de comando del Backend y Frontend
echo - O presiona Ctrl+C en cada una
echo.
echo Ver documentacion completa en:
echo   DEPLOYMENT-LOCAL-QUICKSTART.md
echo.
echo ========================================================================
echo.
echo Presiona cualquier tecla para abrir el dashboard en el navegador...
pause >nul

REM Abrir navegador
start http://localhost:5173

echo.
echo Sistema listo para usar!
echo.
pause
