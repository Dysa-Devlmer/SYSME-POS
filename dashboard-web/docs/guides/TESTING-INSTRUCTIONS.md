# 🧪 SYSME POS - Testing Instructions
## How to Test the Current System

---

## 📋 PRE-REQUISITES

Make sure you have installed:
- Node.js v16 or higher
- npm v8 or higher

---

## 🚀 STEP 1: Install Dependencies

```bash
cd C:\jarvis-standalone\Proyectos\SYSME-POS\dashboard-web\backend
npm install
```

This will install all required packages:
- express
- better-sqlite3
- bcryptjs
- jsonwebtoken
- cors
- helmet
- express-rate-limit
- socket.io
- winston
- prom-client
- dotenv
- And more...

---

## 🗄️ STEP 2: Initialize Database

Run the database initialization script:

```bash
node init-database.js
```

You should see output like:
```
🚀 SYSME POS - Database Initialization
=====================================

✅ Created data directory
✅ Connected to database: C:\...\backend\data\sysme-pos.db

📁 Found 10 migration files

⏳ Running migration: 001_core_tables.sql...
   ✅ 001_core_tables.sql completed
⏳ Running migration: 002_sales_tables.sql...
   ✅ 002_sales_tables.sql completed
...

✅ Migrations completed: 10/10
📊 Total tables created: 75

📈 Database Statistics:
=====================================
   Companies: 1
   Locations: 1
   Users: 1
   Categories: 4
   Products: 0
   Tables: 0

✨ Database initialization complete!
```

---

## ⚙️ STEP 3: Configure Environment

Create a `.env` file in the backend directory:

```bash
# Copy the example
cp .env.example .env
```

Or create manually with this content:

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_PATH=./data/sysme-pos.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Backup
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30

# Metrics
METRICS_ENABLED=true

# Maintenance Mode
MAINTENANCE_MODE=false
```

---

## 🔥 STEP 4: Start the Backend Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:
```
[INFO] SYSME POS Backend Server starting...
[INFO] Environment: development
[INFO] Database initialized successfully
[INFO] Socket.IO initialized
[INFO] Metrics service initialized
[INFO] Backup service initialized
[INFO] Server running on http://localhost:3000
[INFO] API Documentation: http://localhost:3000/api
[INFO] Metrics: http://localhost:3000/metrics
[INFO] Health Check: http://localhost:3000/health
```

---

## 🧪 STEP 5: Test the API

### 5.1 Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-20T...",
  "uptime": 123.45,
  "database": "connected"
}
```

### 5.2 Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@sysme.com",
      "role": "super_admin",
      "first_name": "System",
      "last_name": "Administrator"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

**Save the `access_token` for subsequent requests!**

### 5.3 Get Products

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 5.4 Get Categories

```bash
curl http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bebidas",
      "description": "Bebidas y refrescos",
      "icon": "🥤",
      "color": "#3B82F6",
      "product_count": 0
    },
    {
      "id": 2,
      "name": "Comida",
      "description": "Platillos principales",
      "icon": "🍽️",
      "color": "#EF4444",
      "product_count": 0
    },
    ...
  ]
}
```

### 5.5 Create a Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 2,
    "sku": "PROD-001",
    "name": "Hamburguesa Clásica",
    "description": "Hamburguesa de res con queso, lechuga y tomate",
    "base_price": 89.00,
    "cost": 35.00,
    "tax_rate": 16,
    "is_taxable": true,
    "track_inventory": true,
    "stock_quantity": 50,
    "min_stock_level": 10
  }'
```

### 5.6 Create an Order

```bash
curl -X POST http://localhost:3000/api/sales/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dine_in",
    "customer_name": "Juan Pérez",
    "customer_phone": "555-1234",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "modifiers": []
      }
    ],
    "notes": "Sin cebolla"
  }'
```

### 5.7 Get All Orders

```bash
curl http://localhost:3000/api/sales/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 5.8 Process Payment

```bash
curl -X POST http://localhost:3000/api/sales/orders/1/payment \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "cash",
    "amount": 200.00
  }'
```

---

## 📊 STEP 6: Check Metrics

Visit in your browser:
```
http://localhost:3000/metrics
```

You'll see Prometheus-format metrics like:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/products",status="200"} 15

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/products"} 12
```

---

## 🔍 STEP 7: Check Logs

Logs are saved in `backend/logs/`:

```bash
# View application logs
tail -f backend/logs/application.log

# View error logs
tail -f backend/logs/error.log
```

---

## 💾 STEP 8: Check Backups

Backups are automatically created every 24 hours (configurable) in `backend/backups/`:

```bash
ls backend/backups/
```

You should see files like:
```
sysme-pos-2025-11-20-080000.db
sysme-pos-2025-11-20-080000.db.gz
```

---

## 🧪 STEP 9: Test with Postman

1. Import this Postman collection URL (create one with all endpoints above)
2. Set environment variable `BASE_URL` to `http://localhost:3000`
3. Login to get token
4. Use token in Authorization header for all requests

---

## ⚡ STEP 10: Test Real-time Features

Open two browser tabs with this HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SYSME POS - Real-time Test</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <h1>SYSME POS Real-time Test</h1>
    <div id="events"></div>

    <script>
        const socket = io('http://localhost:3000');

        socket.on('connect', () => {
            console.log('Connected to server');
            document.getElementById('events').innerHTML += '<p>✅ Connected to server</p>';

            // Join location room
            socket.emit('join:location', 1);
        });

        socket.on('order:created', (order) => {
            console.log('New order:', order);
            document.getElementById('events').innerHTML +=
                `<p>🆕 New Order: ${order.order_number} - $${order.total}</p>`;
        });

        socket.on('order:updated', (order) => {
            console.log('Order updated:', order);
            document.getElementById('events').innerHTML +=
                `<p>🔄 Order Updated: ${order.order_number} - Status: ${order.status}</p>`;
        });

        socket.on('payment:processed', (data) => {
            console.log('Payment processed:', data);
            document.getElementById('events').innerHTML +=
                `<p>💰 Payment Processed: Order ${data.orderId} - $${data.payment.amount}</p>`;
        });
    </script>
</body>
</html>
```

Create an order in one tab, and you should see it appear in real-time in the other tab!

---

## 🐛 TROUBLESHOOTING

### Database Locked Error
```
Error: database is locked
```

**Solution:** Close any other connections to the database and restart the server.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Change the port in `.env` or kill the process using port 3000:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### JWT Secret Not Set
```
Error: JWT_SECRET is not defined
```

**Solution:** Make sure you have a `.env` file with `JWT_SECRET` set.

---

## ✅ EXPECTED RESULTS

After following all steps, you should be able to:

1. ✅ Start the backend server successfully
2. ✅ Initialize database with 75+ tables
3. ✅ Login with default credentials
4. ✅ Create products
5. ✅ Create orders
6. ✅ Process payments
7. ✅ See real-time updates via WebSocket
8. ✅ View metrics
9. ✅ Check logs
10. ✅ Verify backups

---

## 📞 NEXT STEPS

Once the backend is tested and working:

1. Test all API endpoints
2. Load test with multiple concurrent requests
3. Test error scenarios (invalid data, unauthorized access, etc.)
4. Test backup and restore procedures
5. Set up frontend to connect to this backend

---

## 🎉 SUCCESS CRITERIA

The system is working correctly if:

- ✅ Server starts without errors
- ✅ All 10 migrations run successfully
- ✅ Login returns valid JWT tokens
- ✅ Can create products, categories, orders
- ✅ Can process payments
- ✅ Real-time events work via Socket.IO
- ✅ Metrics endpoint returns data
- ✅ Logs are being written
- ✅ Backups are created automatically

---

**🚀 Happy Testing!**
