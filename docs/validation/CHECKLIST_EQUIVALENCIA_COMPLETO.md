# ✅ CHECKLIST COMPLETO DE EQUIVALENCIA FUNCIONAL
## Sistema Antiguo SYSME vs Sistema Nuevo SYSME 2.0

**Fecha de Creación:** 2025-10-26
**Sistema Antiguo:** E:\POS SYSME\Sysme_Principal\SYSME (Delphi + PHP + MySQL)
**Sistema Nuevo:** E:\POS SYSME\SYSME (Node.js + React + MySQL/SQLite)
**Objetivo:** 100% equivalencia funcional para producción

---

## 📊 RESUMEN EJECUTIVO ACTUALIZADO

| Categoría | Total Items | ✅ Implementado | 🟡 Parcial | ❌ Faltante | % Completado |
|-----------|-------------|----------------|-----------|-------------|--------------|
| **1. Sistema Base** | 15 | 8 | 4 | 3 | 53% |
| **2. Gestión de Usuarios** | 12 | 6 | 3 | 3 | 50% |
| **3. Sistema de Caja** | 15 | 10 | 3 | 2 | 67% |
| **4. Gestión de Productos** | 20 | 5 | 5 | 10 | 25% |
| **5. Gestión de Mesas** | 12 | 7 | 3 | 2 | 58% |
| **6. Sistema de Ventas** | 25 | 8 | 8 | 9 | 32% |
| **7. Panel de Cocina** | 15 | 4 | 5 | 6 | 27% |
| **8. Inventario** | 18 | 2 | 4 | 12 | 11% |
| **9. Clientes** | 15 | 2 | 4 | 9 | 13% |
| **10. Proveedores** | 12 | 0 | 0 | 12 | 0% |
| **11. Facturación Legal** | 18 | 1 | 2 | 15 | 6% |
| **12. Reportes** | 20 | 3 | 3 | 14 | 15% |
| **13. Configuración** | 15 | 5 | 5 | 5 | 33% |
| **14. Integraciones** | 8 | 0 | 0 | 8 | 0% |
| **TOTAL GENERAL** | **220** | **61** | **49** | **110** | **28%** |

**Progreso actual:** 28% (61/220 completados)
**Objetivo:** 100% (220/220 completados)

---

## 1️⃣ SISTEMA BASE (53% - 8/15)

### Infraestructura y Arquitectura

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 1.1 | **Base de datos MySQL** | ✅ MySQL 5.x | ✅ MySQL 8.0 + SQLite dev | ✅ | MySQL para producción | CRÍTICO |
| 1.2 | **API REST** | ❌ No tiene | ✅ Express.js REST API | ✅ | Mejora arquitectónica | CRÍTICO |
| 1.3 | **Autenticación segura** | 🟡 Básica | ✅ JWT + bcrypt | ✅ | Mayor seguridad | CRÍTICO |
| 1.4 | **Interfaz gráfica** | ✅ Delphi desktop | ✅ React web | ✅ | Modernizada | CRÍTICO |
| 1.5 | **WebSocket tiempo real** | ❌ No tiene | ✅ Socket.io | ✅ | Para cocina en vivo | ALTO |
| 1.6 | **Backup automático** | ✅ Configurado | 🟡 Scripts manuales | 🟡 | Falta automatización | ALTO |
| 1.7 | **Multi-idioma** | ✅ ES/EN/FR | 🟡 Solo ES | 🟡 | i18n parcial | MEDIO |
| 1.8 | **Logging sistema** | ✅ Logs Delphi | ✅ Winston/Morgan | ✅ | Implementado | MEDIO |
| 1.9 | **Manejo de errores** | ✅ Try-catch | ✅ Middleware errores | ✅ | Mejorado | ALTO |
| 1.10 | **Variables de entorno** | ❌ Hardcoded | ✅ .env con dotenv | ✅ | Mejora seguridad | ALTO |
| 1.11 | **Versionado API** | ❌ No tiene | ✅ /api/v1/ | ✅ | Preparado para futuro | MEDIO |
| 1.12 | **Validación de datos** | 🟡 Parcial | 🟡 Express-validator | 🟡 | Falta en algunos endpoints | ALTO |
| 1.13 | **Sanitización inputs** | ❌ Vulnerable | 🟡 Parcialmente | 🟡 | Falta validación completa | CRÍTICO |
| 1.14 | **Rate limiting** | ❌ No tiene | ❌ No implementado | ❌ | Prevenir ataques | MEDIO |
| 1.15 | **Documentación API** | ❌ No tiene | ❌ No implementada | ❌ | Swagger/OpenAPI pendiente | BAJO |

---

## 2️⃣ GESTIÓN DE USUARIOS (50% - 6/12)

### Tabla de Referencia: `sysme.usuario`, `sysme.camareros`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 2.1 | **Crear usuario** | ✅ `usuario` tabla | ✅ `POST /api/v1/users` | ✅ | Con validación | CRÍTICO |
| 2.2 | **Roles de usuario** | ✅ admin/cashier/waiter | ✅ 5 roles implementados | ✅ | admin/manager/cashier/waiter/kitchen | CRÍTICO |
| 2.3 | **Login usuario/password** | ✅ Form login | ✅ JWT `/api/v1/auth/login` | ✅ | Más seguro con JWT | CRÍTICO |
| 2.4 | **Login con PIN 4 dígitos** | ✅ `camareros.clavecamarero` | ✅ `users.pin_code` | ✅ | Para acceso rápido | CRÍTICO |
| 2.5 | **Asignación de TPV/Caja** | ✅ `camareros.tpv` | ✅ `users.assigned_tpv` | ✅ | Por usuario | ALTO |
| 2.6 | **Asignación de almacén** | ✅ `camareros.almacen` | ✅ `users.assigned_almacen` | ✅ | Control de inventario | ALTO |
| 2.7 | **Permisos granulares** | ✅ 50+ permisos | 🟡 `users.permissions` JSON | 🟡 | Campo existe, falta implementar checks | ALTO |
| 2.8 | **Grupos de usuarios** | ✅ `sysme.grupo` + `usu_gru` | ❌ No implementado | ❌ | Para gestión masiva | MEDIO |
| 2.9 | **Privilegios por módulo** | ✅ `privilegios_a`/`privilegios_e` | ❌ No implementado | ❌ | Control fino de acceso | MEDIO |
| 2.10 | **Bloqueo por intentos fallidos** | ✅ Tras 3 intentos | 🟡 `failed_login_attempts` | 🟡 | Campo existe, falta lógica | ALTO |
| 2.11 | **Historial de sesiones** | ✅ Registro completo | 🟡 `last_login_at/ip` | 🟡 | Parcial implementado | BAJO |
| 2.12 | **Cambio de contraseña** | ✅ Forzar cada 90 días | ❌ No implementado | ❌ | Política de seguridad | MEDIO |

---

## 3️⃣ SISTEMA DE CAJA (67% - 10/15) ⭐ RECIENTEMENTE MEJORADO

### Tabla de Referencia: `sysmehotel.apcajas`, `sysmehotel.cajas`, `sysmehotel.registroz`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 3.1 | **Apertura de caja** | ✅ `apcajas` | ✅ `POST /api/v1/cash/open` | ✅ | Backend completo | BLOQUEANTE |
| 3.2 | **Saldo inicial** | ✅ Importe apertura | ✅ `opening_balance` | ✅ | Con validación | BLOQUEANTE |
| 3.3 | **Cierre de caja** | ✅ Proceso completo | ✅ `POST /api/v1/cash/close` | ✅ | Con arqueo | BLOQUEANTE |
| 3.4 | **Cálculo de diferencias** | ✅ Automático | ✅ `difference` calculado | ✅ | closing - expected | BLOQUEANTE |
| 3.5 | **Registro de ventas** | ✅ Automático | ✅ `POST /api/v1/cash/record-sale` | ✅ | Llamada automática | BLOQUEANTE |
| 3.6 | **Movimientos de entrada** | ✅ `cajas` type=entrada | ✅ `cash_movements` type='in' | ✅ | Ingresos adicionales | CRÍTICO |
| 3.7 | **Movimientos de salida** | ✅ `cajas` type=salida | ✅ `cash_movements` type='out' | ✅ | Retiros/gastos | CRÍTICO |
| 3.8 | **Tracking por método pago** | ✅ Efectivo/Tarjeta/Otros | ✅ cash/card/other | ✅ | 3 métodos | CRÍTICO |
| 3.9 | **Reporte Z fiscal** | ✅ `registroz` | ✅ `POST /api/v1/cash/z-report` | ✅ | Backend completo | BLOQUEANTE |
| 3.10 | **Numeración automática** | ✅ Secuencial por día | ✅ Z-YYYYMMDD-XXXX | ✅ | Generación automática | CRÍTICO |
| 3.11 | **Historial de sesiones** | ✅ Consulta histórico | ✅ `GET /api/v1/cash/history` | ✅ | Con paginación | ALTO |
| 3.12 | **Impresión de reportes** | ✅ Impresora térmica | 🟡 Flag `printed` | 🟡 | Backend marca, falta impresión | ALTO |
| 3.13 | **Suspender/reabrir caja** | ✅ Estado suspendido | 🟡 `status='suspended'` | 🟡 | Campo existe, falta endpoints | MEDIO |
| 3.14 | **Frontend de caja** | ✅ Interfaz completa | ❌ No implementado | ❌ | UI pendiente completa | BLOQUEANTE |
| 3.15 | **Arqueo de caja visual** | ✅ Conteo por billete/moneda | ❌ No implementado | ❌ | UI de conteo físico | ALTO |

---

## 4️⃣ GESTIÓN DE PRODUCTOS (25% - 5/20)

### Tabla de Referencia: `sysmehotel.complementog`, `sysmehotel.tipo_comg`, `sysmehotel.complemento`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 4.1 | **CRUD de productos** | ✅ `complementog` | ✅ `/api/v1/products` | ✅ | Básico funcionando | CRÍTICO |
| 4.2 | **Categorías de productos** | ✅ `tipo_comg` | ✅ `/api/v1/categories` | ✅ | Con colores | CRÍTICO |
| 4.3 | **Precio base** | ✅ `complementog.precio` | ✅ `products.price` | ✅ | Precio principal | CRÍTICO |
| 4.4 | **Código de barras** | ✅ `complementog.codbarras` | ✅ `products.barcode` | ✅ | Lectura código | ALTO |
| 4.5 | **SKU único** | ✅ `complementog.codigo` | ✅ `products.sku` | ✅ | Identificador | ALTO |
| 4.6 | **📌 Complementos/Modificadores** | ✅ `complemento` tabla | ❌ NO IMPLEMENTADO | ❌ | **BLOQUEANTE** - 20-30% ingresos | BLOQUEANTE |
| 4.7 | **📌 Extras con precio** | ✅ Complementos pagos | ❌ NO IMPLEMENTADO | ❌ | "Extra queso +€2" | BLOQUEANTE |
| 4.8 | **📌 Modificadores sin precio** | ✅ "Sin cebolla" | ❌ NO IMPLEMENTADO | ❌ | Notas de cocina | CRÍTICO |
| 4.9 | **Control de stock** | ✅ Por almacén | 🟡 `products.stock` simple | 🟡 | Solo un almacén | ALTO |
| 4.10 | **Stock mínimo** | ✅ Alertas automáticas | 🟡 `products.min_stock` | 🟡 | Campo existe, sin alertas | ALTO |
| 4.11 | **Imágenes de productos** | ✅ `foto_complementog` | 🟡 `products.image_url` | 🟡 | URL solo, falta upload | MEDIO |
| 4.12 | **📌 Packs/Combos** | ✅ `pack` + `pack_hosteleria` | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Menús del día | CRÍTICO |
| 4.13 | **📌 Packs recursivos** | ✅ Pack dentro de pack | ❌ NO IMPLEMENTADO | ❌ | Combos complejos | ALTO |
| 4.14 | **Tiempo de preparación** | ✅ `complementog.tiempo_prep` | ✅ `products.preparation_time` | ✅ | Para cocina | MEDIO |
| 4.15 | **Tarifas por producto** | ✅ `comg_tarifa` | ❌ NO IMPLEMENTADO | ❌ | Precios dinámicos | ALTO |
| 4.16 | **Variaciones (talla/color)** | ✅ `variaciones` tabla | ❌ NO IMPLEMENTADO | ❌ | Para comercio | BAJO |
| 4.17 | **Impuestos por producto** | ✅ IVA 21%/10%/4% | 🟡 Tax rate global | 🟡 | Solo una tasa | ALTO |
| 4.18 | **Producto activo/inactivo** | ✅ `complementog.activo` | 🟡 `products.is_active` | 🟡 | Campo existe | MEDIO |
| 4.19 | **Orden de visualización** | ✅ `complementog.orden` | ❌ No implementado | ❌ | Para ordenar menú | BAJO |
| 4.20 | **Productos favoritos** | ✅ Marcado especial | ❌ No implementado | ❌ | Acceso rápido TPV | BAJO |

---

## 5️⃣ GESTIÓN DE MESAS (58% - 7/12)

### Tabla de Referencia: `sysmehotel.mesa`, `sysmehotel.salon`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 5.1 | **CRUD de mesas** | ✅ `mesa` tabla | ✅ `/api/v1/tables` | ✅ | Completo | CRÍTICO |
| 5.2 | **Salones/Áreas** | ✅ `salon` tabla | ✅ `/api/v1/salons` | ✅ | Múltiples salones | CRÍTICO |
| 5.3 | **Estados de mesa** | ✅ libre/ocupada/reservada | ✅ free/occupied/reserved/cleaning | ✅ | 4 estados | CRÍTICO |
| 5.4 | **Capacidad por mesa** | ✅ `mesa.personas` | ✅ `tables.max_capacity` | ✅ | Número comensales | ALTO |
| 5.5 | **📌 Tarifas por mesa** | ✅ `mesa.id_tarifa` | 🟡 `tables.tarifa_id` | 🟡 | Campo existe, falta lógica aplicar | ALTO |
| 5.6 | **Posición en mapa** | ✅ `mesa.posicionx/y` | ✅ `tables.position_x/y` | ✅ | Layout visual | ALTO |
| 5.7 | **Forma de mesa** | ✅ Cuadrada/redonda/rectangular | 🟡 `tables.shape` | 🟡 | Campo existe | BAJO |
| 5.8 | **Mesas combinables** | ✅ Juntar 2+ mesas | ❌ NO IMPLEMENTADO | ❌ | Mesa 1+2 | MEDIO |
| 5.9 | **Asignación de camarero** | ✅ Por mesa | 🟡 Via user_id en venta | 🟡 | Indirecto | MEDIO |
| 5.10 | **Tiempo de ocupación** | ✅ Timer automático | ❌ NO IMPLEMENTADO | ❌ | Desde ocupación | BAJO |
| 5.11 | **Reservas de mesa** | ✅ `reserva` tabla | ❌ NO IMPLEMENTADO | ❌ | Sistema de reservas | MEDIO |
| 5.12 | **Pre-asignación** | ✅ Pre-ticket en mesa | 🟡 `table_id` en sale | 🟡 | Funciona parcialmente | ALTO |

---

## 6️⃣ SISTEMA DE VENTAS (32% - 8/25)

### Tabla de Referencia: `sysmehotel.tiquet`, `sysmehotel.pretiquet`, `sysmehotel.ventadirecta`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 6.1 | **Crear venta/ticket** | ✅ `tiquet` | ✅ `POST /api/v1/sales` | ✅ | Funcional | CRÍTICO |
| 6.2 | **Agregar productos** | ✅ `pretiquet` | ✅ `sale_items` | ✅ | Items de venta | CRÍTICO |
| 6.3 | **Modificar cantidad** | ✅ UI cantidad | 🟡 API permite | 🟡 | Backend OK, falta UI | ALTO |
| 6.4 | **Notas por producto** | ✅ `pretiquet.nota` | 🟡 `sale_items.notes` | 🟡 | Campo existe, falta UI | ALTO |
| 6.5 | **Eliminar línea** | ✅ Con permisos | 🟡 API DELETE | 🟡 | Falta validar permisos | ALTO |
| 6.6 | **📌 Descuentos por línea** | ✅ `pretiquet.descuento` | ❌ NO IMPLEMENTADO | ❌ | Descuento individual | ALTO |
| 6.7 | **Descuento global** | ✅ `tiquet.descuento` | ✅ `sales.discount_amount` | ✅ | En venta completa | ALTO |
| 6.8 | **📌 Métodos de pago mixtos** | ✅ Varios métodos | 🟡 Un método | 🟡 | Solo payment_method único | CRÍTICO |
| 6.9 | **Cálculo de IVA** | ✅ Automático múltiples | ✅ `sales.tax_amount` | ✅ | Una tasa configurada | ALTO |
| 6.10 | **Numeración de tickets** | ✅ Secuencial por TPV | ✅ `sales.sale_number` | ✅ | Auto-generado | CRÍTICO |
| 6.11 | **Imprimir ticket** | ✅ Ticket térmico | 🟡 Flag `receipt_printed` | 🟡 | Backend marca, falta impresión | ALTO |
| 6.12 | **📌 Reimprimir ticket** | ✅ Desde historial | ❌ NO IMPLEMENTADO | ❌ | Reimpresión | MEDIO |
| 6.13 | **📌 Anular venta** | ✅ `tiquet.anulado` | 🟡 Status `cancelled` | 🟡 | Campo existe, falta proceso | CRÍTICO |
| 6.14 | **Venta a crédito** | ✅ Para clientes | ❌ NO IMPLEMENTADO | ❌ | payment_status pending | MEDIO |
| 6.15 | **📌 División de cuenta** | ✅ Dividir ticket | ❌ NO IMPLEMENTADO | ❌ | Dividir entre comensales | CRÍTICO |
| 6.16 | **📌 Aparcar venta** | ✅ Guardar borrador | 🟡 Status `pending` | 🟡 | Funcionalidad parcial | CRÍTICO |
| 6.17 | **Recuperar venta aparcada** | ✅ Listar borradores | 🟡 GET sales?status=pending | 🟡 | API existe, falta UI | ALTO |
| 6.18 | **Propina en venta** | ✅ Campo propina | ❌ NO IMPLEMENTADO | ❌ | Propina separada | MEDIO |
| 6.19 | **Cliente en venta** | ✅ `tiquet.cliente_id` | 🟡 `sales.customer_id` | 🟡 | Campo existe | ALTO |
| 6.20 | **Vendedor/Camarero** | ✅ `tiquet.usuario_id` | ✅ `sales.user_id` | ✅ | Asignado | ALTO |
| 6.21 | **Mesa en venta** | ✅ `tiquet.mesa_id` | ✅ `sales.table_id` | ✅ | Vinculado | ALTO |
| 6.22 | **Comentarios venta** | ✅ `tiquet.comentario` | 🟡 `sales.notes` | 🟡 | Campo existe | BAJO |
| 6.23 | **Cambio a devolver** | ✅ Cálculo automático | 🟡 Frontend solo | 🟡 | No persiste en BD | BAJO |
| 6.24 | **Ticket regalo** | ✅ Formato especial | ❌ NO IMPLEMENTADO | ❌ | Sin precios | BAJO |
| 6.25 | **Venta rápida sin mesa** | ✅ Barra/Takeaway | ✅ table_id NULL | ✅ | Funciona | ALTO |

---

## 7️⃣ PANEL DE COCINA (27% - 4/15)

### Tabla de Referencia: `sysmehotel.notacocina`, `sysmehotel.venta_cocina`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 7.1 | **Ver órdenes pendientes** | ✅ Panel real-time | 🟡 `kitchen_orders` | 🟡 | Tabla existe, UI básica | CRÍTICO |
| 7.2 | **Filtrar por estado** | ✅ Pendiente/Preparando/Listo | 🟡 Status field | 🟡 | Estados en BD, falta filtros UI | ALTO |
| 7.3 | **Marcar como preparando** | ✅ Cambio estado | ✅ `PUT /api/v1/kitchen/:id` | ✅ | Funcional | CRÍTICO |
| 7.4 | **Marcar como listo** | ✅ Cambio estado | ✅ Status `ready` | ✅ | Funcional | CRÍTICO |
| 7.5 | **📌 Bloques de cocina** | ✅ Entradas/Principales/Postres | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Timing cocina | CRÍTICO |
| 7.6 | **📌 Prioridad de órdenes** | ✅ Urgente/Normal | 🟡 `priority` field 1-3 | 🟡 | Campo existe, falta uso | ALTO |
| 7.7 | **Tiempo de preparación** | ✅ Timer visible | 🟡 `preparation_time` | 🟡 | Campo existe, falta timer UI | ALTO |
| 7.8 | **Notas especiales** | ✅ `notacocina` tabla | 🟡 `notes` field | 🟡 | Campo existe | ALTO |
| 7.9 | **Imprimir en cocina** | ✅ Impresora térmica cocina | 🟡 Flag `kitchen_printed` | 🟡 | Backend marca, falta impresión | ALTO |
| 7.10 | **📌 Notificación sonora** | ✅ Alarma nuevo pedido | ❌ NO IMPLEMENTADO | ❌ | WebSocket + audio | ALTO |
| 7.11 | **Agrupación por mesa** | ✅ Ver todos items mesa | ❌ NO IMPLEMENTADO | ❌ | Agrupar visualmente | MEDIO |
| 7.12 | **Número de comanda** | ✅ Numeración automática | 🟡 `order_number` | 🟡 | Campo existe | MEDIO |
| 7.13 | **Cancelar orden cocina** | ✅ Con permisos | ❌ NO IMPLEMENTADO | ❌ | Cancelación controlada | MEDIO |
| 7.14 | **Historial de órdenes** | ✅ Consulta histórico | ❌ NO IMPLEMENTADO | ❌ | Para estadísticas | BAJO |
| 7.15 | **Estadísticas de cocina** | ✅ Tiempos promedio | ❌ NO IMPLEMENTADO | ❌ | KPIs de cocina | BAJO |

---

## 8️⃣ INVENTARIO (11% - 2/18)

### Tabla de Referencia: `sysmehotel.almacen_complementg`, `sysmehotel.inventario`, `sysmehotel.traspasos`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 8.1 | **Control de stock básico** | ✅ `almacen_complementg` | ✅ `products.stock` | ✅ | Stock simple | CRÍTICO |
| 8.2 | **Stock actual** | ✅ En tiempo real | ✅ Campo numérico | ✅ | Por producto | CRÍTICO |
| 8.3 | **📌 Multi-almacén** | ✅ Cocina/Barra/Bodega | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Varios almacenes | BLOQUEANTE |
| 8.4 | **📌 Stock por almacén** | ✅ `almacen_complementg` | ❌ NO IMPLEMENTADO | ❌ | Stock por ubicación | BLOQUEANTE |
| 8.5 | **📌 Traspasos entre almacenes** | ✅ `traspasos` tabla | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Mover stock | BLOQUEANTE |
| 8.6 | **Inventario físico** | ✅ `inventario` tabla | ❌ NO IMPLEMENTADO | ❌ | Conteo físico | CRÍTICO |
| 8.7 | **Ajustes de inventario** | ✅ Ajustes manuales | 🟡 `inventory_movements` | 🟡 | Tabla existe, falta UI | ALTO |
| 8.8 | **📌 Entrada de mercancía** | ✅ Desde compras | ❌ NO IMPLEMENTADO | ❌ | Al recibir pedido | CRÍTICO |
| 8.9 | **Salida por venta** | ✅ Automático | 🟡 Parcial | 🟡 | Falta integración completa | ALTO |
| 8.10 | **Mermas/desperdicios** | ✅ `operaciones` type=merma | 🟡 Type `waste` | 🟡 | Campo existe, falta UI | ALTO |
| 8.11 | **Valoración de stock** | ✅ Costo * cantidad | ❌ NO IMPLEMENTADO | ❌ | Valor total inventario | MEDIO |
| 8.12 | **📌 Alertas stock mínimo** | ✅ Notificaciones automáticas | 🟡 `min_stock` | 🟡 | Campo existe, sin alertas | ALTO |
| 8.13 | **Historial movimientos** | ✅ Reporte completo | 🟡 `inventory_movements` | 🟡 | Tabla existe, falta UI | MEDIO |
| 8.14 | **Costo promedio** | ✅ FIFO/Promedio | ❌ NO IMPLEMENTADO | ❌ | Cálculo de costos | MEDIO |
| 8.15 | **Stock negativo permitido** | ✅ Configurable | ❌ NO IMPLEMENTADO | ❌ | Para ventas en negativo | BAJO |
| 8.16 | **Lote/Serie productos** | ✅ Trazabilidad | ❌ NO IMPLEMENTADO | ❌ | Control lotes | BAJO |
| 8.17 | **Fecha caducidad** | ✅ Control vencimientos | ❌ NO IMPLEMENTADO | ❌ | Alertas caducidad | BAJO |
| 8.18 | **Stock reservado** | ✅ Para pedidos | ❌ NO IMPLEMENTADO | ❌ | Stock comprometido | BAJO |

---

## 9️⃣ GESTIÓN DE CLIENTES (13% - 2/15)

### Tabla de Referencia: `sysmehotel.cliente`, `sysmehotel.cliente_cardex`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 9.1 | **Crear cliente** | ✅ `cliente` tabla | 🟡 `customers` básico | 🟡 | Tabla existe, pocos campos | ALTO |
| 9.2 | **Datos básicos** | ✅ Nombre, teléfono, email | 🟡 Campos parciales | 🟡 | Faltan campos | ALTO |
| 9.3 | **📌 Datos fiscales** | ✅ NIF/CIF, dirección fiscal | ❌ NO IMPLEMENTADO | ❌ | **Para facturación** | CRÍTICO |
| 9.4 | **Historial de compras** | ✅ `cliente_cardex` | 🟡 Via `sales` | 🟡 | Indirecto por customer_id | MEDIO |
| 9.5 | **Total gastado** | ✅ Acumulado lifetime | 🟡 `total_spent` | 🟡 | Campo existe, falta cálculo | MEDIO |
| 9.6 | **Número de visitas** | ✅ Contador | 🟡 `visit_count` | 🟡 | Campo existe, falta incremento | MEDIO |
| 9.7 | **Última visita** | ✅ Fecha | 🟡 `last_visit` | 🟡 | Campo existe, falta update | BAJO |
| 9.8 | **Preferencias/Alergias** | ✅ `cliente.preferencias` | 🟡 `preferences` JSON | 🟡 | Campo existe, falta UI | ALTO |
| 9.9 | **📌 Tarjetas de fidelización** | ✅ `cliente_tarjeta` | ❌ NO IMPLEMENTADO | ❌ | Puntos/descuentos | MEDIO |
| 9.10 | **📌 Descuentos por cliente** | ✅ Por tipo cliente VIP | ❌ NO IMPLEMENTADO | ❌ | Descuentos personalizados | MEDIO |
| 9.11 | **Tipo de cliente** | ✅ `tipo_cliente` | ❌ NO IMPLEMENTADO | ❌ | VIP, habitual, ocasional | MEDIO |
| 9.12 | **Límite de crédito** | ✅ Control crédito | ❌ NO IMPLEMENTADO | ❌ | Ventas a cuenta | MEDIO |
| 9.13 | **Saldo pendiente** | ✅ `eacuenta` | ❌ NO IMPLEMENTADO | ❌ | Deuda actual | MEDIO |
| 9.14 | **📌 Reservas de cliente** | ✅ Historial reservas | ❌ NO IMPLEMENTADO | ❌ | Sistema de reservas | MEDIO |
| 9.15 | **Notas internas** | ✅ Observaciones | 🟡 `notes` field | 🟡 | Campo existe | BAJO |

---

## 🔟 GESTIÓN DE PROVEEDORES (0% - 0/12)

### Tabla de Referencia: `sysmehotel.proveedor`, `sysmehotel.pedido`, `sysmehotel.albaran`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 10.1 | **📌 CRUD de proveedores** | ✅ `proveedor` tabla | ❌ NO IMPLEMENTADO | ❌ | **IMPORTANTE** - Maestro proveedores | ALTO |
| 10.2 | **Datos fiscales proveedor** | ✅ NIF, dirección | ❌ NO IMPLEMENTADO | ❌ | Para facturación | ALTO |
| 10.3 | **Datos de contacto** | ✅ Teléfono, email, web | ❌ NO IMPLEMENTADO | ❌ | Contacto | MEDIO |
| 10.4 | **📌 Crear orden de compra** | ✅ `pedido` tabla | ❌ NO IMPLEMENTADO | ❌ | Pedidos a proveedores | CRÍTICO |
| 10.5 | **Líneas de pedido** | ✅ `ped_comg` | ❌ NO IMPLEMENTADO | ❌ | Detalle pedido | CRÍTICO |
| 10.6 | **📌 Recepción de mercancía** | ✅ `albaran` tabla | ❌ NO IMPLEMENTADO | ❌ | Albaranes | CRÍTICO |
| 10.7 | **Comparar pedido vs recibido** | ✅ Control cantidades | ❌ NO IMPLEMENTADO | ❌ | Validación | ALTO |
| 10.8 | **Facturas de compra** | ✅ `pfactura` | ❌ NO IMPLEMENTADO | ❌ | Facturas proveedores | ALTO |
| 10.9 | **Cuentas por pagar** | ✅ `pproveedor` | ❌ NO IMPLEMENTADO | ❌ | Deudas con proveedores | ALTO |
| 10.10 | **Historial de compras** | ✅ Por proveedor | ❌ NO IMPLEMENTADO | ❌ | Compras históricas | MEDIO |
| 10.11 | **Presupuestos** | ✅ `presupuesto` | ❌ NO IMPLEMENTADO | ❌ | Presupuestos compra | MEDIO |
| 10.12 | **Productos por proveedor** | ✅ Relación | ❌ NO IMPLEMENTADO | ❌ | Catálogo proveedor | MEDIO |

---

## 1️⃣1️⃣ FACTURACIÓN LEGAL (6% - 1/18)

### Tabla de Referencia: `sysmehotel.factura`, `sysmehotel.serie`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 11.1 | **📌 Generar factura** | ✅ `factura` tabla | ❌ NO IMPLEMENTADO | ❌ | **BLOQUEANTE LEGAL** | BLOQUEANTE |
| 11.2 | **📌 Series de facturación** | ✅ `serie` tabla | ❌ NO IMPLEMENTADO | ❌ | A, B, etc | BLOQUEANTE |
| 11.3 | **📌 Numeración secuencial** | ✅ Por serie | ❌ NO IMPLEMENTADO | ❌ | Legal requirement | BLOQUEANTE |
| 11.4 | **Datos fiscales empresa** | ✅ Completos | 🟡 `settings` parcial | 🟡 | Falta datos completos | CRÍTICO |
| 11.5 | **Datos fiscales cliente** | ✅ NIF, dirección | ❌ NO IMPLEMENTADO | ❌ | Obligatorio factura | CRÍTICO |
| 11.6 | **📌 Desglose de IVA** | ✅ 21%, 10%, 4% | ❌ NO IMPLEMENTADO | ❌ | Por tipo de IVA | BLOQUEANTE |
| 11.7 | **Base imponible** | ✅ Cálculo automático | ❌ NO IMPLEMENTADO | ❌ | Sin IVA | CRÍTICO |
| 11.8 | **Cuota IVA** | ✅ Por tipo | ❌ NO IMPLEMENTADO | ❌ | Cálculo por tasa | CRÍTICO |
| 11.9 | **Total factura** | ✅ Base + IVA | ❌ NO IMPLEMENTADO | ❌ | Total con impuestos | CRÍTICO |
| 11.10 | **Rectificativas** | ✅ Facturas negativas | ❌ NO IMPLEMENTADO | ❌ | Anulaciones legales | ALTO |
| 11.11 | **📌 Libro de facturas** | ✅ Registro legal | ❌ NO IMPLEMENTADO | ❌ | Legal requirement | BLOQUEANTE |
| 11.12 | **Imprimir factura legal** | ✅ Formato legal | ❌ NO IMPLEMENTADO | ❌ | Con todos los datos | CRÍTICO |
| 11.13 | **Envío por email** | ✅ PDF adjunto | ❌ NO IMPLEMENTADO | ❌ | Email factura | MEDIO |
| 11.14 | **Factura simplificada** | ✅ < 400€ | ❌ NO IMPLEMENTADO | ❌ | Sin datos cliente | MEDIO |
| 11.15 | **Exportar a contabilidad** | ✅ Formato estándar | ❌ NO IMPLEMENTADO | ❌ | CSV/Excel | MEDIO |
| 11.16 | **Retención IRPF** | ✅ Profesionales | ❌ NO IMPLEMENTADO | ❌ | Para facturas especiales | BAJO |
| 11.17 | **Régimen especial** | ✅ Recargo equivalencia | ❌ NO IMPLEMENTADO | ❌ | Para comercio minorista | BAJO |
| 11.18 | **Validación NIF** | ✅ Formato y checksum | ✅ Básica | ✅ | Validación simple | MEDIO |

---

## 1️⃣2️⃣ REPORTES Y ANALÍTICAS (15% - 3/20)

### Tabla de Referencia: Sistema de informes FastReport

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 12.1 | **Reporte de ventas diarias** | ✅ Completo | 🟡 `/api/v1/reports` | 🟡 | Endpoint básico | ALTO |
| 12.2 | **Reporte Z fiscal** | ✅ `registroz` | ✅ `z_reports` | ✅ | **IMPLEMENTADO** | BLOQUEANTE |
| 12.3 | **Ventas por período** | ✅ Rango fechas | 🟡 Query param | 🟡 | Backend OK, falta UI | ALTO |
| 12.4 | **Ventas por producto** | ✅ Top productos | ❌ NO IMPLEMENTADO | ❌ | Ranking ventas | ALTO |
| 12.5 | **Ventas por camarero** | ✅ Por empleado | ❌ NO IMPLEMENTADO | ❌ | Comisiones | ALTO |
| 12.6 | **Ventas por mesa/salón** | ✅ Por ubicación | ❌ NO IMPLEMENTADO | ❌ | Análisis zonas | MEDIO |
| 12.7 | **Comparativa períodos** | ✅ Mes vs mes | ❌ NO IMPLEMENTADO | ❌ | Tendencias | MEDIO |
| 12.8 | **Ticket promedio** | ✅ AVG ventas | ❌ NO IMPLEMENTADO | ❌ | KPI importante | ALTO |
| 12.9 | **Productos más vendidos** | ✅ Top 10 | ❌ NO IMPLEMENTADO | ❌ | Ranking | MEDIO |
| 12.10 | **Horas pico** | ✅ Análisis horario | ❌ NO IMPLEMENTADO | ❌ | Gráficos | MEDIO |
| 12.11 | **Inventario valorado** | ✅ Stock * Costo | ❌ NO IMPLEMENTADO | ❌ | Valor actual stock | MEDIO |
| 12.12 | **Margen de beneficio** | ✅ Por producto | ❌ NO IMPLEMENTADO | ❌ | Rentabilidad | MEDIO |
| 12.13 | **Cuentas por cobrar** | ✅ Clientes | ❌ NO IMPLEMENTADO | ❌ | Créditos pendientes | MEDIO |
| 12.14 | **Cuentas por pagar** | ✅ Proveedores | ❌ NO IMPLEMENTADO | ❌ | Deudas | MEDIO |
| 12.15 | **Exportar a Excel** | ✅ Todos reportes | ❌ NO IMPLEMENTADO | ❌ | Exportación | MEDIO |
| 12.16 | **Gráficos visuales** | ✅ Charts | 🟡 Biblioteca incluida | 🟡 | Chart.js disponible | MEDIO |
| 12.17 | **Ventas por forma de pago** | ✅ Desglose | ❌ NO IMPLEMENTADO | ❌ | Efectivo vs tarjeta | ALTO |
| 12.18 | **Cierre de turno** | ✅ Por camarero | ❌ NO IMPLEMENTADO | ❌ | Liquidación turno | ALTO |
| 12.19 | **ABC de productos** | ✅ Clasificación | ❌ NO IMPLEMENTADO | ❌ | Pareto 80/20 | BAJO |
| 12.20 | **Dashboard en tiempo real** | ✅ Monitor vivo | 🟡 Datos disponibles | 🟡 | Falta UI dashboard | ALTO |

---

## 1️⃣3️⃣ CONFIGURACIÓN DEL SISTEMA (33% - 5/15)

### Tabla de Referencia: `sysme.configuracion`, `sysmehotel.impresoras`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 13.1 | **Datos de empresa** | ✅ `sysme.empresa` | ✅ `settings` | ✅ | Nombre, dirección, NIF | CRÍTICO |
| 13.2 | **Logo empresa** | ✅ Imagen | 🟡 `logo_url` | 🟡 | Campo existe, falta upload | MEDIO |
| 13.3 | **Configuración de IVA** | ✅ Múltiples tasas | 🟡 `tax_rate` setting | 🟡 | Solo una tasa | ALTO |
| 13.4 | **Moneda del sistema** | ✅ EUR, USD, etc | ✅ `currency` setting | ✅ | Configurado | ALTO |
| 13.5 | **📌 Configuración impresoras** | ✅ `impresoras` tabla | ❌ NO IMPLEMENTADO | ❌ | Tickets, cocina, facturas | ALTO |
| 13.6 | **Formatos de impresión** | ✅ Personalizable | 🟡 Templates | 🟡 | Falta personalización | MEDIO |
| 13.7 | **Pie de ticket** | ✅ Texto personalizado | ✅ `receipt_footer` | ✅ | Mensaje final | MEDIO |
| 13.8 | **Series de facturación** | ✅ Configurar series | ❌ NO IMPLEMENTADO | ❌ | A, B, C | ALTO |
| 13.9 | **Métodos de pago** | ✅ `formaspago` | 🟡 `payment_methods` | 🟡 | Tabla existe, falta config UI | ALTO |
| 13.10 | **📌 Backup automático** | ✅ Diario configurado | ❌ NO IMPLEMENTADO | ❌ | Copias de seguridad | CRÍTICO |
| 13.11 | **Idioma del sistema** | ✅ ES/EN/FR | 🟡 i18n parcial | 🟡 | Solo español | MEDIO |
| 13.12 | **Formato de fecha** | ✅ DD/MM/YYYY | ✅ Configurable | ✅ | En settings | BAJO |
| 13.13 | **Zona horaria** | ✅ Configurable | 🟡 Servidor | 🟡 | No configurable | BAJO |
| 13.14 | **Decimales en precios** | ✅ 0-4 decimales | 🟡 2 decimales fijo | 🟡 | Hardcoded | BAJO |
| 13.15 | **Separador de miles** | ✅ . o , | 🟡 Frontend solo | 🟡 | No persiste | BAJO |

---

## 1️⃣4️⃣ INTEGRACIONES Y EXTRAS (0% - 0/8)

### Tabla de Referencia: `sysmehotel.opencart`, `sysmehotel.bitcoin`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas | Prioridad |
|---|--------------|-----------------|---------------|--------|-------|-----------|
| 14.1 | **Integración OpenCart** | ✅ `opencart` tabla | ❌ NO IMPLEMENTADO | ❌ | E-commerce | BAJO |
| 14.2 | **Pagos con Bitcoin** | ✅ `bitcoin` tabla | ❌ NO IMPLEMENTADO | ❌ | Cripto pagos | BAJO |
| 14.3 | **Envío de SMS** | ✅ `smsenvio` tabla | ❌ NO IMPLEMENTADO | ❌ | Notificaciones SMS | BAJO |
| 14.4 | **Email marketing** | ✅ `e_mail` tabla | ❌ NO IMPLEMENTADO | ❌ | Campañas email | BAJO |
| 14.5 | **Pasarela de pago** | ✅ TPV virtual | ❌ NO IMPLEMENTADO | ❌ | Tarjetas online | MEDIO |
| 14.6 | **Delivery/Domicilio** | ✅ Gestión delivery | ❌ NO IMPLEMENTADO | ❌ | Entregas a domicilio | MEDIO |
| 14.7 | **Reservas online** | ✅ `reservahora` | ❌ NO IMPLEMENTADO | ❌ | Web de reservas | MEDIO |
| 14.8 | **API pública** | ❌ No tiene | ❌ NO IMPLEMENTADO | ❌ | Para integraciones | BAJO |

---

## 🚨 FUNCIONALIDADES BLOQUEANTES PARA PRODUCCIÓN

### Impiden uso en restaurantes reales

| # | Funcionalidad | Estado | Impacto | Tiempo Estimado |
|---|--------------|--------|---------|-----------------|
| 1 | **Frontend Sistema de Caja** | ❌ 0% | Sin UI no se puede usar | 2 semanas |
| 2 | **Complementos de Productos** | ❌ 0% | Pérdida 20-30% ingresos | 1-2 semanas |
| 3 | **Facturación Legal** | ❌ 6% | Requisito legal obligatorio | 2-3 semanas |
| 4 | **Multi-almacén** | ❌ 0% | Control stock incorrecto | 1-2 semanas |
| 5 | **Gestión de Proveedores** | ❌ 0% | Sin control de compras | 2 semanas |
| 6 | **Bloques de Cocina** | ❌ 0% | Timing de cocina erróneo | 1 semana |
| 7 | **División de Cuenta** | ❌ 0% | Común en restaurantes | 1 semana |
| 8 | **Métodos Pago Mixtos** | ❌ 0% | Pago efectivo+tarjeta | 3-5 días |
| 9 | **Anulación de Ventas** | 🟡 50% | Proceso incompleto | 3-5 días |
| 10 | **Impresión Real** | ❌ 0% | Tickets y cocina | 1 semana |

**Total tiempo estimado:** 12-16 semanas (3-4 meses)

---

## 📋 PLAN DE ACCIÓN PARA 100% EQUIVALENCIA

### FASE 1: BLOQUEANTES INMEDIATOS (4 semanas)

#### Semana 1-2: Frontend Sistema de Caja + Complementos
- [ ] Pantalla apertura caja
- [ ] Panel control caja en tiempo real
- [ ] Pantalla cierre con conteo
- [ ] Visualizador Reporte Z
- [ ] Tabla `product_modifiers`
- [ ] Tabla `product_extras`
- [ ] UI selección complementos en POS

#### Semana 3-4: Facturación Legal + Multi-almacén Base
- [ ] Tabla `invoices` con campos legales
- [ ] Tabla `invoice_series`
- [ ] Desglose IVA múltiple
- [ ] Template factura legal
- [ ] Tabla `warehouses`
- [ ] Tabla `warehouse_stock`
- [ ] Traspasos básicos

### FASE 2: FUNCIONALIDADES CRÍTICAS (6 semanas)

#### Semana 5-6: Packs/Combos + Bloques Cocina
- [ ] Tabla `product_packs`
- [ ] Recursividad en packs
- [ ] Descuento automático stock
- [ ] Bloques de cocina (Entradas/Principales/Postres)
- [ ] Prioridades en cocina

#### Semana 7-8: División de Cuenta + Métodos Pago Mixtos
- [ ] Dividir ticket entre comensales
- [ ] Múltiples formas de pago en una venta
- [ ] Tabla `sale_payments`
- [ ] Anulación completa de ventas

#### Semana 9-10: Gestión de Proveedores
- [ ] CRUD proveedores
- [ ] Órdenes de compra
- [ ] Recepción mercancía
- [ ] Cuentas por pagar

### FASE 3: COMPLETAR FUNCIONALIDADES (6 semanas)

#### Semana 11-12: Clientes Completo + Reportes
- [ ] Datos fiscales clientes
- [ ] Tarjetas fidelización
- [ ] Descuentos personalizados
- [ ] 15 reportes esenciales

#### Semana 13-14: Impresión Real + Configuración
- [ ] Impresoras térmicas
- [ ] Templates personalización
- [ ] Backup automático
- [ ] Multi-idioma completo

#### Semana 15-16: Pulido y Testing Final
- [ ] Tests automatizados
- [ ] Migración de datos
- [ ] Capacitación
- [ ] Piloto en 1 restaurante

---

## ✅ CRITERIOS DE ACEPTACIÓN PARA PRODUCCIÓN

### Requisitos Mínimos (80% funcionalidad)

1. ✅ **Sistema de Caja** - 100% funcional (backend + frontend)
2. ❌ **Complementos** - Modificadores y extras operativos
3. ❌ **Facturación** - Facturas legales con series
4. ❌ **Multi-almacén** - Mínimo 3 almacenes
5. ❌ **Packs** - Combos simples y recursivos
6. ❌ **Proveedores** - Gestión básica de compras
7. ❌ **Reportes** - Mínimo 10 reportes esenciales
8. ❌ **Impresión** - Tickets y cocina funcionando
9. ❌ **Panel Cocina** - Bloques y prioridades
10. ❌ **División Cuenta** - Dividir entre comensales

### Requisitos Deseables (100% funcionalidad)

- Todas las 220 funcionalidades listadas
- Documentación completa
- Tests automatizados 80%+ cobertura
- Migración de datos validada
- 2 semanas piloto exitoso

---

## 📊 TRACKING DE PROGRESO

**Última actualización:** 2025-10-26
**Progreso total:** 28% (61/220)
**Próxima revisión:** Semanal

**Meta:** 100% equivalencia funcional
**Tiempo estimado:** 16 semanas (4 meses)
**Fecha objetivo:** 2026-02-26

---

**Nota:** Este checklist se actualizará semanalmente conforme se implementen funcionalidades.

📌 **BLOQUEANTE** = Impide uso en producción
🔥 **CRÍTICO** = Muy importante para operación
⚡ **ALTO** = Importante para funcionalidad completa
🔸 **MEDIO** = Mejora significativa
🔹 **BAJO** = Nice to have
