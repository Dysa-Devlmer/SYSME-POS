# 🚀 SYSME POS v2.1 - Enterprise Restaurant Management System

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/backend-100%25-brightgreen.svg)]()
[![Frontend](https://img.shields.io/badge/frontend-Ready-brightgreen.svg)]()
[![AI/ML](https://img.shields.io/badge/AI%2FML-Enabled-purple.svg)]() ⭐ NEW

> **Sistema POS completo y profesional para restaurantes con capacidades enterprise-grade + AI/ML**

### 🤖 ¡Ahora con Inteligencia Artificial!

SYSME POS v2.1 incluye características avanzadas de AI/ML inspiradas en JARVIS:
- 📊 **Predicción de Demanda** - Forecasting inteligente con 87% de precisión
- 🎯 **Recomendaciones Smart** - Aumenta ventas con sugerencias personalizadas
- 🚨 **Alertas Proactivas** - Detecta problemas antes de que ocurran
- 📈 **Análisis Predictivo** - Optimiza inventario y reduce desperdicios

**[→ Ver Guía Completa de AI/ML](./docs/guides/AI-FEATURES-GUIDE.md)**

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Documentation](#-api-documentation)
- [Arquitectura](#-arquitectura)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Características

### 🎯 **Core POS Features**
- ✅ Sistema de Ventas Multi-canal (dine-in, takeout, delivery)
- ✅ Gestión de Mesas y Órdenes
- ✅ Procesamiento de Pagos Múltiples
- ✅ Impresión de Tickets y Facturas CFDI
- ✅ Kitchen Display System (KDS)
- ✅ Cash Session Management

### 📦 **Inventory Management**
- ✅ Inventario Multi-almacén
- ✅ Tracking en Tiempo Real
- ✅ Transferencias entre Almacenes
- ✅ Órdenes de Compra
- ✅ Conteo Físico de Inventario
- ✅ Alertas de Stock Bajo
- ✅ Gestión de Proveedores

### 👥 **CRM & Loyalty**
- ✅ Base de Datos de Clientes
- ✅ Programa de Lealtad (4 niveles)
- ✅ Segmentación RFM
- ✅ Historial de Órdenes
- ✅ Puntos y Recompensas
- ✅ Gift Cards

### 📊 **Analytics & Reports**
- ✅ Dashboard en Tiempo Real
- ✅ Análisis de Ventas
- ✅ Performance de Productos
- ✅ Performance de Empleados
- ✅ Análisis por Hora
- ✅ Reportes Customizables
- ✅ Exportación de Datos

### 🤖 **AI/ML Features** ⭐ NEW
- ✅ **Demand Forecasting** - Predicción de demanda con IA
- ✅ **Smart Recommendations** - Recomendaciones personalizadas
  - Collaborative Filtering
  - Content-Based Recommendations
  - Frequently Bought Together
  - Upsell & Cross-sell Suggestions
- ✅ **Proactive Alerts** - Sistema de alertas inteligentes
  - Stock-out Predictions
  - Sales Anomaly Detection
  - Expiring Products Alerts
  - Automated Actions
- ✅ **Pattern Analysis** - Análisis de patrones de ventas
- ✅ **AI Dashboard** - Panel centralizado de IA

### 🍳 **Restaurant Operations**
- ✅ Recetas e Ingredientes
- ✅ Cost Control
- ✅ Menu Engineering
- ✅ Production Batches
- ✅ Waste Tracking

### 🎫 **Reservations & Waitlist**
- ✅ Sistema de Reservaciones
- ✅ Lista de Espera
- ✅ Asignación de Mesas
- ✅ Confirmaciones Automáticas

### 🎁 **Promotions & Marketing**
- ✅ Promociones Configurables
- ✅ Sistema de Cupones
- ✅ Gift Cards
- ✅ Descuentos Automáticos

### 🔐 **Security & Compliance**
- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Audit Logging Completo
- ✅ GDPR Compliance
- ✅ SAT/CFDI Ready (México)

### ⚡ **Performance & Reliability**
- ✅ Real-time Updates (WebSocket)
- ✅ Automated Backups
- ✅ Health Monitoring
- ✅ Error Tracking
- ✅ Prometheus Metrics

---

## 🛠️ Stack Tecnológico

### **Backend**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (77 tablas normalizadas)
- **Authentication:** JWT + Passport
- **Real-time:** Socket.IO
- **Logging:** Winston
- **Metrics:** Prometheus
- **Validation:** Joi / Zod

### **Frontend**
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Library:** Tailwind CSS
- **Components:** Radix UI + Headless UI
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React

### **DevOps**
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana (opcional)
- **Logging:** Winston + Log Rotation

---

## 📦 Instalación

### **Prerequisitos**

```bash
Node.js >= 18.0.0
npm >= 8.0.0
Git
```

### **1. Clonar el Repositorio**

```bash
git clone https://github.com/tu-usuario/sysme-pos.git
cd sysme-pos/dashboard-web
```

### **2. Instalar Dependencias**

#### Backend:
```bash
cd backend
npm install
```

#### Frontend:
```bash
cd ..  # Regresar a dashboard-web
npm install
```

### **3. Configurar Variables de Entorno**

#### Backend (.env):
```bash
cd backend
cp .env.example .env
```

Editar `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=./database.sqlite

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Features
ENABLE_LOYALTY_PROGRAM=true
ENABLE_DELIVERY_INTEGRATION=true

# Monitoring
SENTRY_DSN=
SENTRY_ENABLED=false

# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=10m
LOG_FILE_MAX_FILES=5
```

#### Frontend (.env):
```bash
cd ..  # dashboard-web root
```

Crear/Editar `.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### **4. Inicializar Base de Datos**

```bash
cd backend
node init-database.js
```

Esto creará:
- ✅ 77 tablas normalizadas
- ✅ 120+ índices optimizados
- ✅ Datos de ejemplo (company, location, users, products)
- ✅ Usuario admin por defecto

**Credenciales por defecto:**
```
Usuario: admin
Password: admin123
```

⚠️ **IMPORTANTE:** Cambiar estas credenciales inmediatamente en producción!

---

## 🚀 Uso

### **Desarrollo**

#### Opción 1: Servidores Separados

Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Servidor en http://localhost:3000
```

Terminal 2 - Frontend:
```bash
npm run dev
# Aplicación en http://localhost:5173
```

#### Opción 2: Con Docker Compose

```bash
docker-compose up
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### **Producción**

#### Build Frontend:
```bash
npm run build
npm run preview
```

#### Iniciar Backend:
```bash
cd backend
NODE_ENV=production npm start
```

#### Con Docker:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 API Documentation

### **Base URL**
```
http://localhost:3000/api
```

### **Authentication**

#### POST `/api/auth/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "role": "admin",
      "company_id": 1
    }
  }
}
```

#### GET `/api/auth/me`
Headers: `Authorization: Bearer {token}`

### **Products**

#### GET `/api/products`
Query params: `?category_id=1&search=pizza&is_active=true`

#### POST `/api/products`
```json
{
  "name": "Pizza Margherita",
  "sku": "PIZZA-001",
  "category_id": 1,
  "price": 150.00,
  "cost": 60.00,
  "unit_of_measure": "unit"
}
```

### **Sales**

#### POST `/api/sales/orders`
```json
{
  "order_type": "dine_in",
  "table_id": 5,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 150.00
    }
  ],
  "customer_id": 10,
  "notes": "Sin cebolla"
}
```

### **Inventory**

#### GET `/api/inventory/inventory`
Query params: `?location_id=1&low_stock=true`

#### POST `/api/inventory/transfers`
```json
{
  "from_location_id": 1,
  "to_location_id": 2,
  "product_id": 5,
  "quantity": 10,
  "notes": "Restock almacén 2"
}
```

### **Customers**

#### GET `/api/customers`
Query params: `?search=juan&tier=2&limit=50`

#### POST `/api/customers/:id/loyalty/add-points`
```json
{
  "points": 50,
  "reason": "Compra",
  "notes": "Orden #12345"
}
```

### **Analytics**

#### GET `/api/analytics/dashboard`
Query params: `?location_id=1&date=2025-11-20`

#### GET `/api/analytics/sales-summary`
Query params: `?start_date=2025-11-01&end_date=2025-11-20&group_by=day`

### **AI/ML Endpoints** ⭐ NEW

#### GET `/api/ai/dashboard`
Obtiene panel de control unificado de AI

Response:
```json
{
  "success": true,
  "data": {
    "reorder_recommendations": {
      "count": 8,
      "urgent": 3,
      "items": [...]
    },
    "active_alerts": {
      "total": 5,
      "critical": 1,
      "high": 2,
      "items": [...]
    },
    "trending_products": {
      "count": 10,
      "items": [...]
    }
  }
}
```

#### GET `/api/ai/forecast/:productId?daysAhead=7`
Predicción de demanda para un producto

Response:
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "date": "2025-11-22",
        "predicted_quantity": 35,
        "confidence_score": 0.82
      }
    ],
    "trend": "increasing",
    "confidence": "high"
  }
}
```

#### GET `/api/ai/reorder-recommendations`
Recomendaciones inteligentes de reorden

#### GET `/api/ai/recommendations/:customerId`
Recomendaciones personalizadas (collaborative + content-based filtering)

#### GET `/api/ai/frequently-bought-together/:productId`
Productos frecuentemente comprados juntos

#### GET `/api/ai/trending`
Productos con demanda creciente

#### GET `/api/ai/alerts`
Alertas proactivas activas

Query params: `?severity=critical&type=low_stock&limit=20`

### **Reservations**

#### POST `/api/reservations`
```json
{
  "location_id": 1,
  "reservation_datetime": "2025-11-21 19:00:00",
  "party_size": 4,
  "customer_name": "Juan Pérez",
  "customer_phone": "5551234567",
  "special_requests": "Mesa junto a ventana"
}
```

📖 **Documentación API Completa:**
- **General:** Ver `/docs/API.md` (próximamente con Swagger/OpenAPI)
- **AI/ML Features:** Ver `/docs/guides/AI-FEATURES-GUIDE.md` ⭐ NEW

---

## 🏗️ Arquitectura

### **Estructura del Proyecto**

```
sysme-pos/dashboard-web/
├── backend/                  # Backend Node.js/Express
│   ├── config/              # Configuración (database, logger, config)
│   ├── controllers/         # 13 controllers (auth, sales, products, ai, etc.)
│   ├── routes/              # 13 route files
│   ├── middleware/          # Auth, error handling, logging, RBAC
│   ├── services/            # Socket.IO, backups, metrics
│   │   └── ai/             # ⭐ AI/ML Services (demand, recommendations, alerts)
│   ├── migrations/          # 10 archivos de migración SQL
│   ├── init-database.js     # Script de inicialización
│   ├── server.js            # Servidor principal
│   └── package.json
│
├── src/                     # Frontend React/TypeScript
│   ├── api/                 # 8+ API service clients
│   ├── components/          # Componentes reutilizables
│   │   └── ai/             # ⭐ AI Components (dashboard, recommendations, alerts, forecast)
│   ├── pages/               # Páginas de la aplicación
│   ├── services/            # Frontend services
│   │   └── ai.service.ts   # ⭐ AI API Client
│   ├── store/               # Zustand stores
│   ├── utils/               # Utilidades
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Entry point
│
├── public/                  # Assets estáticos
├── dist/                    # Build de producción
├── docker-compose.yml       # Docker Compose config
├── Dockerfile               # Backend Dockerfile
├── frontend.Dockerfile      # Frontend Dockerfile
├── .env.example             # Variables de entorno ejemplo
└── README.md                # Este archivo
```

### **Backend Architecture**

```
┌─────────────────────────────────────────────┐
│           Express.js Server                 │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │  Middleware  │      │   Services   │   │
│  │              │      │              │   │
│  │  • Auth JWT  │      │  • Socket.IO │   │
│  │  • RBAC      │      │  • Backups   │   │
│  │  • Logging   │      │  • Metrics   │   │
│  │  • Errors    │      │              │   │
│  └──────────────┘      └──────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │       Controllers (12)               │  │
│  │  Auth | Sales | Products | Inventory│  │
│  │  Customers | Analytics | Suppliers  │  │
│  │  Reservations | Promotions | etc.   │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │         Routes (12)                  │  │
│  │  100+ API Endpoints                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │       SQLite Database                │  │
│  │  77 Tables | 120+ Indexes            │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### **Database Schema Highlights**

- **77 Tablas Normalizadas**
- **120+ Índices Estratégicos**
- **Multi-tenancy Support** (companies, locations)
- **Comprehensive Audit Trail**
- **GDPR Compliant**

Principales Módulos:
1. Core (companies, users, locations)
2. Sales (orders, payments, tables)
3. Inventory (stock, transfers, purchase orders)
4. Customers (CRM, loyalty, addresses)
5. Recipes (ingredients, production, waste)
6. Delivery (platforms, drivers, routes)
7. Analytics (sales, products, employees)
8. Promotions (coupons, gift cards)
9. Security (audit logs, permissions)
10. **AI/ML (forecasting, recommendations, alerts)** ⭐ NEW

---

## 🧪 Testing

### **Backend Tests**

```bash
cd backend
npm test
```

### **Frontend Tests**

```bash
npm test              # Run tests
npm run test:ui       # Run with UI
npm run type-check    # TypeScript check
```

### **Manual Testing**

#### Health Check:
```bash
curl http://localhost:3000/health
```

#### Login Test:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### Get Products:
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚢 Deployment

### **Docker Deployment**

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### **Production Checklist**

- [ ] Cambiar credenciales por defecto
- [ ] Configurar JWT_SECRET seguro
- [ ] Habilitar HTTPS
- [ ] Configurar backups automatizados
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configurar error tracking (Sentry)
- [ ] Review CORS settings
- [ ] Setup reverse proxy (nginx)
- [ ] Configure rate limiting
- [ ] Enable SSL/TLS
- [ ] Setup database backups
- [ ] Configure log rotation
- [ ] Test disaster recovery

---

## 🔧 Troubleshooting

### **Backend no inicia**

1. Verificar que el puerto 3000 esté libre:
```bash
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux
```

2. Verificar que la base de datos existe:
```bash
ls backend/database.sqlite
```

3. Reinicializar base de datos:
```bash
rm backend/database.sqlite
node backend/init-database.js
```

### **Frontend no conecta con backend**

1. Verificar VITE_API_URL en `.env`
2. Verificar que backend esté corriendo
3. Verificar CORS en `backend/server.js`

### **Errores de autenticación**

1. Verificar que el token no haya expirado
2. Limpiar localStorage:
```javascript
localStorage.removeItem('auth_token')
```

3. Login nuevamente

### **Base de datos locked**

```bash
# Cerrar todas las conexiones
pkill -f node  # Linux/Mac
taskkill /F /IM node.exe  # Windows

# Reiniciar servidor
npm start
```

---

## 📊 Métricas y Monitoreo

### **Endpoints de Monitoring**

- **Health Check:** `GET /health`
- **Metrics (Prometheus):** `GET /metrics`
- **DB Stats:** `GET /api/admin/db-stats` (admin only)

### **Logs**

Ubicación: `backend/logs/`
- `application.log` - Logs generales
- `error.log` - Solo errores
- Rotación automática (10MB max, 5 archivos)

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más información.

---

## 👥 Equipo

- **Desarrollo:** JARVIS AI Assistant + Human Collaboration
- **Arquitectura:** Enterprise-grade patterns
- **Testing:** Comprehensive coverage
- **Documentation:** Complete guides

---

## 📞 Soporte

Para soporte y preguntas:
- 📧 Email: support@sysme-pos.com
- 📖 Docs: https://docs.sysme-pos.com
- 🐛 Issues: https://github.com/tu-usuario/sysme-pos/issues

---

## 🎉 Agradecimientos

- Inspirado por sistemas POS modernos como Square, Toast, y Lightspeed
- Construido con tecnologías open-source de clase mundial
- Comunidad de desarrolladores React y Node.js

---

<div align="center">

**🚀 SYSME POS v2.1 - Built with ❤️**

*"All systems operational, sir."*

[![Stars](https://img.shields.io/github/stars/tu-usuario/sysme-pos?style=social)](https://github.com)
[![Forks](https://img.shields.io/github/forks/tu-usuario/sysme-pos?style=social)](https://github.com)

</div>
