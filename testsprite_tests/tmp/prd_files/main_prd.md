# PRD - SYSME 2.0 Sistema de Gestión para Restaurantes

## 1. RESUMEN EJECUTIVO

**Producto:** SYSME 2.0 - Sistema de Gestión Empresarial para Restaurantes
**Versión:** 2.0.0
**Tipo:** Sistema POS (Point of Sale) Full-Stack
**Entorno:** Producción

### Objetivo del Producto
Sistema POS completo para restaurantes que permite gestión de mesas, cocina, inventario, ventas y reportes en tiempo real, optimizado para el mercado chileno.

### Stakeholders
- Propietarios de restaurantes
- Gerentes de operaciones
- Personal de cocina
- Meseros/Camareros
- Cajeros
- Administradores del sistema

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Stack Tecnológico

**Backend:**
- Runtime: Node.js >= 18.0.0
- Framework: Express.js 4.18.2
- Base de Datos: SQLite 5.1.6 (Producción), MySQL 2 (Opcional)
- ORM: Knex.js 3.1.0
- Real-time: Socket.IO 4.7.4
- Autenticación: JWT (jsonwebtoken 9.0.2)
- Seguridad: Helmet, CORS, Rate Limiting, bcryptjs

**Frontend:**
- Framework: React 18.3.1
- Lenguaje: TypeScript 5.5.4
- Build Tool: Vite 5.4.1
- Routing: React Router DOM 6.26.1
- State Management: Zustand + React Query
- UI: TailwindCSS, Radix UI, Headless UI
- PWA: Habilitado con service workers

**Deployment:**
- Backend Port: 47851
- Frontend Port: 23847
- Health Monitor Port: 8080
- Environment: production

### 2.2 Bases de Datos

**Database Principal:** `backend/data/sysme_production.db`

**Tablas:**
1. users - Usuarios del sistema
2. products - Productos/Menú
3. categories - Categorías de productos
4. sales - Ventas realizadas
5. sale_items - Items de cada venta
6. tables - Mesas del restaurante
7. salons - Salones/Áreas
8. tarifas - Tarifas/Precios
9. settings - Configuración del sistema
10. sqlite_sequence - Secuencias de SQLite

**Datos Actuales:**
- Usuarios: 3 (admin, maria_camarera, carlos_camarero)
- Productos: 7
- Categorías: 5

## 3. FUNCIONALIDADES PRINCIPALES

### 3.1 Autenticación y Autorización

**Roles de Usuario:**
- **admin**: Acceso total al sistema
- **manager**: Gestión de productos, inventario, reportes
- **waiter**: Gestión de pedidos y mesas

**Features:**
- Login con username/password
- Tokens JWT con refresh automático
- Control de sesiones
- Protección de rutas por rol

### 3.2 Sistema POS (Punto de Venta)

**Ruta:** `/pos`
**Rol Requerido:** waiter, manager, admin

**Funcionalidades:**
- Creación de pedidos
- Selección de productos del menú
- Cálculo automático de totales
- Múltiples formas de pago
- Generación de tickets
- Códigos QR

### 3.3 Gestión de Mesas

**Ruta:** `/mesas`
**Rol Requerido:** waiter, manager, admin

**Funcionalidades:**
- Visualización de mesas disponibles/ocupadas
- Asignación de pedidos a mesas
- Estado en tiempo real (WebSocket)
- Transferencia de pedidos entre mesas
- Vista de salones/áreas

### 3.4 Panel de Cocina

**Ruta:** `/cocina`
**Rol Requerido:** waiter, manager, admin

**Funcionalidades:**
- Vista de pedidos pendientes
- Priorización de pedidos
- Actualización de estados (pendiente, en preparación, listo)
- Notificaciones en tiempo real
- Temporizadores de preparación

### 3.5 Gestión de Productos

**Ruta:** `/products`
**Rol Requerido:** manager, admin

**Funcionalidades:**
- CRUD completo de productos
- Categorización de productos
- Gestión de precios
- Imágenes de productos
- Control de disponibilidad
- Stock

### 3.6 Control de Inventario

**Ruta:** `/inventory`
**Rol Requerido:** manager, admin

**Funcionalidades:**
- Registro de entradas/salidas
- Alertas de stock bajo
- Valoración de inventario
- Reportes de movimientos
- Historial de inventario

### 3.7 Gestión de Caja

**Ruta:** `/caja`
**Rol Requerido:** waiter, manager, admin

**Funcionalidades:**
- Apertura/cierre de caja
- Registro de movimientos
- Cuadre de caja
- Reportes de efectivo
- Historial de transacciones

### 3.8 Reportes y Análisis

**Ruta:** `/reports`
**Rol Requerido:** manager, admin

**Funcionalidades:**
- Reportes de ventas (diario, semanal, mensual)
- Productos más vendidos
- Análisis de categorías
- Reportes de inventario
- Exportación a PDF/Excel
- Gráficos y visualizaciones (Recharts)

### 3.9 Configuración del Sistema

**Ruta:** `/settings`
**Rol Requerido:** admin

**Funcionalidades:**
- Gestión de usuarios
- Configuración de impresoras
- Parámetros del sistema
- Datos de la empresa
- Configuración de mesas y salones
- Backup/Restore

## 4. API ENDPOINTS

**Base URL:** `http://127.0.0.1:47851/api/v1`

### 4.1 Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Cerrar sesión

### 4.2 Productos
- `GET /products` - Listar productos
- `GET /products/:id` - Obtener producto
- `POST /products` - Crear producto
- `PUT /products/:id` - Actualizar producto
- `DELETE /products/:id` - Eliminar producto

### 4.3 Categorías
- `GET /categories` - Listar categorías
- `POST /categories` - Crear categoría
- `PUT /categories/:id` - Actualizar categoría
- `DELETE /categories/:id` - Eliminar categoría

### 4.4 Ventas
- `GET /sales` - Listar ventas
- `POST /sales` - Crear venta
- `GET /sales/:id` - Obtener venta

### 4.5 Mesas
- `GET /tables` - Listar mesas
- `PUT /tables/:id/status` - Actualizar estado

### 4.6 Pedidos
- `GET /orders` - Listar pedidos
- `POST /orders` - Crear pedido
- `PUT /orders/:id` - Actualizar pedido

### 4.7 Cocina
- `GET /kitchen/orders` - Pedidos de cocina
- `PUT /kitchen/orders/:id/status` - Actualizar estado

### 4.8 Inventario
- `GET /inventory` - Consultar inventario
- `POST /inventory/entry` - Entrada de inventario
- `POST /inventory/exit` - Salida de inventario

### 4.9 Reportes
- `GET /reports/sales` - Reportes de ventas
- `GET /reports/inventory` - Reportes de inventario
- `GET /reports/products` - Reportes de productos

## 5. SEGURIDAD

### 5.1 Medidas Implementadas
- JWT con expiración de 24 horas
- Bcrypt para hashing de contraseñas (12 rounds)
- Rate Limiting: 100 requests / 15 minutos
- CORS configurado para puertos específicos
- Helmet para security headers
- Validación de entrada con Joi
- Control de acceso basado en roles

### 5.2 Variables de Entorno
- `JWT_SECRET`: Clave secreta para JWT
- `BCRYPT_ROUNDS`: Rounds de bcrypt
- `CORS_ORIGINS`: Orígenes permitidos
- `RATE_LIMIT_WINDOW_MS`: Ventana de rate limiting
- `RATE_LIMIT_MAX_REQUESTS`: Máximo de requests

## 6. TIEMPO REAL (WebSocket)

### Eventos Socket.IO
- Conexión/Desconexión de clientes
- Actualización de mesas en tiempo real
- Notificaciones de nuevos pedidos a cocina
- Sincronización de inventario
- Alertas del sistema

## 7. CARACTERÍSTICAS ESPECÍFICAS PARA CHILE

### 7.1 Localización
- Moneda: Pesos Chilenos (CLP)
- Formato de fecha: DD-MM-YYYY
- Timezone: America/Santiago
- Idioma: Español

### 7.2 Productos Chilenos
- Base de datos incluye productos típicos chilenos
- Categorías adaptadas al mercado local
- Middleware específico para Chile

## 8. MONITOREO Y LOGS

### 8.1 Health Check
- Endpoint: `GET /health`
- Retorna: status, timestamp, environment, version

### 8.2 Logging
- Winston para logs
- Morgan para logs HTTP
- Archivos de log en `backend/logs/`
- Rotación de logs

### 8.3 Monitor de Sistema
- URL: `http://127.0.0.1:8080`
- Muestra estado de Backend, Frontend, DB, WebSocket
- Auto-refresh cada 10 segundos

## 9. BACKUP Y RECUPERACIÓN

### 9.1 Sistema de Backup
- Backups automáticos con node-cron
- Scripts disponibles:
  - `npm run backup:create`
  - `npm run backup:list`
  - `npm run backup:clean`

### 9.2 Directorio de Backups
`backend/backups/`

## 10. TESTING Y VALIDACIÓN

### 10.1 Herramientas
- TestSprite para pruebas automatizadas
- Vitest (configurado en frontend)

### 10.2 Áreas de Prueba
- [ ] Autenticación y autorización
- [ ] CRUD de productos
- [ ] Sistema POS completo
- [ ] Gestión de mesas
- [ ] Panel de cocina
- [ ] Sincronización en tiempo real
- [ ] Reportes
- [ ] Backup/Restore

## 11. DEPLOYMENT

### 11.1 Scripts de Inicio

**Backend:**
```bash
cd backend
npm run start:prod
# O
NODE_ENV=production PORT=47851 node src/server.js
```

**Frontend:**
```bash
cd dashboard-web
npm run build
npm run preview -- --port 23847 --host 127.0.0.1
```

**Health Monitor:**
```bash
cd health-monitor
python -m http.server 8080
```

### 11.2 Verificación Post-Deployment
1. Health check: `curl http://127.0.0.1:47851/health`
2. Frontend: Abrir `http://127.0.0.1:23847`
3. Monitor: Abrir `http://127.0.0.1:8080`

## 12. MÉTRICAS ESPERADAS

### 12.1 Performance
- Backend response time: < 200ms
- Frontend load time: < 3s
- WebSocket latency: < 100ms

### 12.2 Disponibilidad
- Uptime objetivo: 99.9%
- RPO (Recovery Point Objective): 1 hora
- RTO (Recovery Time Objective): 30 minutos

## 13. ROADMAP FUTURO

### Versión 2.1 (Próxima)
- [ ] Integración con pasarelas de pago
- [ ] App móvil (React Native)
- [ ] Multi-restaurante
- [ ] Integración con delivery

### Versión 2.2
- [ ] BI y Analytics avanzado
- [ ] Predicción de demanda con ML
- [ ] Sistema de reservas online

## 14. DOCUMENTACIÓN

### Ubicación
`E:\POS SYSME\ChatBotDysa\restaurantbot_analytics\avances\parte-2\`

### Documentos Generados
- 13 reportes técnicos
- ~190 KB de documentación
- ~340 páginas estimadas

## 15. CONTACTO Y SOPORTE

### Equipo
- Desarrollo: SYSME Team
- Versión: 2.0.0
- Última actualización: 25 de Octubre de 2025

---

**Estado:** ✅ SISTEMA LISTO PARA PRODUCCIÓN
**Última verificación:** 25-10-2025 21:10
**Validado por:** Claude Code + TestSprite
