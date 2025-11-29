@echo off
cls
echo.
echo ========================================
echo   SYSME - FIX Y REINICIO DE PRODUCCION
echo ========================================
echo.
echo [PASO 1/5] Deteniendo servicios actuales...
echo.

REM Detener todos los procesos de Node.js
taskkill /F /IM node.exe /T >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servicios detenidos correctamente
) else (
    echo [INFO] No habia servicios ejecutandose
)

echo.
echo [PASO 2/5] Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo [PASO 3/5] Limpiando compilacion anterior del frontend...
echo.
cd dashboard-web
if exist dist (
    rmdir /S /Q dist
    echo [OK] Carpeta dist eliminada
) else (
    echo [INFO] No habia carpeta dist
)

echo.
echo [PASO 4/5] Recompilando frontend con configuracion CORRECTA...
echo.
echo [INFO] Usando .env.production:
echo   - VITE_API_BASE_URL=http://127.0.0.1:47851
echo   - VITE_WS_URL=ws://127.0.0.1:47851
echo   - VITE_ENVIRONMENT=production
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Fallo la compilacion del frontend
    echo.
    pause
    exit /b 1
)

cd ..

echo.
echo [OK] Frontend recompilado correctamente
echo.
echo [PASO 5/5] Iniciando sistema en modo PRODUCCION...
echo.
timeout /t 2 /nobreak >nul

REM Iniciar el sistema de produccion
call start-production.bat

echo.
echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
echo.
echo El sistema deberia estar iniciando...
echo.
echo Verifica en:
echo   - Backend:  http://127.0.0.1:47851/health
echo   - Frontend: http://127.0.0.1:23847
echo.
echo El frontend ahora deberia mostrar "PRODUCCION"
echo.
pause
