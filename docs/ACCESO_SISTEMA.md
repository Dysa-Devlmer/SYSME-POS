# SISTEMA SYSME 2.0 - ACCESO Y USO

## ✅ SISTEMA LISTO PARA USAR

El sistema ha sido validado, probado y está completamente funcional para producción.

---

## 🔐 CREDENCIALES DE ACCESO

### Usuario Administrador
```
Usuario: admin
Contraseña: admin2024
```

### Otros Usuarios del Sistema

**Mesera - María García**
- Usuario: `maria_camarera`
- Contraseña: `admin123`
- PIN: `1234`
- Rol: Camarera
- TPV Asignado: TPV1

**Mesero - Carlos López**
- Usuario: `carlos_camarero`
- Contraseña: `admin123`
- PIN: `5678`
- Rol: Camarero
- TPV Asignado: TPV2

**Cocina - Ana Martínez**
- Usuario: `ana_cocina`
- Contraseña: `admin123`
- PIN: `9999`
- Rol: Cocina
- TPV Asignado: COCINA

**Gerente - Luis Rodríguez**
- Usuario: `luis_gerente`
- Contraseña: `admin123`
- PIN: `0000`
- Rol: Gerente
- TPV Asignado: TPV_MASTER

---

## 🌐 URLS DE ACCESO

### Frontend (Interfaz de Usuario)
```
http://127.0.0.1:23847
```

### Backend API
```
http://127.0.0.1:47851
```

### Health Check (Estado del Sistema)
```
http://127.0.0.1:47851/health
```

---

## 🚀 CÓMO USAR EL SISTEMA

### 1. Acceder a la Interfaz Web

Abre tu navegador y ve a:
```
http://127.0.0.1:23847
```

### 2. Iniciar Sesión

- Ingresa el usuario: `admin`
- Ingresa la contraseña: `admin2024`
- Haz clic en "Iniciar Sesión"

### 3. Explorar el Sistema

Una vez autenticado, tendrás acceso a:

#### 📊 Dashboard Principal
- Resumen de ventas del día
- Estadísticas en tiempo real
- Alertas de inventario

#### 🍽️ Gestión de Mesas
- Visualización de todas las mesas del restaurante
- Estados: Libre, Ocupada, Reservada
- Asignación de pedidos a mesas

#### 🧑‍🍳 Cocina
- Vista de pedidos pendientes
- Control de estado: Pendiente, En preparación, Listo
- Notificaciones en tiempo real

#### 💰 Punto de Venta (POS)
- Creación de ventas
- Métodos de pago múltiples
- Impresión de tickets

#### 📦 Inventario
- Control de stock
- Alertas de stock mínimo
- Movimientos de inventario

#### 📈 Reportes
- Ventas por período
- Productos más vendidos
- Análisis de rendimiento

#### ⚙️ Configuración
- Datos de la empresa
- Configuración de impresoras
- Gestión de usuarios
- Backup y restauración

---

## 🔧 CARACTERÍSTICAS IMPLEMENTADAS

### ✅ Autenticación y Seguridad
- Login con JWT
- Tokens de acceso y refresco
- Control de roles (admin, gerente, camarero, cocina)
- Protección CORS y Helmet
- Rate limiting para prevenir ataques
- Cifrado de contraseñas con bcrypt

### ✅ Gestión de Restaurante
- Sistema de mesas con 4 salones predefinidos
- Tarifas diferenciadas por zona
- Sistema de pedidos en tiempo real
- Pantalla de cocina con notificaciones
- Gestión de camareros con PINs

### ✅ Sistema de Ventas
- Punto de venta completo
- Múltiples métodos de pago
- Generación de tickets
- Códigos QR en tickets
- Historial de ventas

### ✅ Control de Inventario
- Stock en tiempo real
- Alertas de stock mínimo
- Movimientos de entrada/salida
- Valoración de inventario

### ✅ Reportes y Analíticas
- Dashboard con métricas en tiempo real
- Reportes de ventas
- Análisis de productos
- Exportación a PDF/Excel

### ✅ Tecnología
- Backend: Node.js + Express
- Frontend: React + TypeScript + Vite
- Base de datos: SQLite (listo para MySQL)
- WebSocket: Socket.IO para tiempo real
- Caché: Sistema en memoria
- Logging: Winston para trazabilidad

---

## 📋 DATOS DE DEMOSTRACIÓN

El sistema incluye datos de ejemplo:

### Categorías
- Bebidas
- Platos Principales
- Postres
- Aperitivos
- Ensaladas

### Productos de Ejemplo
- Café Americano - $2.50
- Café con Leche - $3.00
- Agua Mineral - $1.50
- Hamburguesa Clásica - $12.90
- Pizza Margarita - $11.50
- Ensalada César - $8.90
- Tarta de Chocolate - $4.50

### Salones
- Salon Principal (5 mesas)
- Terraza (4 mesas)
- Sala Privada (1 mesa)
- Barra (2 espacios)

---

## ⚠️ IMPORTANTE - SEGURIDAD

### Cambiar Contraseña del Administrador

**DESPUÉS del primer login, es CRÍTICO cambiar la contraseña:**

1. Ve a Configuración → Usuarios
2. Selecciona el usuario "admin"
3. Haz clic en "Cambiar Contraseña"
4. Ingresa una contraseña segura

### Recomendaciones de Seguridad
- Usa contraseñas de al menos 12 caracteres
- Combina mayúsculas, minúsculas, números y símbolos
- No compartas las credenciales
- Cambia las contraseñas periódicamente
- Revisa los logs de acceso regularmente

---

## 🔄 MANTENIMIENTO DEL SISTEMA

### Backup de Base de Datos

El sistema incluye backup automático, pero puedes crear backups manuales:

```bash
cd backend
npm run backup:create
```

### Ver Estado del Sistema

```bash
cd backend
npm run status
```

### Reiniciar el Sistema

Si necesitas reiniciar los servicios:

**Backend:**
```bash
cd backend
# Detener (Ctrl+C en la terminal del backend)
# Iniciar
NODE_ENV=production PORT=47851 node src/server.js
```

**Frontend:**
```bash
cd dashboard-web
# Detener (Ctrl+C en la terminal del frontend)
# Iniciar
npm run preview -- --port 23847 --host 127.0.0.1
```

---

## 📞 SOPORTE

### Archivos de Documentación
- `VALIDATION_REPORT_PRODUCTION.md` - Reporte de validación completo
- `testsprite_tests/testsprite_frontend_test_plan.json` - Plan de pruebas frontend
- `testsprite_tests/tmp/code_summary.json` - Resumen técnico del código

### Logs del Sistema
Los logs se almacenan en:
- Backend: `backend/logs/`
- Errores de aplicación
- Accesos HTTP
- Eventos de seguridad

---

## ✅ VERIFICACIÓN FINAL

Sistema verificado el 2025-10-25:

- ✅ Backend funcionando en puerto 47851
- ✅ Frontend funcionando en puerto 23847
- ✅ Base de datos inicializada y migrada
- ✅ Autenticación JWT funcional
- ✅ WebSocket en tiempo real operativo
- ✅ CORS configurado correctamente
- ✅ Seguridad implementada (Helmet, rate limiting)
- ✅ Logging completo (Winston)
- ✅ Datos de demostración cargados
- ✅ Sistema de backup configurado

---

## 🎯 PRÓXIMOS PASOS

1. **Acceder al sistema** con las credenciales proporcionadas
2. **Explorar todas las funcionalidades** para familiarizarte
3. **Cambiar la contraseña** del administrador
4. **Configurar datos de tu empresa** en Configuración → Empresa
5. **Crear tus productos y categorías** o modificar los existentes
6. **Configurar tus mesas** según tu layout real
7. **Crear usuarios** para tu personal
8. **Probar el flujo completo** de una venta

---

## 🌟 LISTO PARA PRODUCCIÓN

El sistema SYSME 2.0 está completamente preparado para ser usado en restaurantes reales.

**¡Bienvenido a SYSME 2.0!** 🚀
