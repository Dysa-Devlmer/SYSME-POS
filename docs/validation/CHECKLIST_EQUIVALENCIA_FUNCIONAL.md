# ✅ Checklist de Equivalencia Funcional
## Sistema Antiguo vs Sistema Nuevo SYSME 2.0

**Fecha de análisis:** 2025-10-25
**Sistema Antiguo:** E:\POS SYSME\Sysme_Principal\SYSME (Delphi + PHP + MySQL)
**Sistema Nuevo:** E:\POS SYSME\SYSME (Node.js + React + SQLite/MySQL)

---

## 📊 Resumen Ejecutivo

| Categoría | Total Items | ✅ Implementado | 🟡 Parcial | ❌ Faltante | % Completado |
|-----------|-------------|----------------|-----------|-------------|--------------|
| **Gestión de Usuarios** | 8 | 6 | 2 | 0 | 75% |
| **Sistema de Caja** | 10 | 8 | 2 | 0 | 80% |
| **Gestión de Productos** | 12 | 5 | 3 | 4 | 42% |
| **Gestión de Mesas** | 8 | 6 | 2 | 0 | 75% |
| **Sistema de Ventas** | 15 | 7 | 5 | 3 | 47% |
| **Panel de Cocina** | 10 | 3 | 3 | 4 | 30% |
| **Inventario** | 12 | 2 | 3 | 7 | 17% |
| **Clientes** | 10 | 2 | 3 | 5 | 20% |
| **Proveedores** | 8 | 0 | 0 | 8 | 0% |
| **Facturación** | 12 | 1 | 1 | 10 | 8% |
| **Reportes** | 15 | 2 | 2 | 11 | 13% |
| **Configuración** | 10 | 4 | 3 | 3 | 40% |
| **TOTAL** | **130** | **46** | **29** | **55** | **35%** |

---

## 🔐 1. GESTIÓN DE USUARIOS (75%)

### Tabla de Referencia: `sysme.usuario`, `sysme.camareros`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 1.1 | Crear usuario con roles | ✅ `usuario` tabla | ✅ `/api/v1/users` | ✅ | Roles: admin, manager, cashier, waiter, kitchen |
| 1.2 | Login con usuario/contraseña | ✅ Login form | ✅ JWT Auth | ✅ | Más seguro con JWT |
| 1.3 | Login con PIN de 4 dígitos | ✅ `camareros.clavecamarero` | ✅ `users.pin_code` | ✅ | Para cajeros/camareros |
| 1.4 | Asignación de TPV | ✅ `camareros.tpv` | ✅ `users.assigned_tpv` | ✅ | TPV asignado |
| 1.5 | Asignación de almacén | ✅ `camareros.almacen` | ✅ `users.assigned_almacen` | ✅ | Almacén asignado |
| 1.6 | Permisos granulares | ✅ `camareros` permisos | 🟡 `users.permissions` | 🟡 | JSON implementado, faltan checks |
| 1.7 | Grupos de usuarios | ✅ `sysme.grupo`, `usu_gru` | 🟡 No implementado | 🟡 | Pendiente sistema de grupos |
| 1.8 | Privilegios por módulo | ✅ `privilegios_a`, `privilegios_e` | ❌ No implementado | ❌ | Falta sistema de privilegios detallado |

---

## 💰 2. SISTEMA DE CAJA (80%)

### Tabla de Referencia: `sysmehotel.apcajas`, `sysmehotel.cajas`, `sysmehotel.registroz`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 2.1 | Apertura de caja | ✅ `apcajas` tabla | ✅ `POST /api/v1/cash/open` | ✅ | Con saldo inicial |
| 2.2 | Cierre de caja | ✅ Proceso de cierre | ✅ `POST /api/v1/cash/close` | ✅ | Con cálculo de diferencias |
| 2.3 | Registro de ventas en caja | ✅ Automático | ✅ `POST /api/v1/cash/record-sale` | ✅ | Integrado con ventas |
| 2.4 | Movimientos de entrada | ✅ `cajas` tabla | ✅ `cash_movements` type='in' | ✅ | Ingresos adicionales |
| 2.5 | Movimientos de salida | ✅ `cajas` tabla | ✅ `cash_movements` type='out' | ✅ | Retiros/gastos |
| 2.6 | Tracking por método de pago | ✅ Efectivo/Tarjeta | ✅ cash/card/other | ✅ | Total_cash, total_card, total_other |
| 2.7 | Reporte Z fiscal | ✅ `registroz` tabla | ✅ `POST /api/v1/cash/z-report` | ✅ | Con numeración automática |
| 2.8 | Historial de sesiones | ✅ Consultas | ✅ `GET /api/v1/cash/history` | ✅ | Con paginación |
| 2.9 | Impresión de reportes | ✅ FastReport | 🟡 Marca como impreso | 🟡 | Backend listo, falta impresión real |
| 2.10 | Suspender/reabrir caja | ✅ Estado suspendido | 🟡 Status en BD | 🟡 | Campo existe, falta implementar lógica |

---

## 🍕 3. GESTIÓN DE PRODUCTOS (42%)

### Tabla de Referencia: `sysmehotel.complementog`, `sysmehotel.tipo_comg`, `sysmehotel.complemento`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 3.1 | CRUD de productos | ✅ `complementog` | ✅ `/api/v1/products` | ✅ | Básico implementado |
| 3.2 | Categorías de productos | ✅ `tipo_comg` | ✅ `/api/v1/categories` | ✅ | Con colores |
| 3.3 | Precios por producto | ✅ `complementog.precio` | ✅ `products.price` | ✅ | Precio base |
| 3.4 | **Complementos/Modificadores** | ✅ `complemento` tabla | ❌ NO IMPLEMENTADO | ❌ | **BLOQUEANTE** - 20-30% ingresos |
| 3.5 | **Extras pagos** | ✅ Complementos con precio | ❌ NO IMPLEMENTADO | ❌ | **BLOQUEANTE** - Extra queso, etc |
| 3.6 | Código de barras | ✅ `complementog.codbarras` | ✅ `products.barcode` | ✅ | Lectura de código |
| 3.7 | SKU único | ✅ `complementog.codigo` | ✅ `products.sku` | ✅ | Identificador único |
| 3.8 | Control de stock | ✅ `almacen_complementg` | 🟡 `products.stock` | 🟡 | Solo un almacén, falta multi |
| 3.9 | Stock mínimo | ✅ Alertas | ✅ `products.min_stock` | ✅ | Campo existe |
| 3.10 | Imágenes de productos | ✅ `foto_complementog` | 🟡 `products.image_url` | 🟡 | URL, falta upload |
| 3.11 | **Packs/Combos** | ✅ `pack`, `pack_hosteleria` | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Menús del día |
| 3.12 | Tiempo de preparación | ✅ `complementog.tiempo_prep` | ✅ `products.preparation_time` | ✅ | Para cocina |

---

## 🪑 4. GESTIÓN DE MESAS (75%)

### Tabla de Referencia: `sysmehotel.mesa`, `sysmehotel.salon`, `sysmehotel.tarifa`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 4.1 | CRUD de mesas | ✅ `mesa` tabla | ✅ `tables` tabla | ✅ | Con número y descripción |
| 4.2 | Salones/Áreas | ✅ `salon` tabla | ✅ `salons` tabla | ✅ | Salón Principal, Terraza, etc |
| 4.3 | Estados de mesa | ✅ libre/ocupada/reservada | ✅ free/occupied/reserved | ✅ | 4 estados |
| 4.4 | Capacidad por mesa | ✅ `mesa.personas` | ✅ `tables.max_capacity` | ✅ | Número de comensales |
| 4.5 | **Tarifas por mesa** | ✅ `mesa.id_tarifa` | 🟡 `tables.tarifa_id` | 🟡 | **Campo existe, falta lógica** |
| 4.6 | Posición en mapa visual | ✅ `mesa.posicionx/y` | ✅ `tables.position_x/y` | ✅ | Para layout visual |
| 4.7 | Mesas combinables | ✅ Función de combinar | ❌ NO IMPLEMENTADO | ❌ | Juntar mesas 1+2 |
| 4.8 | Asignación de camarero | ✅ Por mesa | 🟡 Via venta | 🟡 | Indirecto por user_id en venta |

---

## 💵 5. SISTEMA DE VENTAS (47%)

### Tabla de Referencia: `sysmehotel.tiquet`, `sysmehotel.pretiquet`, `sysmehotel.ventadirecta`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 5.1 | Crear venta/ticket | ✅ `tiquet` tabla | ✅ `/api/v1/sales` | ✅ | POST /sales |
| 5.2 | Agregar productos a venta | ✅ `pretiquet` | ✅ `sale_items` | ✅ | Items de venta |
| 5.3 | Modificar cantidad | ✅ UI | 🟡 API permite | 🟡 | Backend listo, falta UI |
| 5.4 | **Agregar nota a producto** | ✅ `pretiquet.nota` | 🟡 `sale_items.notes` | 🟡 | Campo existe, falta UI |
| 5.5 | Eliminar línea | ✅ Con permisos | 🟡 API DELETE | 🟡 | Falta validar permisos |
| 5.6 | Descuentos por línea | ✅ `pretiquet.descuento` | ❌ NO IMPLEMENTADO | ❌ | Descuento individual |
| 5.7 | Descuento global | ✅ `tiquet.descuento` | ✅ `sales.discount_amount` | ✅ | En venta completa |
| 5.8 | **Métodos de pago mixtos** | ✅ Varios métodos | 🟡 Un método | 🟡 | Solo un payment_method, falta split |
| 5.9 | Cálculo de IVA | ✅ Automático | ✅ `sales.tax_amount` | ✅ | Según settings |
| 5.10 | Numeración de tickets | ✅ Secuencial | ✅ `sales.sale_number` | ✅ | Auto-generado |
| 5.11 | Imprimir ticket | ✅ Ticket térmico | 🟡 Flag `receipt_printed` | 🟡 | Backend marca, falta impresión |
| 5.12 | Reimprimir ticket | ✅ Desde historial | ❌ NO IMPLEMENTADO | ❌ | Falta endpoint/UI |
| 5.13 | Anular venta | ✅ `tiquet.anulado` | 🟡 Status cancelled | 🟡 | Campo existe, falta proceso |
| 5.14 | Venta a crédito | ✅ Para clientes | ❌ NO IMPLEMENTADO | ❌ | Payment_status pending |
| 5.15 | **División de cuenta** | ✅ Dividir ticket | ❌ NO IMPLEMENTADO | ❌ | Dividir entre comensales |

---

## 👨‍🍳 6. PANEL DE COCINA (30%)

### Tabla de Referencia: `sysmehotel.notacocina`, `sysmehotel.venta_cocina`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 6.1 | Ver órdenes pendientes | ✅ Panel en tiempo real | 🟡 `kitchen_orders` | 🟡 | Tabla existe, falta UI completa |
| 6.2 | Filtrar por estado | ✅ Pendiente/Preparando | 🟡 Status field | 🟡 | Estados en BD, falta filtros |
| 6.3 | Marcar como preparando | ✅ Cambio de estado | ✅ API update | ✅ | PUT /kitchen/:id |
| 6.4 | Marcar como listo | ✅ Cambio de estado | ✅ API update | ✅ | Status 'ready' |
| 6.5 | **Bloques de cocina** | ✅ Entrantes/Principales/Postres | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Timing de cocina |
| 6.6 | **Prioridad de órdenes** | ✅ Urgente/Normal | 🟡 Priority field | 🟡 | Campo existe (1-3), falta uso |
| 6.7 | Tiempo de preparación | ✅ Timer | 🟡 `preparation_time` | 🟡 | Campo existe, falta timer |
| 6.8 | Notas especiales | ✅ `notacocina` tabla | 🟡 `notes` field | 🟡 | Campo existe |
| 6.9 | Imprimir en cocina | ✅ Impresora térmica | 🟡 Flag `kitchen_printed` | 🟡 | Backend marca, falta impresión |
| 6.10 | Notificación sonora | ✅ Alarma | ❌ NO IMPLEMENTADO | ❌ | Falta WebSocket + audio |

---

## 📦 7. INVENTARIO (17%)

### Tabla de Referencia: `sysmehotel.almacen_complementg`, `sysmehotel.inventario`, `sysmehotel.traspasos`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 7.1 | Control de stock básico | ✅ `almacen_complementg` | ✅ `products.stock` | ✅ | Stock simple |
| 7.2 | **Multi-almacén** | ✅ Varios almacenes | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Cocina/Barra/Bodega |
| 7.3 | **Traspasos entre almacenes** | ✅ `traspasos` tabla | ❌ NO IMPLEMENTADO | ❌ | **CRÍTICO** - Mover stock |
| 7.4 | Inventario físico | ✅ `inventario` tabla | ❌ NO IMPLEMENTADO | ❌ | Conteo físico |
| 7.5 | Ajustes de inventario | ✅ Movimientos | 🟡 `inventory_movements` | 🟡 | Tabla existe, falta UI |
| 7.6 | **Entrada de mercancía** | ✅ Desde compras | ❌ NO IMPLEMENTADO | ❌ | Al recibir pedido |
| 7.7 | Salida por venta | ✅ Automático | 🟡 Parcial | 🟡 | Falta integración completa |
| 7.8 | Mermas/desperdicios | ✅ Tipo de movimiento | 🟡 Type 'waste' | 🟡 | Campo existe, falta UI |
| 7.9 | Valoración de stock | ✅ Costo * cantidad | ❌ NO IMPLEMENTADO | ❌ | Valor total inventario |
| 7.10 | **Alertas stock mínimo** | ✅ Notificaciones | 🟡 `min_stock` | 🟡 | Campo existe, falta alertas |
| 7.11 | Historial de movimientos | ✅ Reporte | 🟡 `inventory_movements` | 🟡 | Tabla existe, falta reporte |
| 7.12 | Costo promedio | ✅ FIFO/Promedio | ❌ NO IMPLEMENTADO | ❌ | Cálculo de costos |

---

## 👥 8. GESTIÓN DE CLIENTES (20%)

### Tabla de Referencia: `sysmehotel.cliente`, `sysmehotel.cliente_cardex`, `sysmehotel.cliente_tarjeta`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 8.1 | Crear cliente | ✅ `cliente` tabla | 🟡 `customers` básico | 🟡 | Tabla existe, pocos campos |
| 8.2 | Datos fiscales | ✅ NIF/CIF, dirección | ❌ NO IMPLEMENTADO | ❌ | Para facturación |
| 8.3 | Historial de compras | ✅ `cliente_cardex` | 🟡 Via `sales` | 🟡 | Indirecto por customer_id |
| 8.4 | Total gastado | ✅ Acumulado | 🟡 `total_spent` | 🟡 | Campo existe, falta cálculo |
| 8.5 | Número de visitas | ✅ Contador | 🟡 `visit_count` | 🟡 | Campo existe, falta incremento |
| 8.6 | Última visita | ✅ Fecha | 🟡 `last_visit` | 🟡 | Campo existe, falta update |
| 8.7 | Preferencias/Alergias | ✅ `cliente.preferencias` | 🟡 `preferences` JSON | 🟡 | Campo existe, falta UI |
| 8.8 | Tarjetas de fidelización | ✅ `cliente_tarjeta` | ❌ NO IMPLEMENTADO | ❌ | Puntos/descuentos |
| 8.9 | Descuentos por cliente | ✅ Por tipo cliente | ❌ NO IMPLEMENTADO | ❌ | VIP, habitual, etc |
| 8.10 | Reservas de cliente | ✅ Historial reservas | ❌ NO IMPLEMENTADO | ❌ | Sistema de reservas |

---

## 🏭 9. GESTIÓN DE PROVEEDORES (0%)

### Tabla de Referencia: `sysmehotel.proveedor`, `sysmehotel.pedido`, `sysmehotel.albaran`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 9.1 | CRUD de proveedores | ✅ `proveedor` tabla | ❌ NO IMPLEMENTADO | ❌ | **IMPORTANTE** |
| 9.2 | Datos fiscales proveedor | ✅ NIF, dirección | ❌ NO IMPLEMENTADO | ❌ | Para facturación |
| 9.3 | Crear orden de compra | ✅ `pedido` tabla | ❌ NO IMPLEMENTADO | ❌ | Pedidos a proveedores |
| 9.4 | Recepción de mercancía | ✅ `albaran` tabla | ❌ NO IMPLEMENTADO | ❌ | Albaranes |
| 9.5 | Comparar pedido vs recibido | ✅ Control | ❌ NO IMPLEMENTADO | ❌ | Validación cantidades |
| 9.6 | Facturas de compra | ✅ `pfactura` | ❌ NO IMPLEMENTADO | ❌ | Facturas proveedores |
| 9.7 | Cuentas por pagar | ✅ `pproveedor` | ❌ NO IMPLEMENTADO | ❌ | Deudas con proveedores |
| 9.8 | Historial de compras | ✅ Por proveedor | ❌ NO IMPLEMENTADO | ❌ | Compras históricas |

---

## 📄 10. FACTURACIÓN LEGAL (8%)

### Tabla de Referencia: `sysmehotel.factura`, `sysmehotel.serie`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 10.1 | Generar factura | ✅ `factura` tabla | ❌ NO IMPLEMENTADO | ❌ | **BLOQUEANTE LEGAL** |
| 10.2 | Series de facturación | ✅ `serie` tabla | ❌ NO IMPLEMENTADO | ❌ | A, B, etc |
| 10.3 | Numeración secuencial | ✅ Por serie | ❌ NO IMPLEMENTADO | ❌ | Legal requirement |
| 10.4 | Datos fiscales obligatorios | ✅ Empresa + Cliente | 🟡 Parcial | 🟡 | Falta datos completos |
| 10.5 | Desglose de IVA | ✅ Por tipo | ❌ NO IMPLEMENTADO | ❌ | 21%, 10%, 4% |
| 10.6 | Base imponible | ✅ Cálculo | ❌ NO IMPLEMENTADO | ❌ | Sin IVA |
| 10.7 | Rectificativas | ✅ Facturas negativas | ❌ NO IMPLEMENTADO | ❌ | Anulaciones |
| 10.8 | Libro de facturas | ✅ Registro | ❌ NO IMPLEMENTADO | ❌ | Legal requirement |
| 10.9 | Imprimir factura legal | ✅ Formato legal | ❌ NO IMPLEMENTADO | ❌ | Con todos los datos |
| 10.10 | Envío por email | ✅ PDF adjunto | ❌ NO IMPLEMENTADO | ❌ | Email factura |
| 10.11 | Factura simplificada | ✅ < 400€ | ❌ NO IMPLEMENTADO | ❌ | Sin datos cliente |
| 10.12 | Exportar a contabilidad | ✅ Formato estándar | ❌ NO IMPLEMENTADO | ❌ | CSV/Excel |

---

## 📊 11. REPORTES (13%)

### Tabla de Referencia: Múltiples, sistema de informes FastReport

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 11.1 | Reporte de ventas diarias | ✅ Informe completo | 🟡 `/api/v1/reports` | 🟡 | Endpoint básico |
| 11.2 | **Reporte Z** | ✅ `registroz` | ✅ `z_reports` | ✅ | **IMPLEMENTADO** |
| 11.3 | Ventas por producto | ✅ Top productos | ❌ NO IMPLEMENTADO | ❌ | Ranking |
| 11.4 | Ventas por camarero | ✅ Por empleado | ❌ NO IMPLEMENTADO | ❌ | Comisiones |
| 11.5 | Ventas por mesa/salón | ✅ Por ubicación | ❌ NO IMPLEMENTADO | ❌ | Análisis zonas |
| 11.6 | Ventas por período | ✅ Rango fechas | 🟡 Query param | 🟡 | Falta UI |
| 11.7 | Comparativa períodos | ✅ Mes vs mes | ❌ NO IMPLEMENTADO | ❌ | Tendencias |
| 11.8 | Ticket promedio | ✅ Cálculo | ❌ NO IMPLEMENTADO | ❌ | AVG ventas |
| 11.9 | Productos más vendidos | ✅ Ranking | ❌ NO IMPLEMENTADO | ❌ | Top 10 |
| 11.10 | Horas pico | ✅ Análisis horario | ❌ NO IMPLEMENTADO | ❌ | Gráficos |
| 11.11 | Inventario valorado | ✅ Stock * Costo | ❌ NO IMPLEMENTADO | ❌ | Valor actual |
| 11.12 | Margen de beneficio | ✅ Por producto | ❌ NO IMPLEMENTADO | ❌ | Rentabilidad |
| 11.13 | Cuentas por cobrar | ✅ Clientes | ❌ NO IMPLEMENTADO | ❌ | Créditos |
| 11.14 | Cuentas por pagar | ✅ Proveedores | ❌ NO IMPLEMENTADO | ❌ | Deudas |
| 11.15 | Exportar a Excel | ✅ Todos los reportes | ❌ NO IMPLEMENTADO | ❌ | Exportación |

---

## ⚙️ 12. CONFIGURACIÓN (40%)

### Tabla de Referencia: `sysme.configuracion`, `sysmehotel.impresoras`

| # | Funcionalidad | Sistema Antiguo | Sistema Nuevo | Estado | Notas |
|---|--------------|-----------------|---------------|--------|-------|
| 12.1 | Datos de empresa | ✅ `sysme.empresa` | ✅ `settings` | ✅ | Nombre, dirección |
| 12.2 | Configuración de IVA | ✅ Tasas por tipo | 🟡 `tax_rate` setting | 🟡 | Solo una tasa, falta múltiples |
| 12.3 | Moneda del sistema | ✅ EUR, USD, etc | ✅ `currency` setting | ✅ | Configurado |
| 12.4 | Configuración de impresoras | ✅ `impresoras` tabla | ❌ NO IMPLEMENTADO | ❌ | Tickets, cocina, facturas |
| 12.5 | Formatos de impresión | ✅ Personalizable | 🟡 Templates | 🟡 | Falta personalización |
| 12.6 | Pie de ticket | ✅ Texto personalizado | ✅ `receipt_footer` | ✅ | Mensaje final |
| 12.7 | Series de facturación | ✅ Configurar series | ❌ NO IMPLEMENTADO | ❌ | A, B, C |
| 12.8 | Métodos de pago | ✅ `formaspago` | 🟡 `payment_methods` | 🟡 | Tabla existe, falta config UI |
| 12.9 | Backup automático | ✅ Configurado | ❌ NO IMPLEMENTADO | ❌ | Copias de seguridad |
| 12.10 | Idioma del sistema | ✅ Multi-idioma | 🟡 i18n parcial | 🟡 | Solo español actualmente |

---

## 🚨 FUNCIONALIDADES CRÍTICAS FALTANTES

### Bloqueantes para Producción (Impiden uso real)

1. **Complementos de Productos (0%)** - ❌ BLOQUEANTE
   - 20-30% de ingresos adicionales perdidos
   - Imposible tomar pedidos personalizados
   - Tabla: `complemento` (0 implementado)

2. **Facturación Legal (8%)** - ❌ BLOQUEANTE
   - Requisito legal obligatorio
   - Sin esto, empresa está en ilegalidad
   - Tabla: `factura`, `serie` (0 implementado)

3. **Multi-almacén (0%)** - ❌ CRÍTICO
   - Restaurantes tienen cocina, barra, bodega
   - Control de stock incorrecto sin esto
   - Tabla: `almacen_complementg` (0 implementado)

4. **Gestión de Proveedores (0%)** - ❌ IMPORTANTE
   - Sin esto, no hay control de compras
   - Tabla: `proveedor`, `pedido` (0 implementado)

5. **Packs/Combos (0%)** - ❌ CRÍTICO
   - Menús del día son esenciales
   - Tabla: `pack`, `pack_hosteleria` (0 implementado)

---

## 📈 PROGRESO POR PRIORIDAD

### BLOQUEANTES: 1/5 (20%)
- ✅ Sistema de Caja (80%)
- ❌ Complementos (0%)
- ❌ Facturación (8%)
- ❌ Multi-almacén (0%)
- ❌ Proveedores (0%)

### CRÍTICOS: 1/10 (10%)
- ✅ Sistema Base Ventas (47%)
- ❌ Packs/Combos (0%)
- ❌ Tarifas Dinámicas (0%)
- ❌ Panel Cocina Completo (30%)
- ❌ División de Cuenta (0%)
- ❌ Métodos Pago Mixtos (0%)
- ❌ Bloques de Cocina (0%)
- ❌ Anulación de Ventas (0%)
- ❌ Reimprimir Tickets (0%)
- ❌ Alertas Stock (0%)

### IMPORTANTES: 0/15 (0%)
- ❌ Grupos de usuarios (0%)
- ❌ Privilegios detallados (0%)
- ❌ Mesas combinables (0%)
- ❌ Clientes completo (20%)
- ❌ Reservas (0%)
- ❌ Fidelización (0%)
- ❌ Reportes avanzados (13%)
- ❌ Backup automático (0%)
- ❌ Multi-idioma (0%)
- ❌ Impresión real (0%)
- ❌ WebSocket notificaciones (0%)
- ❌ Exportar datos (0%)
- ❌ Valoración stock (0%)
- ❌ Margen beneficio (0%)
- ❌ Comparativa períodos (0%)

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### Semana 1-2: Complementos de Productos
**Prioridad:** BLOQUEANTE
**Impacto:** +20-30% ingresos

**Tareas:**
- [ ] Tabla `product_modifiers` (sin cebolla, sin sal)
- [ ] Tabla `product_extras` (extra queso, doble carne)
- [ ] API CRUD complementos
- [ ] Integración con sistema de ventas
- [ ] UI para selección en POS

### Semana 3-4: Facturación Legal
**Prioridad:** BLOQUEANTE
**Impacto:** Cumplimiento legal

**Tareas:**
- [ ] Tabla `invoices` con campos legales
- [ ] Tabla `invoice_series`
- [ ] Numeración secuencial por serie
- [ ] Desglose IVA (21%, 10%, 4%)
- [ ] Template factura legal
- [ ] Libro de facturas

### Semana 5-6: Multi-almacén
**Prioridad:** CRÍTICO
**Impacto:** Control correcto inventario

**Tareas:**
- [ ] Tabla `warehouses`
- [ ] Tabla `warehouse_stock`
- [ ] Tabla `stock_transfers`
- [ ] API traspasos
- [ ] UI gestión almacenes

### Semana 7-8: Packs y Combos
**Prioridad:** CRÍTICO
**Impacto:** Menús del día, ofertas

**Tareas:**
- [ ] Tabla `product_packs`
- [ ] Tabla `pack_items`
- [ ] Recursividad (pack dentro de pack)
- [ ] Descuento automático stock
- [ ] UI creación packs

---

## ✅ CRITERIOS DE ACEPTACIÓN PARA 100%

Para considerar el sistema **equivalente** al antiguo, debe cumplir:

1. ✅ **Sistema de Caja** - 100% funcional (backend ✅, frontend pendiente)
2. ❌ **Complementos** - Modificadores y extras funcionando
3. ❌ **Facturación** - Facturas legales con todas las series
4. ❌ **Multi-almacén** - Mínimo 3 almacenes configurables
5. ❌ **Packs** - Combos simples y recursivos
6. ❌ **Proveedores** - Gestión básica de compras
7. ❌ **Reportes** - Mínimo 10 reportes esenciales
8. ❌ **Impresión** - Tickets, cocina, facturas
9. ❌ **Tarifas** - Precios dinámicos por mesa/cliente
10. ❌ **Panel Cocina** - Bloques y prioridades funcionando

---

**Última actualización:** 2025-10-25
**Próxima revisión:** Semanal hasta alcanzar 100%

