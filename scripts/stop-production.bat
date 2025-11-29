@echo off
REM ===================================
REM SCRIPT DE DETENCIÓN - PRODUCCIÓN SYSME
REM ===================================
REM Fecha: 25 de Octubre de 2025
REM Versión: 2.0.0

echo.
echo ========================================
echo   SYSME - Deteniendo PRODUCCION
echo ========================================
echo.

echo [INFO] Buscando procesos Node.js de SYSME...
echo.

REM Listar procesos antes de cerrar
tasklist | findstr /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo Procesos Node.js activos:
    tasklist | findstr /I "node.exe"
    echo.
) else (
    echo [INFO] No se encontraron procesos Node.js activos
    echo.
    pause
    exit /b 0
)

REM Preguntar confirmación
echo ADVERTENCIA: Esto cerrara todos los procesos Node.js
echo Esto incluye:
echo   - Backend SYSME (Puerto 47851)
echo   - Frontend SYSME (Puerto 23847)
echo   - Otros procesos Node.js si existen
echo.
set /p confirm="Estas seguro? (S/N): "

if /I not "%confirm%"=="S" (
    echo.
    echo [INFO] Operacion cancelada
    pause
    exit /b 0
)

echo.
echo [INFO] Deteniendo procesos Node.js...

REM Intentar cerrar gracefully primero
taskkill /IM node.exe /T >nul 2>&1

REM Esperar un momento
timeout /t 2 /nobreak >nul

REM Verificar si quedaron procesos
tasklist | findstr /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo [WARN] Algunos procesos no se cerraron, forzando...
    taskkill /F /IM node.exe /T >nul 2>&1
    echo [OK] Procesos forzados a cerrar
) else (
    echo [OK] Procesos cerrados exitosamente
)

echo.
echo ========================================
echo   SYSME DETENIDO
echo ========================================
echo.
echo El sistema SYSME ha sido detenido completamente
echo.
echo Para reiniciar:
echo   - Ejecuta: start-production.bat
echo.

pause
