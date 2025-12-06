# 🚀 INICIO RÁPIDO - SYSME POS

## Para la Próxima Sesión

### 1. Verificar Estado del Sistema
```bash
cd C:\SYSME-POS
git status
git log --oneline -5
```

### 2. Iniciar Servicios

**Backend (Terminal 1)**
```bash
cd C:\SYSME-POS\backend
npm run dev
```
Esperar mensaje: `🚀 SYSME Backend Server running on port 3001`

**Frontend (Terminal 2)**
```bash
cd C:\SYSME-POS\frontend
PORT=23847 npm run dev
```
Esperar mensaje: `Local: http://localhost:23847/`

### 3. Verificar Funcionamiento
```bash
# Health check
curl http://localhost:3001/health

# Login (obtener token)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 4. Exportar Token
```bash
# Copiar el accessToken del login y exportar:
export TOKEN="eyJhbGci..."

# En Windows CMD:
set TOKEN=eyJhbGci...
```

---

## ✅ Módulos Ya Probados (100% Funcionales)

1. ✅ **Auth** - Login/Logout/Permisos
2. ✅ **Cash Sessions** - Abrir/Cerrar Caja
3. ✅ **Sales** - Ventas Completas
4. ✅ **Kitchen** - Display de Cocina
5. ✅ **Reports** - 3 reportes principales
6. ✅ **Parked Sales** - Ventas Pausadas (branch testing)
7. ✅ **Reservations** - Sistema de Reservas (branch testing)
8. ✅ **Modifiers** - Modificadores de Productos (branch testing)
9. ✅ **Tables** - Gestión de Mesas (branch testing)
10. ✅ **Combos** - Combos y Packs (branch testing)

---

## 📋 Siguiente Módulo a Probar: INVENTORY

### Endpoints Sugeridos
```bash
# Ver todos los productos
curl http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer $TOKEN"

# Ver categorías
curl http://localhost:3001/api/v1/categories \
  -H "Authorization: Bearer $TOKEN"

# Crear producto
curl -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hamburguesa Clásica",
    "category_id": 1,
    "price": 8500,
    "cost": 3500,
    "stock": 50,
    "sku": "HAMB-001"
  }'

# Actualizar stock
curl -X PATCH http://localhost:3001/api/v1/products/1/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10, "type": "add", "reason": "Reabastecimiento"}'
```

---

## 🎯 Estado del Proyecto

**Branch Actual**: `master`
**Último Commit**: `f357174` - fix: Convert date filters to Unix timestamps in reports

**Progreso**: 10/14 módulos probados (71%)
**Errores Críticos**: 0
**Estado**: Producción-ready para módulos probados

---

## 🔧 Si Hay Problemas

### Backend no inicia
```bash
# Verificar si el puerto está ocupado
netstat -ano | findstr :3001

# Si está ocupado, matar proceso
taskkill /PID <PID> /F

# Reiniciar
cd backend && npm run dev
```

### Database locked
```bash
# Matar todos los procesos node
tasklist | findstr node

# Matar específico
taskkill /PID <PID> /F
```

### Token expirado
```bash
# Simplemente hacer login de nuevo
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 📊 Datos de Prueba Actuales

- **Usuario**: admin / admin123
- **Sesión de Caja**: CS-20251206-0001 (abierta, $50,000)
- **Venta**: SALE-20251206-000001 ($8)
- **Productos**: 62 productos activos
- **Stock Total**: 2,582 unidades

---

## 📝 Recordatorios

1. **Siempre sincronizar con GitHub** después de cambios importantes
2. **No matar procesos node globalmente** - solo los específicos
3. **Usar timestamps Unix** (no ISO strings) en queries de fechas
4. **Verificar permisos** antes de probar endpoints protegidos

---

## 🎉 ¡Listo para Continuar!

El sistema está completamente operativo y listo para seguir probando módulos.
