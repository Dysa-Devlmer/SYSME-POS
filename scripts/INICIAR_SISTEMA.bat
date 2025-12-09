@echo off
cls
echo.
echo ========================================
echo     SYSME - INICIO RAPIDO
echo ========================================
echo.
echo Que deseas hacer?
echo.
echo 1. Iniciar en PRODUCCION (Recomendado)
echo 2. Iniciar en DESARROLLO
echo 3. Verificar sistema
echo 4. Crear backup
echo 5. Ver logs
echo 6. Salir
echo.
set /p opcion="Selecciona una opcion (1-6): "

if "%opcion%"=="1" goto produccion
if "%opcion%"=="2" goto desarrollo
if "%opcion%"=="3" goto verificar
if "%opcion%"=="4" goto backup
if "%opcion%"=="5" goto logs
if "%opcion%"=="6" goto salir

echo.
echo [ERROR] Opcion invalida
pause
exit /b 1

:produccion
echo.
echo [INFO] Iniciando en modo PRODUCCION...
call start-production.bat
goto fin

:desarrollo
echo.
echo [INFO] Iniciando en modo DESARROLLO...
echo.
echo Iniciando Backend (puerto 47851)...
cd backend
start "SYSME Backend Dev" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo Iniciando Frontend (puerto 23847)...
cd ..\frontend
start "SYSME Frontend Dev" cmd /k "npm run dev"
echo.
echo [OK] Sistema iniciado en modo DESARROLLO
echo.
echo Backend:  http://127.0.0.1:47851
echo Frontend: http://127.0.0.1:23847
echo.
cd ..
goto fin

:verificar
echo.
echo [INFO] Verificando sistema...
cd backend
node src/scripts/production-check.js
cd ..
goto fin

:backup
echo.
echo [INFO] Creando backup...
cd backend
node src/scripts/backup-production.js create
cd ..
goto fin

:logs
echo.
echo [INFO] Mostrando logs recientes...
if exist "backend\logs\sysme_production.log" (
    type backend\logs\sysme_production.log | more
) else (
    echo [WARN] No hay logs de produccion
)
goto fin

:salir
echo.
echo [INFO] Saliendo...
exit /b 0

:fin
echo.
pause
