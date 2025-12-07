#!/bin/bash

#############################################
# SYSME-POS Production Deployment Script
# Sistema POS para Restaurantes - Chile
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/dashboard-web"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   SYSME-POS Production Deployment     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check requirements
echo -e "${YELLOW}Verificando requisitos...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no encontrado. Instale Node.js 18 o superior."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 o superior requerido. Versión actual: $(node -v)"
    exit 1
fi
print_status "Node.js $(node -v) encontrado"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm no encontrado"
    exit 1
fi
print_status "npm $(npm -v) encontrado"

# Check .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        print_warning "Archivo .env no encontrado. Copiando .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        print_warning "IMPORTANTE: Configure las variables en .env antes de continuar"
        echo ""
        echo "Variables críticas a configurar:"
        echo "  - DB_PASS: Contraseña de base de datos"
        echo "  - JWT_SECRET: Secreto para tokens JWT (min 32 caracteres)"
        echo "  - SESSION_SECRET: Secreto de sesión"
        echo "  - SII_* : Configuración de facturación electrónica"
        echo ""
        read -p "Presione Enter para continuar o Ctrl+C para cancelar..."
    else
        print_error "Archivo .env no encontrado y .env.example no existe"
        exit 1
    fi
fi
print_status "Archivo .env encontrado"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current database if exists
echo ""
echo -e "${YELLOW}Creando backup de base de datos...${NC}"
if [ -f "$PROJECT_ROOT/posventa.db" ]; then
    cp "$PROJECT_ROOT/posventa.db" "$BACKUP_DIR/posventa_$TIMESTAMP.db"
    print_status "Backup creado: posventa_$TIMESTAMP.db"
else
    print_warning "Base de datos no encontrada (primera instalación)"
fi

# Install backend dependencies
echo ""
echo -e "${YELLOW}Instalando dependencias del backend...${NC}"
cd "$BACKEND_DIR"
npm ci --production 2>/dev/null || npm install --production
print_status "Dependencias del backend instaladas"

# Run database migrations
echo ""
echo -e "${YELLOW}Ejecutando migraciones de base de datos...${NC}"
if [ -f "$BACKEND_DIR/src/database/init.js" ]; then
    node "$BACKEND_DIR/src/database/init.js" 2>/dev/null && print_status "Migraciones ejecutadas" || print_warning "Migraciones ya aplicadas o error menor"
fi

# Install frontend dependencies and build
echo ""
echo -e "${YELLOW}Construyendo frontend...${NC}"
cd "$FRONTEND_DIR"
npm ci 2>/dev/null || npm install
npm run build
print_status "Frontend construido"

# Create production start script
echo ""
echo -e "${YELLOW}Creando scripts de inicio...${NC}"

cat > "$PROJECT_ROOT/start-production.sh" << 'STARTSCRIPT'
#!/bin/bash
# Start SYSME-POS in Production Mode
cd "$(dirname "$0")"
export NODE_ENV=production

echo "Iniciando SYSME-POS..."

# Start backend
cd backend
nohup node src/server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo $BACKEND_PID > ../backend.pid

echo ""
echo "========================================="
echo "  SYSME-POS iniciado correctamente"
echo "========================================="
echo ""
echo "Backend: http://localhost:${BACKEND_PORT:-3001}"
echo "Health:  http://localhost:${BACKEND_PORT:-3001}/health"
echo ""
echo "Para detener: ./stop-production.sh"
STARTSCRIPT
chmod +x "$PROJECT_ROOT/start-production.sh"

cat > "$PROJECT_ROOT/stop-production.sh" << 'STOPSCRIPT'
#!/bin/bash
# Stop SYSME-POS
cd "$(dirname "$0")"

if [ -f backend.pid ]; then
    PID=$(cat backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "Backend detenido (PID: $PID)"
    fi
    rm backend.pid
fi
echo "SYSME-POS detenido"
STOPSCRIPT
chmod +x "$PROJECT_ROOT/stop-production.sh"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

print_status "Scripts de inicio creados"

# Validate production configuration
echo ""
echo -e "${YELLOW}Validando configuración de producción...${NC}"

# Check critical env vars
source "$PROJECT_ROOT/.env" 2>/dev/null || true

WARNINGS=0
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secret_jwt_key_min_32_chars_CHANGE_THIS" ]; then
    print_warning "JWT_SECRET no configurado correctamente"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -z "$DB_PASS" ] || [ "$DB_PASS" = "sysme_pass_2024_CHANGE_THIS" ]; then
    print_warning "DB_PASS no configurado (usando valor por defecto)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ "$SII_ENVIRONMENT" = "CERT" ]; then
    print_warning "SII_ENVIRONMENT está en CERT (certificación). Cambiar a PROD para producción."
fi

if [ $WARNINGS -eq 0 ]; then
    print_status "Configuración de producción válida"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment completado exitosamente   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Resumen:"
echo "  - Backup: $BACKUP_DIR/posventa_$TIMESTAMP.db"
echo "  - Backend: $BACKEND_DIR"
echo "  - Frontend: $FRONTEND_DIR/dist"
echo ""
echo "Para iniciar el sistema:"
echo "  cd $PROJECT_ROOT"
echo "  ./start-production.sh"
echo ""
echo "Logs en: $PROJECT_ROOT/logs/"
echo ""

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}IMPORTANTE: Hay $WARNINGS advertencia(s) de configuración.${NC}"
    echo -e "${YELLOW}Revise el archivo .env antes de usar en producción.${NC}"
fi
