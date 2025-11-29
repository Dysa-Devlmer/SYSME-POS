# Advanced Logger Service - SYSME POS v2.1

## 📋 Descripción

Sistema avanzado de logging basado en Winston con soporte para múltiples transports, formatters personalizados, rotación automática, y gestión completa de logs.

## ⭐ Características Principales

- ✅ **Multi-level Logging**: error, warn, info, http, debug
- ✅ **Multiple Transports**: Console, File, HTTP, Custom
- ✅ **Auto-Rotation**: Rotación automática basada en tamaño y fecha
- ✅ **Structured Logging**: JSON y formato personalizado
- ✅ **Contextual Logging**: Child loggers con contexto
- ✅ **Filtering**: Sistema de filtros personalizables
- ✅ **Hooks**: Pre y post-log hooks
- ✅ **Audit Trail**: Logs de auditoría dedicados
- ✅ **Query System**: Búsqueda y filtrado de logs
- ✅ **Statistics**: Métricas de logging en tiempo real
- ✅ **Performance Tracking**: Monitoreo de tiempos de escritura

## 🚀 Instalación

```bash
npm install winston
```

## 📝 Uso Básico

### Inicialización

```javascript
const advancedLogger = require('./services/advanced-logger');

// Inicializar
await advancedLogger.initialize();
```

### Logging Simple

```javascript
// Log levels
advancedLogger.error('Error crítico', { code: 500 });
advancedLogger.warn('Advertencia', { user: 'john' });
advancedLogger.info('Información general', { action: 'login' });
advancedLogger.http('Request HTTP', { method: 'GET', path: '/api/users' });
advancedLogger.debug('Debug info', { data: { foo: 'bar' } });

// Log genérico
advancedLogger.log('info', 'Mensaje personalizado', { meta: 'data' });
```

### Child Loggers con Contexto

```javascript
// Crear child logger
const orderLogger = advancedLogger.child('order-service', {
  service: 'orders',
  version: '2.1.0'
});

// Usar child logger (incluye contexto automáticamente)
orderLogger.info('Nueva orden creada', { orderId: 123 });
orderLogger.error('Error procesando orden', { orderId: 123, error: 'timeout' });
```

### Audit Trail

```javascript
// Log de auditoría
advancedLogger.audit('user.login', userId, {
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  timestamp: new Date(),
  success: true
});

advancedLogger.audit('order.delete', userId, {
  orderId: 123,
  reason: 'cancelled',
  ip: req.ip
});
```

## 🔧 Configuración

### Variables de Entorno

```env
LOG_LEVEL=info                  # error, warn, info, http, debug
LOG_FORMAT=json                 # json, simple
LOG_DIRECTORY=./logs            # Directorio de logs
LOG_MAX_FILES=30                # Archivos a mantener
LOG_MAX_SIZE=20m                # Tamaño máximo (k, m, g)
LOG_CONSOLE=true                # Habilitar console
LOG_FILE=true                   # Habilitar archivos
LOG_ELASTICSEARCH=false         # Elasticsearch (futuro)
LOG_WEBHOOK_URL=                # Webhook opcional
```

### Estructura de Archivos

```
logs/
├── combined/
│   └── combined.log           # Todos los logs
├── error/
│   └── error.log              # Solo errores
├── audit/
│   └── audit.log              # Auditoría
└── http.log                   # Requests HTTP
```

## 📊 Formato de Logs

### JSON Format (Default)

```json
{
  "timestamp": "2025-01-22 10:30:45.123",
  "level": "info",
  "message": "User logged in",
  "metadata": {
    "userId": 123,
    "ip": "192.168.1.100",
    "pid": 12345,
    "hostname": "server-01",
    "env": "production"
  }
}
```

### Simple Format

```
2025-01-22 10:30:45.123 [INFO]: User logged in {"userId": 123, "ip": "192.168.1.100"}
```

## 🎯 Filtros y Hooks

### Agregar Filtro

```javascript
// Filtrar logs que contengan información sensible
advancedLogger.addFilter((level, message, meta) => {
  return meta.password || meta.secret; // true = filtrar
});

// Filtrar por nivel
advancedLogger.addFilter((level) => {
  return level === 'debug' && process.env.NODE_ENV === 'production';
});
```

### Agregar Hooks

```javascript
// Pre-log hook
advancedLogger.addHook('pre', (level, message, meta) => {
  // Ejecutado ANTES de escribir el log
  console.log('About to log:', message);
});

// Post-log hook
advancedLogger.addHook('post', (level, message, meta) => {
  // Ejecutado DESPUÉS de escribir el log
  if (level === 'error') {
    // Enviar alerta, notification, etc.
  }
});
```

## 🔍 Consulta de Logs

```javascript
// Buscar logs
const logs = await advancedLogger.queryLogs({
  level: 'error',                      // Filtrar por nivel
  startDate: '2025-01-01',             // Desde fecha
  endDate: '2025-01-31',               // Hasta fecha
  search: 'database',                  // Buscar texto
  limit: 100                           // Limitar resultados
});

console.log(`Found ${logs.length} logs`);
```

## 📈 Estadísticas

```javascript
const stats = await advancedLogger.getStats();

/*
{
  logs: {
    error: 45,
    warn: 120,
    info: 1500,
    http: 8500,
    debug: 0,
    total: 10165
  },
  files: {
    current: 15,
    total: 15,
    size: 52428800  // bytes
  },
  performance: {
    avgWriteTime: 2.5,      // ms
    maxWriteTime: 15,       // ms
    totalWrites: 10165
  },
  config: { ... },
  contexts: 3,
  filters: 2,
  hooks: 2
}
*/
```

## 🔄 Rotación y Limpieza

### Rotación Manual

```javascript
// Forzar rotación de logs
await advancedLogger.rotateLogs();
```

### Limpieza Automática

```javascript
// Limpiar logs más antiguos de 30 días
const deleted = await advancedLogger.cleanOldLogs(30);
console.log(`Deleted ${deleted} old log files`);
```

## 🌐 API Endpoints

### GET /api/services/logger/stats
Obtener estadísticas del logger.

**Response:**
```json
{
  "stats": {
    "logs": { "error": 45, "warn": 120, ... },
    "files": { ... },
    "performance": { ... }
  }
}
```

### POST /api/services/logger/query
Consultar logs con filtros.

**Request:**
```json
{
  "level": "error",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "search": "database",
  "limit": 100
}
```

**Response:**
```json
{
  "count": 45,
  "logs": [...]
}
```

### POST /api/services/logger/log
Crear log manualmente.

**Request:**
```json
{
  "level": "info",
  "message": "Custom log message",
  "meta": { "key": "value" }
}
```

### POST /api/services/logger/audit
Crear log de auditoría.

**Request:**
```json
{
  "action": "user.delete",
  "details": {
    "userId": 123,
    "reason": "violated terms"
  }
}
```

### POST /api/services/logger/rotate
Rotar logs manualmente.

**Response:**
```json
{
  "success": true,
  "message": "Logs rotated successfully"
}
```

### DELETE /api/services/logger/clean?daysOld=30
Limpiar logs antiguos.

**Response:**
```json
{
  "success": true,
  "deleted": 15,
  "message": "Deleted 15 old log files"
}
```

### GET /api/services/logger/config
Obtener configuración del logger.

**Response:**
```json
{
  "config": {
    "level": "info",
    "format": "json",
    "directory": "./logs",
    ...
  }
}
```

## 🎨 Middleware para Express

```javascript
const express = require('express');
const app = express();

// Usar middleware de logging
app.use(advancedLogger.middleware());

// Ahora todos los requests se loggean automáticamente
// GET /api/users 200 15ms
```

## 🧪 Testing

```javascript
// Mock en tests
jest.mock('./services/advanced-logger');

// O deshabilitar logs en tests
process.env.LOG_CONSOLE = 'false';
process.env.LOG_FILE = 'false';
```

## ⚠️ Consideraciones de Performance

- **Buffer Writing**: Los logs se escriben de forma asíncrona
- **Rotation Overhead**: La rotación puede causar pequeños delays
- **File I/O**: Logs en archivo son más lentos que console
- **JSON Parsing**: El formato JSON es más pesado que simple

### Optimizaciones

1. **Usar nivel apropiado**: `debug` solo en desarrollo
2. **Filtrar logs innecesarios**: Reducir ruido
3. **Rotación frecuente**: Evitar archivos muy grandes
4. **Limpieza automática**: Cron job para limpiar logs viejos

## 📦 Integración con Otros Servicios

### Con Performance Optimizer

```javascript
const performanceOptimizer = require('./performance-optimizer');

// Hook para performance monitoring
advancedLogger.addHook('post', (level, message, meta) => {
  if (meta.duration > 1000) {
    performanceOptimizer.trackSlowOperation({
      operation: message,
      duration: meta.duration
    });
  }
});
```

### Con Email/SMS Service

```javascript
const emailSMSService = require('./email-sms-service');

// Hook para alertas críticas
advancedLogger.addHook('post', (level, message, meta) => {
  if (level === 'error' && meta.critical) {
    emailSMSService.sendEmail({
      to: 'admin@sysme.com',
      subject: 'Critical Error Alert',
      template: 'error-alert',
      data: { message, meta }
    });
  }
});
```

### Con Webhook Service

```javascript
const webhookService = require('./webhook-service');

// Enviar logs críticos via webhook
advancedLogger.addHook('post', (level, message, meta) => {
  if (level === 'error') {
    webhookService.broadcast('system.error', {
      message,
      meta,
      timestamp: new Date()
    });
  }
});
```

## 📚 Mejores Prácticas

1. **Logging Estructurado**: Siempre usar metadata
   ```javascript
   // ❌ Mal
   logger.info('User 123 logged in from 192.168.1.1');

   // ✅ Bien
   logger.info('User logged in', {
     userId: 123,
     ip: '192.168.1.1'
   });
   ```

2. **Niveles Apropiados**:
   - `error`: Errores que requieren atención inmediata
   - `warn`: Situaciones anómalas pero no críticas
   - `info`: Eventos importantes del sistema
   - `http`: Requests HTTP
   - `debug`: Información de debugging (solo desarrollo)

3. **No Loggear Información Sensible**:
   ```javascript
   // ❌ Mal
   logger.info('User auth', { password: '123456' });

   // ✅ Bien
   logger.info('User auth', { userId: 123, success: true });
   ```

4. **Contexto Relevante**:
   ```javascript
   logger.info('Order processed', {
     orderId: 123,
     userId: 456,
     total: 99.99,
     items: 3,
     duration: 150  // ms
   });
   ```

5. **Usar Child Loggers para Servicios**:
   ```javascript
   const serviceLogger = advancedLogger.child('payment-service', {
     service: 'payments',
     version: '2.1.0'
   });
   ```

## 🔐 Seguridad

- **No loggear credenciales**: passwords, tokens, API keys
- **Sanitizar user input**: Prevenir log injection
- **Controlar acceso**: Solo admin puede ver/borrar logs
- **Encriptar logs sensibles**: Si contienen PII
- **Rotación frecuente**: Limitar exposición de datos

## 📊 Monitoring Dashboard

El logger emite eventos que pueden ser capturados:

```javascript
advancedLogger.on('log', ({ level, message, meta }) => {
  // Enviar a dashboard en tiempo real
  io.emit('log:new', { level, message, meta });
});

advancedLogger.on('logger:error', (error) => {
  // Alerta de error del logger
  console.error('Logger error:', error);
});
```

## 🚀 Deployment

### Production

```env
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_CONSOLE=false
LOG_FILE=true
LOG_DIRECTORY=/var/log/sysme
LOG_MAX_FILES=90
LOG_MAX_SIZE=100m
```

### Development

```env
LOG_LEVEL=debug
LOG_FORMAT=simple
LOG_CONSOLE=true
LOG_FILE=true
LOG_DIRECTORY=./logs
LOG_MAX_FILES=7
LOG_MAX_SIZE=10m
```

---

**Versión:** 2.1.0
**Última actualización:** Enero 2025
**Autor:** SYSME Development Team
