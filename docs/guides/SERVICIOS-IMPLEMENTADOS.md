# 📋 SERVICIOS IMPLEMENTADOS - SYSME TPV 2.0

## ✅ Resumen de Servicios y WebSocket

Esta documentación detalla todos los servicios de negocio y handlers de WebSocket implementados.

---

## 🔧 1. SERVICIOS DE NEGOCIO

### 1.1 OrderService (`backend/src/services/OrderService.js`)

Servicio completo para gestión de pedidos con lógica de negocio.

**Métodos Implementados:**

#### Creación y Gestión
- ✅ `generateOrderNumber()` - Genera número único de pedido (ORD-YYYYMMDD-XXXX)
- ✅ `createOrder(orderData, items, userId)` - Crear pedido completo
  - Genera número de pedido
  - Calcula totales (subtotal, IVA, total)
  - Crea items del pedido
  - Actualiza estado de mesa
  - Crea historial de estado
  - Logging de auditoría

#### Consultas
- ✅ `getOrderById(orderId)` - Obtener pedido por ID con items
- ✅ `getOrders(filters)` - Listar pedidos con filtros y paginación
  - Filtros: status, order_type, table_id, waiter_id, date_from, date_to
  - Paginación automática
  - Join con mesas y meseros

#### Actualización
- ✅ `updateOrderStatus(orderId, newStatus, userId, notes)` - Cambiar estado
  - Estados: pending, confirmed, preparing, ready, delivered, completed, cancelled
  - Actualiza timestamps según estado
  - Crea historial de cambios
  - Actualiza estado de mesa automáticamente
  - Logging de negocio y auditoría

- ✅ `addItemToOrder(orderId, itemData, userId)` - Agregar item
  - Validación de estado del pedido
  - Recalcula totales automáticamente
  - Logging de negocio

- ✅ `removeItemFromOrder(orderId, itemId, userId)` - Eliminar item
  - Validación de estado del pedido
  - Recalcula totales automáticamente

- ✅ `recalculateOrderTotals(orderId, trx)` - Recalcular totales
  - Suma subtotal, impuestos, total
  - Actualiza registro del pedido

#### Estadísticas
- ✅ `getOrderStatistics(filters)` - Estadísticas de pedidos
  - Total de pedidos
  - Pedidos completados, cancelados, activos
  - Total de ventas
  - Valor promedio de pedido

**Ejemplo de uso:**
```javascript
import { getOrderService } from './services/OrderService.js';

const orderService = getOrderService();

// Crear pedido
const order = await orderService.createOrder({
  table_id: 5,
  order_type: 'dine_in',
  notes: 'Sin cebolla'
}, [
  {
    product_id: 1,
    product_name: 'Hamburguesa',
    unit_price: 12.50,
    quantity: 2,
    modifiers: [{ name: 'Extra queso', price: 1.50 }]
  }
], userId);

// Cambiar estado
await orderService.updateOrderStatus(order.id, 'preparing', userId);

// Obtener estadísticas
const stats = await orderService.getOrderStatistics({
  date_from: '2025-12-01',
  date_to: '2025-12-04'
});
```

---

### 1.2 ProductService (`backend/src/services/ProductService.js`)

Servicio completo para gestión de productos.

**Métodos Implementados:**

#### Consultas
- ✅ `getProducts(filters)` - Listar productos con filtros
  - Filtros: category_id, enabled, in_stock, search, is_combo
  - Paginación automática
  - Join con categorías
  - Parse de campos JSON (images, tags, allergens, nutritional_info)

- ✅ `getProductById(productId)` - Obtener producto completo
  - Incluye categoría
  - Incluye modificadores (si aplica)
  - Incluye items del combo (si es combo)
  - Incluye inventario por almacén

#### Creación y Actualización
- ✅ `createProduct(productData, userId)` - Crear producto
  - Soporte para productos simples y combos
  - Asignación de modificadores
  - Items de combo
  - Logging de negocio y auditoría

- ✅ `updateProduct(productId, productData, userId)` - Actualizar producto
  - Actualización parcial (solo campos enviados)
  - Actualización de modificadores
  - Actualización de items de combo
  - Logging de cambios

#### Eliminación
- ✅ `deleteProduct(productId, userId)` - Eliminar producto
  - Validación: no elimina si tiene pedidos activos
  - Soft delete (deshabilitación)
  - Logging de auditoría

#### Estadísticas
- ✅ `getProductStatistics()` - Estadísticas de productos
  - Total de productos
  - Productos habilitados
  - Productos en stock
  - Productos con stock bajo
  - Productos combo

- ✅ `getLowStockProducts()` - Productos con stock bajo
  - Lista ordenada por cantidad
  - Join con categorías

**Ejemplo de uso:**
```javascript
import { getProductService } from './services/ProductService.js';

const productService = getProductService();

// Crear producto
const product = await productService.createProduct({
  name: 'Pizza Margarita',
  description: 'Pizza clásica con tomate y queso',
  category_id: 2,
  price: 9.99,
  cost: 4.50,
  tax_rate: 0.21,
  image_url: '/uploads/pizza.jpg',
  tags: ['vegetariana', 'popular'],
  allergens: ['gluten', 'lactosa'],
  allow_modifiers: true,
  modifiers: [
    { modifier_id: 1, is_required: false }, // Extra queso
    { modifier_id: 2, is_required: false }  // Extra ingredientes
  ]
}, userId);

// Buscar productos
const { products, pagination } = await productService.getProducts({
  search: 'pizza',
  enabled: true,
  page: 1,
  limit: 20
});

// Productos con stock bajo
const lowStock = await productService.getLowStockProducts();
```

---

### 1.3 NotificationService (`backend/src/services/NotificationService.js`)

Servicio para gestión de notificaciones en tiempo real.

**Métodos Implementados:**

#### Inicialización
- ✅ `initialize(io)` - Inicializar con Socket.IO

#### Creación
- ✅ `createNotification(notificationData)` - Crear en BD
  - Tipos: order, reservation, inventory, system
  - Prioridades: low, normal, high, urgent
  - Parse de datos JSON

#### Envío
- ✅ `sendToUser(userId, notificationData)` - Enviar a usuario
  - Crea en BD
  - Envía vía WebSocket a sala `user:${userId}`

- ✅ `sendToRole(role, notificationData)` - Enviar a rol
  - Crea notificación para todos los usuarios del rol
  - Broadcast a sala `role:${role}`

- ✅ `broadcast(notificationData)` - Broadcast global
  - Envía a todos los clientes conectados

#### Consultas
- ✅ `getUserNotifications(userId, filters)` - Obtener notificaciones
  - Filtros: is_read, type
  - Paginación automática

- ✅ `getUnreadCount(userId)` - Contar no leídas

#### Actualización
- ✅ `markAsRead(notificationId, userId)` - Marcar como leída
- ✅ `markAllAsRead(userId)` - Marcar todas como leídas

#### Helpers de Negocio
- ✅ `notifyOrderCreated(order, userId)` - Notificar nuevo pedido
  - A cocina (priority: high)
  - A managers

- ✅ `notifyOrderStatusChange(order, oldStatus, newStatus)` - Cambio de estado
  - Al mesero asignado
  - Broadcast a displays de cocina

- ✅ `notifyLowStock(product)` - Stock bajo
  - A managers (priority: high)

- ✅ `notifyReservation(reservation)` - Nueva reserva
  - A meseros
  - A managers

**Ejemplo de uso:**
```javascript
import { getNotificationService } from './services/NotificationService.js';

const notificationService = getNotificationService();

// Inicializar con Socket.IO
notificationService.initialize(io);

// Enviar a usuario específico
await notificationService.sendToUser(userId, {
  type: 'order',
  title: 'Pedido Actualizado',
  message: 'El pedido #ORD-20251204-0001 está listo',
  link: '/orders/1',
  priority: 'high',
  data: { order_id: 1 }
});

// Enviar a rol
await notificationService.sendToRole('kitchen', {
  type: 'order',
  title: 'Nuevo Pedido',
  message: 'Mesa 5 - 2 items',
  priority: 'high'
});

// Obtener notificaciones del usuario
const { notifications, pagination } = await notificationService.getUserNotifications(userId, {
  is_read: false,
  page: 1,
  limit: 20
});
```

---

## 🌐 2. WEBSOCKET HANDLERS

### 2.1 Real-time Handlers (`backend/src/websockets/realtime-handlers.js`)

Sistema completo de WebSocket para sincronización en tiempo real.

**Funcionalidades:**

#### Autenticación
- ✅ `authenticate` - Autenticación con JWT
  - Valida token
  - Une a salas `user:${userId}` y `role:${role}`
  - Emite confirmación

#### Salas (Rooms)
- ✅ `join:room` - Unirse a sala
- ✅ `leave:room` - Salir de sala

#### Eventos de Pedidos
- ✅ `orders:subscribe` - Suscribirse a actualizaciones de pedidos
- ✅ `orders:subscribe:table` - Suscribirse a pedidos de mesa específica
- ✅ `order:created` - Pedido creado
  - Broadcast a `orders`
  - Broadcast a `orders:table:${tableId}`
  - Broadcast a `kitchen`

- ✅ `order:status_changed` - Estado de pedido cambiado
  - Broadcast a `orders`
  - Broadcast a mesa específica
  - Broadcast a `kitchen`

- ✅ `order:item_updated` - Item de pedido actualizado
  - Broadcast a `orders`
  - Broadcast a `kitchen`

#### Eventos de Cocina
- ✅ `kitchen:subscribe` - Suscribirse a cocina
- ✅ `kitchen:item_ready` - Item listo
  - Broadcast a `role:waiter`
  - Broadcast a `kitchen`

#### Eventos de Mesas
- ✅ `tables:subscribe` - Suscribirse a mesas
- ✅ `table:status_changed` - Estado de mesa cambiado
  - Broadcast a `tables`

#### Eventos de Pagos
- ✅ `payment:received` - Pago recibido
  - Broadcast a `role:cashier`
  - Broadcast a `role:manager`

#### Eventos de Notificaciones
- ✅ `notification:mark_read` - Marcar notificación como leída
- ✅ `notification:mark_all_read` - Marcar todas como leídas
- ✅ `notification:get_unread_count` - Obtener contador de no leídas

**Salas Disponibles:**
- `user:${userId}` - Sala personal del usuario
- `role:${role}` - Sala por rol (admin, manager, waiter, kitchen, cashier)
- `orders` - Sala de pedidos generales
- `orders:table:${tableId}` - Sala de pedidos de mesa específica
- `kitchen` - Sala de cocina
- `tables` - Sala de mesas

**Ejemplo de uso (Cliente):**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Autenticar
socket.emit('authenticate', { token: accessToken });

socket.on('authenticated', (data) => {
  if (data.success) {
    console.log('Authenticated:', data.userId, data.role);

    // Suscribirse a pedidos
    socket.emit('orders:subscribe');

    // Suscribirse a cocina
    socket.emit('kitchen:subscribe');
  }
});

// Escuchar eventos de pedidos
socket.on('order:created', (order) => {
  console.log('New order:', order);
  // Actualizar UI
});

socket.on('order:status_changed', (data) => {
  console.log('Order status changed:', data);
  // Actualizar UI
});

// Escuchar notificaciones
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Mostrar toast/alert
});

// Marcar notificación como leída
socket.emit('notification:mark_read', notificationId);
```

---

## 🔄 3. INTEGRACIÓN EN SERVER

### Actualización de `server-enhanced.js`

**Cambios realizados:**

```javascript
// Import WebSocket handlers
import { initializeRealtimeHandlers } from './websockets/realtime-handlers.js';

// ...

// Initialize real-time handlers
initializeRealtimeHandlers(io);
```

**Características:**
- ✅ WebSocket integrado con servidor HTTP
- ✅ Handlers de real-time inicializados automáticamente
- ✅ Logging de todas las conexiones y eventos
- ✅ Manejo de errores centralizado
- ✅ Autenticación JWT en WebSocket

---

## 📊 4. FLUJOS DE TRABAJO

### 4.1 Flujo de Creación de Pedido

```
Cliente hace pedido
       │
       ▼
OrderService.createOrder()
       │
       ├─> Genera número de pedido
       ├─> Calcula totales
       ├─> Crea orden en BD
       ├─> Crea items del pedido
       ├─> Actualiza estado de mesa
       ├─> Crea historial de estado
       ├─> Logger.business('ORDER_CREATED')
       ├─> Logger.audit(userId, 'CREATE', 'orders')
       │
       ▼
Socket emit 'order:created'
       │
       ├─> Broadcast a sala 'orders'
       ├─> Broadcast a sala 'orders:table:X'
       ├─> Broadcast a sala 'kitchen'
       │
       ▼
NotificationService.notifyOrderCreated()
       │
       ├─> Notifica a cocina (priority: high)
       ├─> Notifica a managers
       │
       ▼
Clientes reciben actualización en tiempo real
```

### 4.2 Flujo de Cambio de Estado

```
Cambio de estado (ej: ready)
       │
       ▼
OrderService.updateOrderStatus()
       │
       ├─> Actualiza estado en BD
       ├─> Actualiza timestamp (ready_at)
       ├─> Crea historial de cambio
       ├─> Actualiza estado de mesa (si aplica)
       ├─> Logger.business('ORDER_STATUS_CHANGED')
       │
       ▼
Socket emit 'order:status_changed'
       │
       ├─> Broadcast a sala 'orders'
       ├─> Broadcast a sala 'kitchen'
       │
       ▼
NotificationService.notifyOrderStatusChange()
       │
       ├─> Notifica al mesero asignado
       ├─> Broadcast a displays de cocina
       │
       ▼
Clientes actualizan UI automáticamente
```

### 4.3 Flujo de Notificación

```
Evento de negocio (ej: stock bajo)
       │
       ▼
NotificationService.notifyLowStock()
       │
       ├─> Crea notificación en BD
       ├─> Obtiene usuarios con rol 'manager'
       │
       ▼
Para cada usuario
       │
       ├─> Crea registro en tabla notifications
       ├─> Emit a sala 'user:${userId}'
       │
       ▼
Usuario conectado recibe
       │
       ├─> Evento 'notification'
       ├─> Muestra toast/alert en UI
       │
       ▼
Usuario marca como leída
       │
       ├─> Emit 'notification:mark_read'
       ├─> Actualiza is_read = true
       ├─> Actualiza read_at = now
```

---

## 🎯 5. PRÓXIMOS PASOS

### Controladores a Implementar
- [ ] OrderController (endpoints REST completos)
- [ ] ProductController (CRUD completo)
- [ ] TableController (gestión de mesas)
- [ ] ReservationController
- [ ] InventoryController
- [ ] ReportController

### Tests a Crear
- [ ] OrderService unit tests
- [ ] ProductService unit tests
- [ ] NotificationService unit tests
- [ ] WebSocket integration tests
- [ ] API endpoint tests

### Optimizaciones
- [ ] Implementar Redis para cache
- [ ] Implementar rate limiting por usuario
- [ ] Optimizar queries con índices
- [ ] Implementar paginación cursor-based
- [ ] Agregar compresión de WebSocket

---

**Última actualización**: 2025-12-04
**Versión**: 2.0.0
**Mantenedor**: SYSME Development Team
