@echo off
REM ========================================
REM REINICIO DE BACKEND CON CÓDIGO ACTUALIZADO
REM Fecha: 2025-10-27
REM Propósito: Cargar correcciones de BUG #1 y BUG #2
REM ========================================

echo.
echo ====================================
echo REINICIANDO BACKEND SYSME 2.0
echo ====================================
echo.

REM Terminar proceso backend antiguo
echo [1/4] Terminando proceso backend antiguo (PID 33452)...
taskkill /F /PID 33452 >nul 2>&1
if %errorlevel% equ 0 (
    echo       OK - Proceso terminado
) else (
    echo       AVISO - Proceso no encontrado o ya terminado
)

REM Esperar 3 segundos
echo [2/4] Esperando 3 segundos...
timeout /t 3 /nobreak >nul
echo       OK - Esperado

REM Verificar que el puerto esté libre
echo [3/4] Verificando puerto 47851...
netstat -ano | findstr ":47851" >nul 2>&1
if %errorlevel% equ 0 (
    echo       ERROR - Puerto aún en uso
    echo       Ejecuta: netstat -ano ^| findstr ":47851"
    echo       Y termina manualmente el proceso
    pause
    exit /b 1
) else (
    echo       OK - Puerto libre
)

REM Iniciar backend con código actualizado
echo [4/4] Iniciando backend con código actualizado...
cd /d "E:\POS SYSME\SYSME\backend"

REM Crear ventana nueva para el backend
start "SYSME Backend - ACTUALIZADO" cmd /k "NODE_ENV=production PORT=47851 node src/server.js"

timeout /t 5 /nobreak >nul

REM Verificar que el backend haya iniciado
netstat -ano | findstr ":47851" >nul 2>&1
if %errorlevel% equ 0 (
    echo       OK - Backend iniciado correctamente
    echo.
    echo ====================================
    echo BACKEND REINICIADO EXITOSAMENTE
    echo ====================================
    echo.
    echo El backend está corriendo con las correcciones de:
    echo   - BUG #1: Función register^(^)
    echo   - BUG #2: Función updateProfile^(^)
    echo.
    echo Puedes validar con:
    echo   curl -X POST http://localhost:47851/api/v1/auth/register ...
    echo.
    echo Logs visibles en la ventana "SYSME Backend - ACTUALIZADO"
    echo.
) else (
    echo       ERROR - Backend no inició correctamente
    echo       Revisa la ventana del backend para ver errores
    echo.
)

pause
