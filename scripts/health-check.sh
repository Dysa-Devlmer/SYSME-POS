#!/bin/bash
#############################################
# SYSME-POS Health Check Script
#############################################

BACKEND_URL="${BACKEND_URL:-http://localhost:47851}"
TIMEOUT=5

check_backend() {
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/health")
    if [ "$response" = "200" ]; then
        echo "✓ Backend: OK"
        return 0
    else
        echo "✗ Backend: FAILED (HTTP $response)"
        return 1
    fi
}

check_database() {
    response=$(curl -s --max-time $TIMEOUT "$BACKEND_URL/health" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    if [ "$response" = "connected" ]; then
        echo "✓ Database: OK"
        return 0
    else
        echo "✗ Database: FAILED"
        return 1
    fi
}

echo "========================================="
echo "  SYSME-POS Health Check"
echo "  $(date)"
echo "========================================="
echo ""

ERRORS=0

check_backend || ERRORS=$((ERRORS + 1))
check_database || ERRORS=$((ERRORS + 1))

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "Estado: ✓ SALUDABLE"
    exit 0
else
    echo "Estado: ✗ PROBLEMAS DETECTADOS ($ERRORS)"
    exit 1
fi
