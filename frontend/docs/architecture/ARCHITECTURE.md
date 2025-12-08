# 🏗️ SYSME POS - System Architecture

Complete technical architecture documentation for SYSME POS v2.1.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Architecture](#database-architecture)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Data Flow](#data-flow)
- [API Design](#api-design)
- [Scalability](#scalability)

---

## 🎯 Overview

SYSME POS v2.1 is a modern, three-tier architecture application built with:
- **Presentation Layer**: React 18 + TypeScript + Tailwind CSS
- **Business Logic Layer**: Node.js + Express.js
- **Data Layer**: Better-SQLite3 (or PostgreSQL for scale)

### Architecture Principles

1. **Separation of Concerns** - Clear boundaries between layers
2. **Modularity** - Independent, reusable components
3. **Scalability** - Horizontal and vertical scaling support
4. **Security** - Defense in depth, zero-trust model
5. **Performance** - Optimized for real-world traffic
6. **Maintainability** - Clean code, comprehensive documentation

---

## 🏛️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Desktop    │  │    Tablet    │  │    Mobile    │         │
│  │   Browser    │  │   Browser    │  │   Browser    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY / CDN                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nginx / CloudFlare                                       │  │
│  │  • SSL/TLS Termination                                   │  │
│  │  • Rate Limiting                                          │  │
│  │  • Static Asset Caching                                  │  │
│  │  • Load Balancing                                        │  │
│  │  • DDoS Protection                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   STATIC FILE SERVING     │  │   APPLICATION LAYER      │
│  ┌─────────────────────┐  │  │  ┌────────────────────┐ │
│  │ React SPA (Vite)    │  │  │  │  Node.js Cluster   │ │
│  │ • HTML/CSS/JS       │  │  │  │  ┌──────────────┐  │ │
│  │ • Images/Fonts      │  │  │  │  │ Instance 1   │  │ │
│  │ • Service Worker    │  │  │  │  │ Instance 2   │  │ │
│  └─────────────────────┘  │  │  │  │ Instance N   │  │ │
└───────────────────────────┘  │  │  └──────────────┘  │ │
                               │  │                      │ │
                               │  │  ┌────────────────┐ │ │
                               │  │  │ Express.js     │ │ │
                               │  │  │ • REST API     │ │ │
                               │  │  │ • WebSocket    │ │ │
                               │  │  │ • Auth         │ │ │
                               │  │  │ • Validation   │ │ │
                               │  │  └────────────────┘ │ │
                               │  └────────────────────────┘ │
                               └──────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │ Primary DB     │  │ Cache Layer    │  │ File Storage   │   │
│  │ (SQLite/PG)    │  │ (Redis)        │  │ (S3/Local)     │   │
│  │ • ACID         │  │ • Sessions     │  │ • Uploads      │   │
│  │ • Transactions │  │ • Temp Data    │  │ • Backups      │   │
│  │ • Constraints  │  │ • Rate Limits  │  │ • Reports      │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MONITORING & LOGGING                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Winston  │  │Prometheus│  │  Sentry  │  │  Audit   │       │
│  │  Logs    │  │ Metrics  │  │  Errors  │  │   Log    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Architecture

### Directory Structure

```
backend/
├── controllers/          # Request handlers (12 controllers)
│   ├── auth.controller.js
│   ├── products.controller.js
│   ├── sales.controller.js
│   ├── inventory.controller.js
│   ├── customers.controller.js
│   ├── analytics.controller.js
│   ├── suppliers.controller.js
│   ├── reservations.controller.js
│   ├── promotions.controller.js
│   ├── delivery.controller.js
│   ├── loyalty.controller.js
│   └── recipes.controller.js
│
├── middleware/           # Express middleware
│   ├── auth.middleware.js      # JWT verification
│   ├── rbac.middleware.js      # Role-based access control
│   ├── validate.middleware.js  # Request validation
│   ├── error.middleware.js     # Error handling
│   └── rateLimit.middleware.js # Rate limiting
│
├── models/               # Database models
│   └── database.js       # Database connection & queries
│
├── routes/               # API route definitions
│   ├── auth.routes.js
│   ├── products.routes.js
│   └── ...
│
├── services/             # Business logic services
│   ├── email.service.js
│   ├── notification.service.js
│   └── ...
│
├── utils/                # Utility functions
│   ├── logger.js         # Winston logger
│   ├── jwt.js            # JWT helpers
│   └── validators.js     # Joi schemas
│
├── config/               # Configuration
│   ├── database.config.js
│   └── app.config.js
│
├── logs/                 # Application logs
├── backups/              # Database backups
├── uploads/              # File uploads
├── database.sqlite       # SQLite database
└── server.js             # Entry point
```

### Request Flow

```
1. Client Request
   │
   ▼
2. Nginx (SSL, Rate Limit, Load Balance)
   │
   ▼
3. Express.js Application
   │
   ├─▶ Logging Middleware (Winston)
   │
   ├─▶ CORS Middleware
   │
   ├─▶ Body Parser Middleware
   │
   ├─▶ Rate Limiting Middleware
   │      │
   │      └─▶ Check rate limit (100 req/min)
   │
   ├─▶ Authentication Middleware
   │      │
   │      ├─▶ Extract JWT from header
   │      ├─▶ Verify signature
   │      ├─▶ Check expiry
   │      └─▶ Attach user to request
   │
   ├─▶ Authorization Middleware (RBAC)
   │      │
   │      ├─▶ Check user role
   │      ├─▶ Verify permissions
   │      └─▶ Allow/Deny access
   │
   ├─▶ Validation Middleware
   │      │
   │      ├─▶ Validate request body (Joi)
   │      ├─▶ Validate query params
   │      └─▶ Sanitize input
   │
   ├─▶ Route Handler (Controller)
   │      │
   │      ├─▶ Business logic
   │      ├─▶ Database queries
   │      └─▶ Response preparation
   │
   ├─▶ Error Handling Middleware
   │      │
   │      ├─▶ Log error
   │      ├─▶ Format error response
   │      └─▶ Send to client
   │
   └─▶ Response
```

### Controller Pattern

```javascript
// Example: ProductsController
class ProductsController {
  // GET /api/products
  async getAll(req, res, next) {
    try {
      // 1. Extract query params
      const { page, limit, category, search } = req.query;

      // 2. Business logic
      const products = await ProductService.getProducts({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        category,
        search
      });

      // 3. Response
      return res.json({
        success: true,
        data: products.items,
        pagination: {
          page: products.page,
          limit: products.limit,
          total: products.total,
          pages: products.pages
        }
      });
    } catch (error) {
      next(error); // Pass to error handler
    }
  }

  // POST /api/products
  async create(req, res, next) {
    try {
      // Validation already done by middleware
      const productData = req.body;

      // Create product
      const product = await ProductService.createProduct(
        productData,
        req.user.user_id // From auth middleware
      );

      // Audit log
      await AuditService.log({
        user_id: req.user.user_id,
        action: 'CREATE',
        table: 'products',
        record_id: product.product_id
      });

      return res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }
}
```

---

## 💻 Frontend Architecture

### Directory Structure

```
src/
├── components/           # React components
│   ├── common/          # Reusable components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Table.jsx
│   │
│   ├── layout/          # Layout components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── Footer.jsx
│   │
│   ├── pos/             # POS module
│   │   ├── POSTerminal.jsx
│   │   ├── ProductGrid.jsx
│   │   ├── Cart.jsx
│   │   └── PaymentModal.jsx
│   │
│   ├── inventory/       # Inventory module
│   │   ├── InventoryList.jsx
│   │   ├── StockAdjustment.jsx
│   │   └── ReorderAlerts.jsx
│   │
│   └── ...              # Other modules
│
├── services/            # API clients
│   ├── api.js          # Axios instance
│   ├── auth.service.js
│   ├── products.service.js
│   └── ...
│
├── stores/              # Zustand state stores
│   ├── authStore.js
│   ├── cartStore.js
│   └── ...
│
├── hooks/               # Custom React hooks
│   ├── useAuth.js
│   ├── useProducts.js
│   └── ...
│
├── utils/               # Utility functions
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
│
├── types/               # TypeScript types
│   ├── product.types.ts
│   ├── order.types.ts
│   └── ...
│
├── styles/              # Global styles
│   └── index.css
│
├── App.jsx              # Main app component
└── main.jsx             # Entry point
```

### Component Architecture

```
App.jsx
│
├── Router
│   │
│   ├── PublicRoute
│   │   ├── Login
│   │   └── ForgotPassword
│   │
│   └── PrivateRoute (requires auth)
│       │
│       ├── Dashboard
│       │   ├── Header
│       │   ├── Sidebar
│       │   └── MainContent
│       │       ├── SalesDashboard
│       │       ├── QuickStats
│       │       └── Charts
│       │
│       ├── POS
│       │   ├── POSTerminal
│       │   │   ├── ProductGrid
│       │   │   ├── Cart
│       │   │   └── PaymentModal
│       │   └── OrderHistory
│       │
│       ├── Inventory
│       │   ├── InventoryList
│       │   ├── StockAdjustment
│       │   └── Transfers
│       │
│       └── Reports
│           ├── SalesReports
│           ├── InventoryReports
│           └── CustomerReports
```

### State Management

```javascript
// Zustand Store Example: cartStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      customer: null,
      discount: 0,

      // Actions
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            item => item.product_id === product.product_id
          );

          if (existing) {
            return {
              items: state.items.map(item =>
                item.product_id === product.product_id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            };
          }

          return {
            items: [...state.items, { ...product, quantity }]
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(
            item => item.product_id !== productId
          )
        }));
      },

      clearCart: () => {
        set({ items: [], customer: null, discount: 0 });
      },

      // Computed values
      getTotal: () => {
        const { items, discount } = get();
        const subtotal = items.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        return subtotal - discount;
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        customer: state.customer
      })
    }
  )
);
```

---

## 🗄️ Database Architecture

### Schema Overview

**77 Normalized Tables (3NF)**

```
Core Business Entities (20 tables)
├── products
├── product_variants
├── product_modifiers
├── categories
├── orders
├── order_details
├── customers
├── inventory_items
├── suppliers
├── employees
└── ...

Operational Tables (15 tables)
├── tables
├── reservations
├── kitchen_orders
├── delivery_orders
├── cash_sessions
└── ...

Financial Tables (12 tables)
├── transactions
├── payments
├── expenses
├── tax_rates
└── ...

CRM & Marketing (10 tables)
├── loyalty_programs
├── promotions
├── customer_segments
├── campaigns
└── ...

System & Audit (20 tables)
├── users
├── roles
├── permissions
├── audit_log
├── error_log
└── ...
```

### Entity Relationships

```
┌─────────────┐
│  Categories │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐      ┌──────────────────┐
│  Products   │◀────▶│ Product_Variants │
└──────┬──────┘ 1:N  └──────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────┐
│ Inventory_Items │
└─────────────────┘

┌─────────────┐
│  Customers  │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐      ┌───────────────┐
│   Orders    │─────▶│ Order_Details │
└──────┬──────┘ 1:N  └───────┬───────┘
       │                     │
       │ 1:N                 │ N:1
       ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  Payments   │      │  Products   │
└─────────────┘      └─────────────┘
```

### Indexing Strategy

**120+ Strategic Indexes**

1. **Primary Keys** (auto-indexed)
   ```sql
   PRIMARY KEY (product_id)
   ```

2. **Foreign Keys** (relationship optimization)
   ```sql
   INDEX idx_orders_customer_id (customer_id)
   INDEX idx_order_details_order_id (order_id)
   INDEX idx_order_details_product_id (product_id)
   ```

3. **Commonly Queried Columns**
   ```sql
   INDEX idx_products_name (name)
   INDEX idx_products_sku (sku)
   INDEX idx_customers_email (email)
   INDEX idx_orders_status (status)
   ```

4. **Date Ranges**
   ```sql
   INDEX idx_orders_created_at (created_at)
   INDEX idx_orders_date (DATE(created_at))
   ```

5. **Composite Indexes**
   ```sql
   INDEX idx_products_category_active (category_id, is_active)
   INDEX idx_orders_customer_date (customer_id, created_at)
   ```

### Query Optimization

**Before (Slow):**
```sql
-- 450ms - Full table scan
SELECT * FROM orders
WHERE customer_id = 123
AND created_at >= '2025-01-01';
```

**After (Fast):**
```sql
-- 8ms - Uses composite index
SELECT
  order_id,
  total_amount,
  status,
  created_at
FROM orders
WHERE customer_id = 123
AND created_at >= '2025-01-01'
ORDER BY created_at DESC
LIMIT 50;

-- Uses: idx_orders_customer_date (customer_id, created_at)
```

---

## 🔒 Security Architecture

### Defense in Depth

```
Layer 1: Network Security
├── Firewall (only ports 80, 443, 22)
├── DDoS Protection (CloudFlare)
└── IP Whitelisting (optional)

Layer 2: Application Gateway
├── Nginx Reverse Proxy
├── SSL/TLS 1.3 Encryption
├── Rate Limiting (100 req/min)
└── Request Size Limits

Layer 3: Application Security
├── JWT Authentication
├── RBAC Authorization
├── Input Validation (Joi)
├── Output Sanitization
├── CSRF Protection
├── XSS Protection
└── SQL Injection Prevention

Layer 4: Data Security
├── Password Hashing (bcrypt, 10 rounds)
├── Encrypted Tokens (HS256)
├── Encrypted Backups
└── Secure Session Management

Layer 5: Monitoring & Audit
├── Audit Logging
├── Error Tracking
├── Security Alerts
└── Access Logs
```

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   { username, password }
   │
   ▼
2. Server Validates
   ├─▶ Check user exists
   ├─▶ Verify password (bcrypt.compare)
   ├─▶ Check account status
   └─▶ Check failed login attempts
   │
   ▼
3. Generate Tokens
   ├─▶ Access Token (24h, minimal payload)
   │   {
   │     user_id: 123,
   │     role: 'admin',
   │     exp: timestamp
   │   }
   │
   └─▶ Refresh Token (7d, stored in DB)
   │
   ▼
4. Send Response
   {
     accessToken: "eyJ...",
     refreshToken: "eyJ...",
     user: { ... }
   }
   │
   ▼
5. Client Stores
   ├─▶ Access Token: Memory
   └─▶ Refresh Token: httpOnly cookie
```

### Authorization Matrix

| Resource | Admin | Manager | Cashier | Kitchen | Waiter |
|----------|-------|---------|---------|---------|--------|
| Products CRUD | ✅ | ✅ | View | View | View |
| Orders Create | ✅ | ✅ | ✅ | Update | ✅ |
| Inventory | ✅ | ✅ | View | View | View |
| Reports | ✅ | ✅ | View | None | None |
| Settings | ✅ | View | None | None | None |
| Users | ✅ | None | None | None | None |

---

## 🚀 Deployment Architecture

### Development Environment

```
Developer Machine
├── Frontend (Vite Dev Server)
│   └── http://localhost:5173
│
├── Backend (Nodemon)
│   └── http://localhost:3000
│
└── Database (SQLite)
    └── ./backend/database.sqlite
```

### Production Environment (Option 1: VPS)

```
VPS Server (Ubuntu 20.04)
│
├── Nginx (Reverse Proxy)
│   ├── Port 80 → 443 (redirect)
│   ├── Port 443 (SSL/TLS)
│   │   ├── /api/* → Backend (3000)
│   │   └── /* → Frontend (static files)
│   │
│   └── SSL Certificate (Let's Encrypt)
│
├── PM2 (Process Manager)
│   ├── Backend Instance 1
│   ├── Backend Instance 2
│   └── Backend Instance N
│
├── Database
│   └── SQLite or PostgreSQL
│
└── Monitoring
    ├── PM2 Monitoring
    ├── Nginx Logs
    └── Application Logs
```

### Production Environment (Option 2: Docker)

```
Docker Host
│
├── Frontend Container
│   ├── Nginx
│   └── React Build (static files)
│
├── Backend Container(s)
│   ├── Node.js
│   └── Express.js
│
├── Database Container
│   └── PostgreSQL
│
├── Redis Container (optional)
│   └── Session Cache
│
└── Nginx Reverse Proxy
    └── SSL/TLS Termination
```

### Production Environment (Option 3: Kubernetes)

```
Kubernetes Cluster
│
├── Ingress Controller
│   ├── SSL/TLS
│   └── Load Balancing
│
├── Frontend Deployment
│   ├── Pod 1 (Nginx + React)
│   ├── Pod 2 (Nginx + React)
│   └── Service (LoadBalancer)
│
├── Backend Deployment
│   ├── Pod 1 (Node.js)
│   ├── Pod 2 (Node.js)
│   ├── Pod N (Node.js)
│   └── Service (ClusterIP)
│
├── Database StatefulSet
│   ├── Primary Pod
│   ├── Replica Pod
│   └── Service (Headless)
│
├── Redis Deployment
│   └── Service
│
└── Monitoring
    ├── Prometheus
    ├── Grafana
    └── AlertManager
```

---

## 📊 Data Flow

### POS Transaction Flow

```
1. Cashier adds items to cart
   Frontend: useCartStore.addItem()
   │
   ▼
2. Cashier initiates checkout
   Frontend: POST /api/sales/orders
   {
     customer_id: 123,
     items: [
       { product_id: 1, quantity: 2, price: 100 },
       { product_id: 2, quantity: 1, price: 50 }
     ],
     payment_method: 'cash',
     total: 250
   }
   │
   ▼
3. Backend validates request
   Middleware: validateRequest(createOrderSchema)
   │
   ▼
4. Backend processes order
   Controller: SalesController.createOrder()
   │
   ├─▶ Begin Transaction
   │
   ├─▶ Create order record
   │   INSERT INTO orders (customer_id, total, ...)
   │
   ├─▶ Create order details
   │   INSERT INTO order_details (order_id, product_id, ...)
   │
   ├─▶ Update inventory
   │   UPDATE inventory_items SET quantity = quantity - sold
   │
   ├─▶ Create payment record
   │   INSERT INTO payments (order_id, amount, method, ...)
   │
   ├─▶ Update customer loyalty points
   │   UPDATE customers SET loyalty_points = points + earned
   │
   ├─▶ Create audit log
   │   INSERT INTO audit_log (user_id, action, ...)
   │
   └─▶ Commit Transaction
   │
   ▼
5. Backend sends response
   {
     success: true,
     data: {
       order_id: 456,
       total: 250,
       receipt_number: "REC-2025-00456"
     }
   }
   │
   ▼
6. Frontend updates UI
   ├─▶ Clear cart
   ├─▶ Show success message
   ├─▶ Print receipt (optional)
   └─▶ Emit WebSocket event (update dashboard)
   │
   ▼
7. Real-time updates
   WebSocket: 'order:created'
   └─▶ Update dashboard for all connected clients
```

---

## 🌐 API Design

### RESTful Principles

**Resource-Based URLs:**
```
GET    /api/products          # List all products
GET    /api/products/:id      # Get single product
POST   /api/products          # Create product
PUT    /api/products/:id      # Update product
DELETE /api/products/:id      # Delete product
```

**Consistent Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "price",
        "message": "Price must be greater than 0"
      }
    ]
  }
}
```

### HTTP Status Codes

- `200 OK` - Successful GET, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## 📈 Scalability

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load        │
                    │ Balancer    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Backend       │  │ Backend       │  │ Backend       │
│ Instance 1    │  │ Instance 2    │  │ Instance N    │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Database    │
                    │ (Primary +  │
                    │  Replicas)  │
                    └─────────────┘
```

### Vertical Scaling

- CPU: 2 → 4 → 8 cores
- RAM: 4GB → 8GB → 16GB
- Storage: HDD → SSD → NVMe

### Database Scaling

1. **SQLite → PostgreSQL** (for multi-server)
2. **Read Replicas** (separate read/write)
3. **Connection Pooling** (pg-pool)
4. **Query Optimization** (indexes, explain analyze)
5. **Caching Layer** (Redis)

### Caching Strategy

```
Request
   │
   ├─▶ Check Redis Cache
   │   ├─▶ HIT: Return cached data
   │   └─▶ MISS: Continue
   │
   ├─▶ Query Database
   │
   └─▶ Store in Redis (TTL: 5-60min)
```

---

## 🔍 Monitoring Architecture

### Metrics Collection

```
Application
   │
   ├─▶ Winston Logger
   │   ├─▶ File Logs (rotate daily)
   │   └─▶ Console Logs (dev only)
   │
   ├─▶ Prometheus Client
   │   ├─▶ HTTP Metrics (requests, latency)
   │   ├─▶ Custom Metrics (orders, revenue)
   │   └─▶ System Metrics (CPU, memory)
   │
   └─▶ Audit Logger
       └─▶ User Actions (CRUD operations)
```

### Observability Stack

```
┌─────────────┐
│ Application │
└──────┬──────┘
       │
       ├─▶ Logs → Winston → File/CloudWatch
       │
       ├─▶ Metrics → Prometheus → Grafana
       │
       ├─▶ Traces → OpenTelemetry → Jaeger
       │
       └─▶ Errors → Sentry
```

---

## 📝 Summary

SYSME POS v2.1 architecture is designed for:

✅ **Scalability** - Horizontal and vertical scaling
✅ **Security** - Multiple layers of protection
✅ **Performance** - Optimized queries, caching
✅ **Maintainability** - Clean separation of concerns
✅ **Reliability** - Error handling, monitoring
✅ **Flexibility** - Multiple deployment options

---

**Last Updated:** November 20, 2025
**Version:** 2.1.0
