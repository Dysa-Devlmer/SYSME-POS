# 📚 API DOCUMENTATION - SYSME TPV 2.0

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
Todas las rutas protegidas requieren un token JWT en el header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 AUTHENTICATION ENDPOINTS

### POST /auth/login
Login con credenciales

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "sess_1733356800000_a1b2c3d4e",
  "expiresIn": "24h",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@sysme.net",
    "role": "admin",
    "permissions": ["*"]
  }
}
```

**Errors:**
- `400` - Credenciales faltantes
- `401` - Credenciales inválidas
- `403` - Usuario deshabilitado
- `429` - Demasiados intentos (cuenta bloqueada temporalmente)

---

### POST /auth/refresh
Renovar access token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

### POST /auth/logout
Cerrar sesión

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "sessionId": "sess_1733356800000_a1b2c3d4e"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /auth/me
Obtener información del usuario actual

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@sysme.net",
    "role": "admin",
    "enabled": true,
    "created_at": "2025-12-01T00:00:00.000Z",
    "last_login": "2025-12-04T10:30:00.000Z",
    "permissions": ["*"]
  }
}
```

---

## 📦 ORDERS ENDPOINTS (v2)

### GET /orders-v2
Listar pedidos con filtros

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:read`

**Query Parameters:**
- `status` - Estado del pedido (pending, confirmed, preparing, ready, delivered, completed, cancelled)
- `order_type` - Tipo (dine_in, takeout, delivery, pickup)
- `table_id` - ID de mesa
- `waiter_id` - ID de mesero
- `date_from` - Fecha desde (YYYY-MM-DD)
- `date_to` - Fecha hasta (YYYY-MM-DD)
- `page` - Página (default: 1)
- `limit` - Límite por página (default: 20)

**Example:**
```
GET /api/v1/orders-v2?status=pending&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-20251204-0001",
      "table_id": 5,
      "table_number": "5",
      "waiter_id": 2,
      "waiter_name": "john_waiter",
      "status": "pending",
      "order_type": "dine_in",
      "subtotal": 25.00,
      "tax": 5.25,
      "discount": 0.00,
      "total": 30.25,
      "notes": null,
      "created_at": "2025-12-04T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### GET /orders-v2/:id
Obtener pedido por ID

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-20251204-0001",
    "table_id": 5,
    "table_number": "5",
    "waiter_id": 2,
    "waiter_name": "john_waiter",
    "status": "pending",
    "order_type": "dine_in",
    "subtotal": 25.00,
    "tax": 5.25,
    "discount": 0.00,
    "total": 30.25,
    "notes": null,
    "created_at": "2025-12-04T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "product_id": 10,
        "product_name": "Hamburguesa Clásica",
        "unit_price": 12.50,
        "quantity": 2,
        "subtotal": 25.00,
        "tax": 5.25,
        "total": 30.25,
        "notes": "Sin cebolla",
        "status": "pending",
        "modifiers": [
          {
            "name": "Extra queso",
            "price": 1.50
          }
        ],
        "image_url": "/uploads/hamburguesa.jpg"
      }
    ]
  }
}
```

---

### POST /orders-v2
Crear nuevo pedido

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:write`

**Request:**
```json
{
  "table_id": 5,
  "order_type": "dine_in",
  "notes": "Cliente VIP",
  "customer_notes": "Sin cebolla en ningún plato",
  "discount": 0,
  "items": [
    {
      "product_id": 10,
      "product_name": "Hamburguesa Clásica",
      "unit_price": 12.50,
      "quantity": 2,
      "notes": "Sin cebolla",
      "modifiers": [
        {
          "name": "Extra queso",
          "price": 1.50
        }
      ]
    },
    {
      "product_id": 15,
      "product_name": "Coca-Cola",
      "unit_price": 2.50,
      "quantity": 2
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { /* order object */ },
  "message": "Order created successfully"
}
```

**Events Emitted:**
- WebSocket: `order:created` to rooms: `orders`, `orders:table:5`, `kitchen`
- Notification: Sent to role `kitchen` and `manager`

---

### PATCH /orders-v2/:id/status
Cambiar estado de pedido

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:write`

**Request:**
```json
{
  "status": "preparing",
  "notes": "Iniciando preparación"
}
```

**Valid Statuses:**
- `pending` - Pendiente
- `confirmed` - Confirmado
- `preparing` - En preparación
- `ready` - Listo
- `delivered` - Entregado
- `completed` - Completado
- `cancelled` - Cancelado

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated order */ },
  "message": "Order status updated successfully"
}
```

**Events Emitted:**
- WebSocket: `order:status_changed` to rooms: `orders`, `orders:table:X`, `kitchen`
- Notification: Sent to waiter assigned

---

### POST /orders-v2/:id/items
Agregar item al pedido

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:write`

**Request:**
```json
{
  "product_id": 20,
  "product_name": "Papas Fritas",
  "unit_price": 3.50,
  "quantity": 1,
  "notes": "Con ketchup extra"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated order with new item */ },
  "message": "Item added to order successfully"
}
```

---

### DELETE /orders-v2/:id/items/:itemId
Eliminar item del pedido

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:write`

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated order */ },
  "message": "Item removed from order successfully"
}
```

---

### GET /orders-v2/statistics
Obtener estadísticas de pedidos

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:read`

**Query Parameters:**
- `date_from` - Fecha desde (YYYY-MM-DD)
- `date_to` - Fecha hasta (YYYY-MM-DD)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_orders": 150,
    "completed_orders": 120,
    "cancelled_orders": 5,
    "active_orders": 25,
    "total_sales": 3450.75,
    "average_order_value": 23.01
  }
}
```

---

### GET /orders-v2/active
Obtener pedidos activos

**Headers:** `Authorization: Bearer <token>`
**Permission:** `orders:read`

**Response (200):**
```json
{
  "success": true,
  "data": [ /* array of active orders */ ],
  "count": 25
}
```

---

## 🛍️ PRODUCTS ENDPOINTS (v2)

### GET /products-v2
Listar productos con filtros

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:read`

**Query Parameters:**
- `category_id` - ID de categoría
- `enabled` - Habilitado (true/false)
- `in_stock` - En stock (true/false)
- `is_combo` - Es combo (true/false)
- `search` - Búsqueda por nombre, SKU o barcode
- `page` - Página (default: 1)
- `limit` - Límite por página (default: 50)

**Example:**
```
GET /api/v1/products-v2?category_id=2&enabled=true&search=pizza
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "sku": "BURG-001",
      "barcode": "1234567890123",
      "name": "Hamburguesa Clásica",
      "description": "Carne 100% res con queso cheddar",
      "category_id": 2,
      "category_name": "Hamburguesas",
      "category_color": "#FF5733",
      "price": 12.50,
      "cost": 5.00,
      "tax_rate": 0.21,
      "image_url": "/uploads/hamburguesa.jpg",
      "images": ["/uploads/hamburguesa.jpg", "/uploads/hamburguesa-2.jpg"],
      "enabled": true,
      "in_stock": true,
      "stock_quantity": 50,
      "min_stock": 10,
      "unit": "unit",
      "is_combo": false,
      "allow_modifiers": true,
      "preparation_time": 15,
      "tags": ["popular", "best-seller"],
      "allergens": ["gluten", "lactosa"],
      "nutritional_info": {
        "calories": 650,
        "protein": 30,
        "carbs": 45,
        "fat": 35
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

---

### GET /products-v2/:id
Obtener producto por ID

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "Hamburguesa Clásica",
    /* ... other fields ... */,
    "modifiers": [
      {
        "id": 1,
        "name": "Extra queso",
        "description": "Queso cheddar adicional",
        "price": 1.50,
        "enabled": true,
        "is_required": false
      }
    ],
    "combo_items": [], // Only if is_combo = true
    "inventory": [
      {
        "warehouse_id": 1,
        "warehouse_name": "Almacén Principal",
        "quantity": 50,
        "min_stock": 10
      }
    ]
  }
}
```

---

### POST /products-v2
Crear nuevo producto

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:write`

**Request:**
```json
{
  "sku": "PIZZA-MAR",
  "name": "Pizza Margarita",
  "description": "Pizza clásica con tomate y mozzarella",
  "category_id": 3,
  "price": 9.99,
  "cost": 4.50,
  "tax_rate": 0.21,
  "image_url": "/uploads/pizza-margarita.jpg",
  "images": ["/uploads/pizza-margarita.jpg"],
  "enabled": true,
  "in_stock": true,
  "stock_quantity": 100,
  "min_stock": 20,
  "unit": "unit",
  "is_combo": false,
  "allow_modifiers": true,
  "preparation_time": 20,
  "tags": ["vegetariana", "popular"],
  "allergens": ["gluten", "lactosa"],
  "modifiers": [
    {
      "modifier_id": 1,
      "is_required": false
    },
    {
      "modifier_id": 2,
      "is_required": false
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { /* created product */ },
  "message": "Product created successfully"
}
```

---

### PUT /products-v2/:id
Actualizar producto

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:write`

**Request:**
```json
{
  "price": 10.99,
  "stock_quantity": 80,
  "enabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated product */ },
  "message": "Product updated successfully"
}
```

---

### DELETE /products-v2/:id
Eliminar (deshabilitar) producto

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:write`

**Response (200):**
```json
{
  "success": true,
  "message": "Product disabled successfully"
}
```

**Note:** Los productos no se eliminan físicamente, solo se deshabilitan si tienen pedidos activos.

---

### PATCH /products-v2/:id/toggle
Habilitar/Deshabilitar producto

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:write`

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated product */ },
  "message": "Product enabled successfully"
}
```

---

### PATCH /products-v2/:id/stock
Actualizar stock del producto

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:write`

**Request:**
```json
{
  "stock_quantity": 150,
  "in_stock": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated product */ },
  "message": "Stock updated successfully"
}
```

---

### GET /products-v2/statistics
Obtener estadísticas de productos

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_products": 250,
    "enabled_products": 230,
    "in_stock_products": 220,
    "low_stock_products": 15,
    "combo_products": 10
  }
}
```

---

### GET /products-v2/low-stock
Obtener productos con stock bajo

**Headers:** `Authorization: Bearer <token>`
**Permission:** `products:read`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "name": "Papas Fritas",
      "sku": "SIDE-001",
      "stock_quantity": 8,
      "min_stock": 20,
      "category_name": "Acompañamientos"
    }
  ],
  "count": 15
}
```

---

## 🔔 NOTIFICATIONS ENDPOINTS

### GET /notifications
Obtener notificaciones del usuario

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `is_read` - Filtrar por leídas (true/false)
- `type` - Tipo de notificación (order, reservation, inventory, system)
- `page` - Página (default: 1)
- `limit` - Límite por página (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "type": "order",
      "title": "Nuevo Pedido",
      "message": "Pedido #ORD-20251204-0001 creado para Mesa 5",
      "link": "/orders/1",
      "data": {
        "order_id": 1,
        "order_number": "ORD-20251204-0001"
      },
      "priority": "high",
      "is_read": false,
      "read_at": null,
      "created_at": "2025-12-04T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET /notifications/unread-count
Obtener contador de notificaciones no leídas

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### PATCH /notifications/:id/read
Marcar notificación como leída

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### PATCH /notifications/read-all
Marcar todas las notificaciones como leídas

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "5 notifications marked as read"
}
```

---

### POST /notifications/send
Enviar notificación (Admin/Manager only)

**Headers:** `Authorization: Bearer <token>`
**Roles:** `admin`, `manager`

**Request:**
```json
{
  "user_id": 2,  // Optional: send to specific user
  "role": "kitchen",  // Optional: send to all users with this role
  "type": "order",
  "title": "Pedido Urgente",
  "message": "Mesa 10 - Cliente VIP",
  "link": "/orders/15",
  "data": {
    "order_id": 15,
    "priority": "urgent"
  },
  "priority": "high"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* notification or count */ },
  "message": "Notification sent successfully"
}
```

---

## 🌐 WEBSOCKET EVENTS

### Connection & Authentication
```javascript
const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', { token: 'your-jwt-token' });

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.userId, data.role);
});
```

### Order Events
```javascript
// Subscribe to orders
socket.emit('orders:subscribe');

// Subscribe to specific table
socket.emit('orders:subscribe:table', 5);

// Listen for new orders
socket.on('order:created', (order) => {
  console.log('New order:', order);
});

// Listen for status changes
socket.on('order:status_changed', (data) => {
  console.log('Status changed:', data.old_status, '->', data.new_status);
});

// Listen for item updates
socket.on('order:item_updated', (data) => {
  console.log('Item updated:', data);
});
```

### Kitchen Events
```javascript
socket.emit('kitchen:subscribe');

socket.on('order:new', (order) => {
  console.log('New order for kitchen:', order);
});

socket.on('kitchen:item_ready', (data) => {
  console.log('Item ready:', data);
});
```

### Notification Events
```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

socket.emit('notification:mark_read', notificationId);
socket.emit('notification:get_unread_count');
```

---

## ❌ ERROR RESPONSES

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error message",
  "code": "ERROR_CODE"  // Optional
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validación fallida)
- `401` - Unauthorized (no autenticado)
- `403` - Forbidden (sin permisos)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

**Última actualización**: 2025-12-04
**Versión**: 2.0.0
**Base URL**: `http://localhost:3001/api/v1`
