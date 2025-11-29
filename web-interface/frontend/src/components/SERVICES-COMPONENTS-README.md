# Componentes React - Servicios Enterprise v2.1

## 📋 Descripción

Suite completa de componentes React para la interfaz web de los 6 servicios enterprise de SYSME POS v2.1.

## 🎨 Componentes Principales

### 1. **ServicesHub** (`ServicesHub.jsx`)
Hub centralizado para acceder a todos los servicios.

**Características:**
- Dashboard principal con cards para cada servicio
- Navegación entre servicios
- Overview de características
- Diseño responsive con Material-UI

**Uso:**
```jsx
import ServicesHub from './components/ServicesHub';

function App() {
  return <ServicesHub />;
}
```

---

### 2. **EmailSMSPanel** (`EmailSMSPanel.jsx`)
Panel de gestión de notificaciones por Email y SMS.

**Características:**
- ✉️ Envío de emails con templates
- 📱 Envío de SMS
- 📅 Programación de notificaciones (cron)
- 📊 Estadísticas en tiempo real
- 📋 Gestión de cola de mensajes
- 📈 Métricas de success/failure rate

**API Endpoints:**
- `GET /api/services/notifications/stats` - Estadísticas
- `POST /api/services/notifications/email` - Enviar email
- `POST /api/services/notifications/sms` - Enviar SMS
- `POST /api/services/notifications/schedule` - Programar notificación

**Templates Disponibles:**
- `welcome-email`
- `order-confirmation`
- `payment-receipt`
- `low-stock-alert`
- `daily-report`

**Props:** Ninguna

**State:**
```javascript
{
  stats: {
    email: { sent, failureRate },
    sms: { sent, failureRate },
    queue: { pending, total },
    templates: number,
    scheduled: [{ name, channel, schedule, nextRun }]
  }
}
```

---

### 3. **PerformanceMonitor** (`PerformanceMonitor.jsx`)
Monitor en tiempo real del rendimiento del sistema.

**Características:**
- 📈 Gráficos en tiempo real (CPU, Memoria, Requests)
- ⚡ Métricas de operaciones
- 🔍 Detección de bottlenecks
- ⚠️ Sistema de alertas
- 📊 Análisis de performance
- 🔄 Auto-refresh cada 3 segundos

**Métricas Monitoreadas:**
- CPU usage (current, avg, max)
- Memory (heap used, heap total, percentage)
- Request rate (total, rps, avg duration)
- Uptime
- Operation tracking

**Gráficos:**
- Area Chart: CPU Usage
- Area Chart: Memory Usage
- Line Chart: Request Rate

**Tabs:**
1. **Gráficos** - Visualización en tiempo real
2. **Operaciones** - Top operations por duración
3. **Bottlenecks** - Problemas de rendimiento detectados
4. **Alertas** - Alertas activas del sistema

**API Endpoints:**
- `GET /api/services/performance/stats` - Estadísticas completas

---

### 4. **WebhookManager** (`WebhookManager.jsx`)
Gestión completa de webhooks para integraciones externas.

**Características:**
- 🔗 Registro/edición/eliminación de webhooks
- 🔐 Firmas HMAC SHA256
- 🔄 Sistema de reintentos
- 🎯 Filtrado de eventos (wildcards)
- ⏱️ Rate limiting
- 📊 Estadísticas de deliveries
- 🧪 Testing de webhooks

**Eventos Disponibles:**
- `order.*` - created, updated, cancelled
- `payment.*` - completed, failed
- `product.*` - created, updated, deleted
- `inventory.*` - low_stock
- `user.*` - created, updated

**API Endpoints:**
- `GET /api/services/webhooks/list` - Lista de webhooks
- `POST /api/services/webhooks/register` - Crear webhook
- `PUT /api/services/webhooks/:id` - Actualizar webhook
- `DELETE /api/services/webhooks/:id` - Eliminar webhook
- `POST /api/services/webhooks/test` - Probar webhook
- `GET /api/services/webhooks/stats` - Estadísticas

**Webhook Schema:**
```javascript
{
  id: string,
  url: string,
  events: string[],
  secret: string,
  active: boolean,
  retryAttempts: number,
  timeout: number,
  metadata: object
}
```

---

### 5. **RBACManager** (`RBACManager.jsx`)
Control de acceso basado en roles y permisos.

**Características:**
- 👥 Gestión de roles predefinidos
- 🔑 Asignación de permisos
- 👤 Asignación de roles a usuarios
- ♻️ Cache de permisos
- 🎨 Visualización jerárquica
- 📊 Estadísticas de uso

**Roles Predefinidos:**
- `super_admin` - Acceso total
- `admin` - Administración general
- `manager` - Gestión de órdenes y reportes
- `cashier` - Cajero/ventas
- `waiter` - Mesero/atención
- `inventory_manager` - Gestión de inventario
- `kitchen` - Cocina
- `viewer` - Solo lectura

**Formato de Permisos:**
```
resource:action
Ej: products:create, orders:*, *:read
```

**API Endpoints:**
- `GET /api/services/rbac/roles` - Lista de roles
- `GET /api/services/rbac/permissions` - Lista de permisos
- `POST /api/services/rbac/assign` - Asignar rol
- `POST /api/services/rbac/remove` - Remover rol
- `POST /api/services/rbac/role/permission` - Agregar permiso a rol
- `GET /api/services/rbac/stats` - Estadísticas

**Tabs:**
1. **Roles** - Cards con información de cada rol
2. **Permisos** - Tabla de permisos del sistema
3. **Usuarios** - Gestión de roles de usuarios

---

### 6. **I18nManager** (`I18nManager.jsx`)
Sistema de internacionalización multi-idioma.

**Características:**
- 🌍 Soporte multi-idioma (ES, EN, PT, FR)
- 🔍 Detección automática de locale
- 📝 Interpolación de parámetros
- 🔄 Sistema de fallbacks
- 📊 Tracking de claves faltantes
- ⚡ Cache de traducciones
- 🧪 Herramienta de testing

**Locales Soportados:**
- 🇪🇸 Español (es) - Default
- 🇺🇸 English (en)
- 🇧🇷 Português (pt)
- 🇫🇷 Français (fr)

**API Endpoints:**
- `GET /api/services/i18n/locales` - Lista de locales
- `POST /api/services/i18n/translate` - Traducir clave
- `GET /api/services/i18n/stats` - Estadísticas

**Ejemplo de Uso:**
```javascript
// Traducción simple
t('common.save', {}, 'es') → 'Guardar'

// Con parámetros
t('validation.minLength', { min: 5 }, 'en') → 'Minimum length: 5'
```

**Tabs:**
1. **Locales** - Cards con información de cada idioma
2. **Missing Keys** - Claves de traducción faltantes
3. **Test Translation** - Herramienta de testing

---

## 📦 Dependencias

```json
{
  "dependencies": {
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "recharts": "^2.10.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled recharts

# O con yarn
yarn add @mui/material @mui/icons-material @emotion/react @emotion/styled recharts
```

## 📝 Integración con App.jsx

```jsx
import React from 'react';
import ServicesHub from './components/ServicesHub';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ServicesHub />
    </ThemeProvider>
  );
}

export default App;
```

## 🔐 Autenticación

Todos los componentes esperan un JWT token en localStorage:

```javascript
localStorage.setItem('token', 'your-jwt-token');
```

Los requests a la API incluyen el header:
```javascript
'Authorization': `Bearer ${localStorage.getItem('token')}`
```

## 🎨 Temas y Estilos

Los componentes utilizan Material-UI y son totalmente responsive:

- **xs** (< 600px) - Mobile
- **sm** (600px - 960px) - Tablet
- **md** (960px - 1280px) - Laptop
- **lg** (1280px+) - Desktop

## 📊 Actualización de Datos

Cada componente implementa auto-refresh:

- **EmailSMSPanel**: 10 segundos
- **PerformanceMonitor**: 3 segundos
- **WebhookManager**: 10 segundos
- **I18nManager**: 15 segundos

## 🔄 Estado de Carga

Todos los componentes manejan 3 estados:

1. **Loading** - CircularProgress durante fetch
2. **Error** - Alert con mensaje de error
3. **Success** - Datos renderizados

## 🎯 Características Comunes

Todos los componentes incluyen:

- ✅ Diseño responsive
- ✅ Auto-refresh configurable
- ✅ Manejo de errores
- ✅ Loading states
- ✅ Material-UI components
- ✅ TypeScript-ready
- ✅ Accessibility (a11y)
- ✅ Dark mode ready

## 📱 Responsive Design

Los componentes se adaptan a diferentes tamaños de pantalla:

```jsx
<Grid container spacing={3}>
  <Grid item xs={12} md={6} lg={4}>
    {/* Mobile: 100%, Tablet: 50%, Desktop: 33.33% */}
  </Grid>
</Grid>
```

## 🧪 Testing

Para testing de componentes, consultar:
- `backend/tests/README.md` - Tests unitarios de servicios
- Usar `@testing-library/react` para tests de componentes

## 📚 Recursos

- [Material-UI Docs](https://mui.com/)
- [Recharts Docs](https://recharts.org/)
- [React Docs](https://react.dev/)

---

**Última actualización:** Fase 3 - v2.1.0
**Autor:** SYSME Development Team
