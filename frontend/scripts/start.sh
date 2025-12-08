#!/bin/bash
# =====================================================
# SYSME POS - Quick Start Script (Linux/Mac)
# =====================================================

echo ""
echo "========================================"
echo "  SYSME POS v2.1 - Quick Start"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Node.js version: $(node --version)"
echo ""

# Check if database exists
if [ ! -f "backend/database.sqlite" ]; then
    echo -e "${YELLOW}[INFO]${NC} Database not found. Initializing..."
    cd backend
    npm install
    node init-database.js
    cd ..
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Database initialized!"
    echo ""
fi

# Check if backend node_modules exists
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo ""
fi

# Check if frontend node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installing frontend dependencies..."
    npm install
    echo ""
fi

echo "========================================"
echo "  Starting SYSME POS..."
echo "========================================"
echo ""
echo -e "${GREEN}[INFO]${NC} Backend will start on: http://localhost:3000"
echo -e "${GREEN}[INFO]${NC} Frontend will start on: http://localhost:5173"
echo ""
echo -e "${YELLOW}[INFO]${NC} Default Login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down SYSME POS..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

# Try to open browser (works on most Linux/Mac systems)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo ""
echo "========================================"
echo "  SYSME POS is now running!"
echo "========================================"
echo ""
echo "Backend API: http://localhost:3000"
echo "Frontend App: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for processes
wait
