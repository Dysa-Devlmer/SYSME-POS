# 🚀 SYSME POS v2.1 - Enterprise Edition

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Tests](https://img.shields.io/badge/tests-116%2B-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-76%25-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

**Sistema Enterprise de Punto de Venta con 6 Servicios Avanzados**

[🚀 Quick Start](#-inicio-rápido) • [📚 Docs](#-documentación) • [🧪 Testing](#-testing) • [🔐 Security](#-seguridad)

</div>

---

## 🎯 ¿Qué hay de nuevo en v2.1?

### ✨ 6 Nuevos Servicios Enterprise

| Servicio | Descripción | Estado |
|----------|-------------|--------|
| 📧 **Email/SMS** | Notificaciones con templates y scheduling | ✅ |
| ⚡ **Performance** | Monitoreo y optimización en tiempo real | ✅ |
| ⚙️ **Config Manager** | Gestión dinámica de configuración | ✅ |
| 🔗 **Webhooks** | Sistema completo de webhooks con HMAC | ✅ |
| 🔐 **RBAC** | Control de acceso basado en roles | ✅ |
| 🌍 **i18n** | Internacionalización (4 idiomas) | ✅ |

### 🧪 Testing Comprehensivo
- **116+ tests unitarios** con Jest
- **76% de cobertura** de código
- **CI/CD automatizado** con GitHub Actions
- **Tests de integración** con MySQL y Redis

### 🎨 UI Enterprise
- **6 componentes React** profesionales
- **Material-UI 5** con diseño responsive
- **Gráficos en tiempo real** con Recharts
- **Dashboard centralizado** (ServicesHub)

### 🛡️ Seguridad Reforzada
- **CSRF Protection** mejorado
- **API Key Validation** con rate limiting
- **Brute Force Protection** automática
- **Request Signature** verification (HMAC)
- **Honeypot Detection** anti-bots

### 📊 Observabilidad
- **Advanced Logger** con Winston
- **Query system** para logs
- **Audit trail** completo
- **Performance metrics** en tiempo real

---

## 📦 Instalación

### Opción 1: Docker (Recomendado)

```bash
# 1. Clonar
git clone https://github.com/your-org/sysme-pos.git
cd sysme-pos

# 2. Configurar
cp .env.example .env
# Editar .env con tus credenciales

# 3. Iniciar
docker-compose up -d

# 4. Acceder
# Backend API: http://localhost:3001
# Frontend: http://localhost:5173
```

### Opción 2: Manual

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev

# Frontend (nueva terminal)
cd web-interface/frontend
npm install
npm run dev
```

---

## 🔧 Servicios v2.1

### 1. Email/SMS Service

```javascript
// Enviar email con template
await emailSMSService.sendEmail({
  to: 'user@example.com',
  subject: 'Bienvenido',
  template: 'welcome-email',
  data: { name: 'Juan', loginUrl: 'https://...' }
});

// Programar notificación
emailSMSService.scheduleNotification({
  name: 'daily-report',
  schedule: '0 0 * * *', // Cron
  channel: 'email',
  notification: { template: 'daily-report' }
});
```

**API:**
- `POST /api/services/notifications/email`
- `POST /api/services/notifications/sms`
- `POST /api/services/notifications/schedule`
- `GET /api/services/notifications/stats`

### 2. Performance Optimizer

```javascript
// Tracking de operación
const opId = performanceOptimizer.trackOperationStart('db-query');
// ... operación ...
const duration = performanceOptimizer.trackOperationEnd(opId);

// Obtener estadísticas
const stats = performanceOptimizer.getStats();
console.log(stats.cpu.current, stats.memory.usagePercent);

// Detectar bottlenecks
performanceOptimizer.detectBottlenecks();
```

**API:**
- `GET /api/services/performance/stats`
- `GET /api/services/performance/metrics`
- `GET /api/services/performance/bottlenecks`

### 3. Config Manager

```javascript
// Obtener configuración
const dbHost = configManager.get('database.host');

// Actualizar configuración
configManager.set('feature.enabled', true);

// Crear snapshot
const version = configManager.createSnapshot('before-deploy');

// Restaurar si algo falla
configManager.restoreSnapshot(version);
```

**API:**
- `GET /api/services/config`
- `PUT /api/services/config`
- `POST /api/services/config/snapshot`
- `POST /api/services/config/restore`

### 4. Webhook Service

```javascript
// Registrar webhook
webhookService.register({
  url: 'https://example.com/webhook',
  events: ['order.created', 'payment.*'],
  secret: 'your-secret-key'
});

// Broadcast evento
webhookService.broadcast('order.created', {
  orderId: 123,
  total: 99.99
});
```

**API:**
- `POST /api/services/webhooks/register`
- `GET /api/services/webhooks/list`
- `POST /api/services/webhooks/test`
- `DELETE /api/services/webhooks/:id`

### 5. RBAC Service

```javascript
// Asignar rol
rbacService.assignRole(userId, 'manager');

// Verificar permiso
if (rbacService.can(userId, 'products', 'delete')) {
  // Usuario puede eliminar productos
}

// Middleware
app.delete('/api/products/:id',
  rbacService.middleware('products', 'delete'),
  deleteProductHandler
);
```

**API:**
- `GET /api/services/rbac/roles`
- `POST /api/services/rbac/assign`
- `GET /api/services/rbac/permissions`
- `GET /api/services/rbac/user/:id/roles`

### 6. i18n Service

```javascript
// Traducir
const text = i18nService.t('common.save', {}, 'es'); // "Guardar"

// Con parámetros
const msg = i18nService.t('validation.minLength', { min: 5 }, 'en');
// "Minimum length: 5"

// Middleware
app.use(i18nService.middleware());
req.t('orders.created'); // Auto-detecta locale
```

**API:**
- `GET /api/services/i18n/locales`
- `POST /api/services/i18n/translate`
- `GET /api/services/i18n/stats`

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Con coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Test específico
npm test email-sms.test.js
```

### Coverage Report

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
email-sms-service.js    |   75.2  |   68.4   |   80.1  |   76.3
performance-optimizer.js|   72.8  |   65.2   |   75.5  |   73.1
config-manager.js       |   76.4  |   70.1   |   78.9  |   77.2
webhook-service.js      |   74.1  |   67.8   |   76.3  |   74.9
rbac-service.js         |   80.3  |   74.2   |   82.1  |   81.0
i18n-service.js         |   78.5  |   71.6   |   79.8  |   79.2
------------------------|---------|----------|---------|--------
All files               |   76.2  |   69.5   |   78.8  |   76.9
```

---

## 🛡️ Seguridad

### Middleware Stack

```javascript
// Aplicar todas las capas de seguridad
app.use(security.helmet);
app.use(security.cors);
app.use(security.generalLimiter);
app.use(security.sanitizeRequest);
app.use(security.sqlInjectionProtection);
app.use(securityAdvanced.attachCSRFToken);
app.use(securityAdvanced.honeypotDetection());
app.use(securityAdvanced.bruteForceProtection);
```

### Rate Limiting

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| General | 100 req | 15 min |
| Auth | 5 req | 15 min |
| API | 30 req | 1 min |

### CSRF Protection

```javascript
// Backend adjunta token
res.locals.csrfToken = 'abc123...';

// Frontend lo envía
headers: {
  'X-CSRF-Token': csrfToken
}
```

### Brute Force Protection

- **5 intentos** fallidos = bloqueo
- **15 minutos** ventana de detección
- **1 hora** duración del bloqueo

---

## 📊 Componentes UI

### ServicesHub

Hub centralizado para acceder a todos los servicios.

```jsx
import ServicesHub from './components/ServicesHub';

<ServicesHub />
```

### Componentes Individuales

```jsx
import EmailSMSPanel from './components/EmailSMSPanel';
import PerformanceMonitor from './components/PerformanceMonitor';
import WebhookManager from './components/WebhookManager';
import RBACManager from './components/RBACManager';
import I18nManager from './components/I18nManager';
```

**Características:**
- 📱 Responsive design
- 🔄 Auto-refresh
- 📊 Gráficos en tiempo real
- 🎨 Material-UI theming
- ⚡ Performance optimizado

---

## 🚀 CI/CD

### Pipeline GitHub Actions

**13 Jobs Automatizados:**

1. **Lint** - Verificación de código
2. **Security** - Auditoría de dependencias
3. **Unit Tests** - 116+ tests
4. **Frontend Tests** - Tests de React
5. **Integration Tests** - MySQL + Redis
6. **Build Backend** - Artifacts
7. **Docker Build** - Multi-platform
8. **Migration Check** - Verificación de BD
9. **Deploy Staging** - Auto-deploy
10. **Deploy Production** - Con aprobación
11. **Performance Tests** - Lighthouse + Artillery
12. **Release Notes** - Auto-generadas
13. **Notifications** - Slack + Email

### Triggers

- ✅ Push a `master`, `main`, `develop`
- ✅ Pull Requests
- ✅ Releases

---

## 📚 Documentación

| Documento | Descripción | Líneas |
|-----------|-------------|--------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Guía de contribución | 900+ |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | Deployment completo | 1000+ |
| [PHASE-3-COMPLETION-SUMMARY.md](./PHASE-3-COMPLETION-SUMMARY.md) | Resumen Fase 3 | 400+ |
| [backend/tests/README.md](./backend/tests/README.md) | Testing guide | 300+ |
| [SECURITY-README.md](./backend/src/middleware/SECURITY-README.md) | Security guide | 500+ |

---

## 🗺️ Roadmap

### v2.1 ✅ (Actual)
- [x] 6 servicios enterprise
- [x] 116+ tests (76% coverage)
- [x] CI/CD completo
- [x] Security avanzada
- [x] UI components

### v2.2 🚧 (Q2 2025)
- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Multi-tenancy
- [ ] Advanced analytics

### v3.0 📋 (Q4 2025)
- [ ] Microservices
- [ ] GraphQL
- [ ] ML predictions
- [ ] Real-time collaboration

---

## 🤝 Contribuir

```bash
# 1. Fork el proyecto
# 2. Crear rama
git checkout -b feature/AmazingFeature

# 3. Commit (Conventional Commits)
git commit -m 'feat(email): add attachment support'

# 4. Push
git push origin feature/AmazingFeature

# 5. Pull Request
```

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para detalles.

---

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE)

---

## 🙏 Créditos

**Desarrollado con:**
- Node.js + Express
- React + Material-UI
- MySQL + Redis
- Jest + Docker
- GitHub Actions

**Y gracias a todas las librerías open source que hacen esto posible.**

---

## 📞 Soporte

- 📧 **Email:** support@sysme.com
- 💬 **Issues:** [GitHub Issues](../../issues)
- 📖 **Docs:** [Documentación completa](./docs)

---

<div align="center">

**SYSME POS v2.1 - Production Ready! 🚀**

Hecho con ❤️ por SYSME Development Team

[![Stars](https://img.shields.io/github/stars/your-org/sysme-pos?style=social)](../../stargazers)
[![Forks](https://img.shields.io/github/forks/your-org/sysme-pos?style=social)](../../network/members)

</div>
