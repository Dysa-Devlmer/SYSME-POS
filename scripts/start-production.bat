@echo off
REM ===================================
REM SCRIPT DE INICIO - PRODUCCIÓN SYSME
REM ===================================
REM Fecha: 25 de Octubre de 2025
REM Versión: 2.0.0

echo.
echo ========================================
echo   SYSME - Iniciando en PRODUCCION
echo ========================================
echo.

REM Verificar que Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detectado:
node --version
echo.

REM Crear directorios necesarios
echo [INFO] Creando directorios de produccion...
if not exist "backend\data" mkdir backend\data
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\backups" mkdir backend\backups
if not exist "backend\uploads" mkdir backend\uploads
echo [OK] Directorios creados
echo.

REM Verificar dependencias del backend
echo [INFO] Verificando dependencias del backend...
cd backend
if not exist "node_modules" (
    echo [WARN] Instalando dependencias del backend...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al instalar dependencias del backend
        pause
        exit /b 1
    )
)
echo [OK] Dependencias del backend listas
cd ..
echo.

REM Verificar dependencias del frontend
echo [INFO] Verificando dependencias del frontend...
cd frontend
if not exist "node_modules" (
    echo [WARN] Instalando dependencias del frontend...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo al instalar dependencias del frontend
        pause
        exit /b 1
    )
)

REM Compilar frontend para producción
echo [INFO] Compilando frontend para produccion...
if exist "dist" (
    echo [INFO] Limpiando compilacion anterior...
    rmdir /s /q dist
)
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar frontend
    pause
    exit /b 1
)
echo [OK] Frontend compilado exitosamente
cd ..
echo.

REM Copiar configuración de producción
echo [INFO] Configurando entorno de produccion...
if exist "backend\.env.production" (
    copy /Y backend\.env.production backend\.env >nul
    echo [OK] Configuracion de produccion aplicada
) else (
    echo [WARN] Archivo .env.production no encontrado
    echo [WARN] Usando configuracion existente
)
echo.

REM Iniciar backend en producción
echo ========================================
echo   INICIANDO BACKEND EN PRODUCCION
echo ========================================
echo.
echo Puerto: 47851
echo Base de datos: ./data/sysme_production.db
echo Logs: ./logs/sysme_production.log
echo.

cd backend
start "SYSME Backend Production" cmd /k "set NODE_ENV=production && npm start"

REM Esperar a que el backend inicie
echo [INFO] Esperando a que el backend inicie...
timeout /t 5 /nobreak >nul
echo.

REM Verificar que el backend está activo
echo [INFO] Verificando backend...
curl -s http://127.0.0.1:47851/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend activo y respondiendo
) else (
    echo [WARN] Backend puede estar iniciando...
    echo [INFO] Revisa la ventana del backend para mas detalles
)
echo.

REM Iniciar frontend en producción
echo ========================================
echo   INICIANDO FRONTEND EN PRODUCCION
echo ========================================
echo.
echo Puerto: 23847
echo Modo: Preview (Produccion)
echo.

cd ..\frontend
start "SYSME Frontend Production" cmd /k "npm run preview"

echo.
echo ========================================
echo   SYSME INICIADO EN PRODUCCION
echo ========================================
echo.
echo Backend:  http://127.0.0.1:47851
echo Frontend: http://127.0.0.1:23847
echo.
echo Estado:   ACTIVO
echo Modo:     PRODUCCION
echo.
echo IMPORTANTE:
echo - El backend corre en modo produccion
echo - Los logs se guardan en backend/logs/
echo - Los backups se crean automaticamente
echo - No cerrar las ventanas de Node.js
echo.
echo ========================================
echo.

cd ..

REM Mostrar información de monitoreo
echo Para detener el sistema:
echo   1. Cierra las ventanas de Node.js
echo   2. O ejecuta: stop-production.bat
echo.
echo Para ver logs en tiempo real:
echo   cd backend
echo   tail -f logs/sysme_production.log
echo.

pause
