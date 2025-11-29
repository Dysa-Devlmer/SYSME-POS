# Security Middleware - SYSME POS v2.1

## 📋 Descripción

Sistema completo de middleware de seguridad con dos capas:
- **security.js** - Seguridad básica y esencial
- **security-advanced.js** - Funciones avanzadas de seguridad

## 🛡️ Características

### Security.js (Básico)
- ✅ Rate Limiting (General, Auth, API)
- ✅ Helmet Security Headers
- ✅ CORS Configuration
- ✅ XSS Protection
- ✅ SQL Injection Prevention
- ✅ Request Sanitization
- ✅ Security Logging
- ✅ File Upload Security
- ✅ IP Whitelist
- ✅ Request Size Limiting

### Security-Advanced.js (Avanzado)
- ✅ CSRF Protection mejorado
- ✅ API Key Validation con rate limiting
- ✅ Request Signature Verification (HMAC)
- ✅ Honeypot Detection
- ✅ Brute Force Protection
- ✅ Advanced Input Validation
- ✅ Content-Type Validation
- ✅ Method Whitelisting

## 🚀 Instalación

```bash
npm install express-rate-limit express-slow-down helmet cors validator express-validator
```

## 📝 Uso Básico

### Configuración Completa

```javascript
const express = require('express');
const { createSecurityMiddleware } = require('./middleware/security');
const securityAdvanced = require('./middleware/security-advanced');

const app = express();

// Security Middleware Básico
const security = createSecurityMiddleware();

app.use(security.helmet);
app.use(security.cors);
app.use(security.generalLimiter);
app.use(security.sanitizeRequest);
app.use(security.sqlInjectionProtection);
app.use(security.securityLogger);

// Security Advanced
app.use(securityAdvanced.attachCSRFToken);
app.use(securityAdvanced.honeypotDetection());
```

### Protección por Endpoint

```javascript
// Login endpoint con brute force protection
app.post('/api/auth/login',
  security.authLimiter,
  securityAdvanced.bruteForceProtection,
  securityAdvanced.honeypotDetection(),
  async (req, res) => {
    // Login logic
  }
);

// API endpoint con API key
app.get('/api/data',
  security.apiLimiter,
  securityAdvanced.requireApiKey,
  async (req, res) => {
    // API logic
  }
);

// Webhook con signature verification
app.post('/api/webhooks',
  securityAdvanced.verifyRequestSignature('your-secret-key'),
  async (req, res) => {
    // Webhook logic
  }
);
```

## 🔧 Configuración Detallada

### Rate Limiting

```javascript
// Rate limiters disponibles
security.generalLimiter  // 100 req/15min
security.authLimiter     // 5 req/15min
security.apiLimiter      // 30 req/1min

// Custom rate limiter
const customLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Custom rate limit exceeded'
});
```

### CSRF Protection

```javascript
// Adjuntar token CSRF a todas las respuestas
app.use(securityAdvanced.attachCSRFToken);

// Validar token en requests no-GET
app.use(securityAdvanced.csrfProtection);

// Cliente debe enviar token en header
// X-CSRF-Token: <token>
```

### API Key Validation

```javascript
// Requerir API key
app.use('/api/protected', securityAdvanced.requireApiKey);

// API key opcional
app.use('/api/public', securityAdvanced.optionalApiKey);

// Cliente debe enviar
// X-API-Key: <your-api-key>
```

### Brute Force Protection

```javascript
app.post('/api/auth/login',
  securityAdvanced.bruteForceProtection,
  loginHandler
);

// Configuración personalizada
const customBruteForce = bruteForceProtection.middleware({
  maxAttempts: 3,
  windowMs: 600000, // 10 min
  blockDuration: 1800000 // 30 min
});
```

### Honeypot Detection

```javascript
// Agregar campo oculto en forms
<input type="text" name="website" style="display:none">

// Backend detecta si se llena
app.use(securityAdvanced.honeypotDetection('website'));
```

### Request Signature Verification

```javascript
const secret = 'your-hmac-secret';

app.use('/api/webhooks',
  securityAdvanced.verifyRequestSignature(secret)
);

// Cliente debe generar signature:
// payload = `${method}:${path}:${timestamp}:${JSON.stringify(body)}`
// signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
// Headers:
//   X-Signature: <signature>
//   X-Timestamp: <timestamp>
```

## 🔐 Validación Avanzada

### Email Corporativo

```javascript
const { advancedValidation, handleValidationErrors } = require('./middleware/security-advanced');

app.post('/api/users',
  advancedValidation.corporateEmail,
  handleValidationErrors,
  createUserHandler
);
```

### Contraseña Fuerte

```javascript
app.post('/api/users/change-password',
  advancedValidation.strongPassword,
  handleValidationErrors,
  changePasswordHandler
);

// Requiere:
// - 12+ caracteres
// - Minúsculas
// - Mayúsculas
// - Números
// - Caracteres especiales
// - No común
```

### URL Segura

```javascript
app.post('/api/webhooks/register',
  advancedValidation.secureURL,
  handleValidationErrors,
  registerWebhookHandler
);

// Solo acepta HTTPS
```

### JSON Field

```javascript
app.post('/api/config',
  advancedValidation.jsonField('settings'),
  handleValidationErrors,
  updateConfigHandler
);
```

## 📊 Estadísticas y Monitoring

### Security Logger

```javascript
// Logs automáticos de eventos sospechosos
// - Status code >= 400
// - Duración > 5000ms

// Integra con advanced-logger
const advancedLogger = require('./services/advanced-logger');
global.advancedLogger = advancedLogger;
```

### Detectar Intentos de Brute Force

```javascript
// Los intentos fallidos se registran automáticamente
// Console warnings:
// 🚨 Brute force detected - Blocked: 192.168.1.100:user@example.com
```

### Honeypot Triggers

```javascript
// Console warnings:
// 🍯 Honeypot triggered by IP: 192.168.1.100
```

## 🌐 Variables de Entorno

```env
# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://app.sysme.com

# IP Whitelist/Blacklist
IP_WHITELIST=192.168.1.100,192.168.1.101
IP_BLACKLIST=10.0.0.1,10.0.0.2
IP_WHITELIST_MODE=false

# API Keys
API_KEYS=key1,key2,key3
```

## 🚫 Prevención de Ataques

### SQL Injection

```javascript
// Bloqueado automáticamente:
// - SELECT, INSERT, UPDATE, DELETE
// - UNION SELECT
// - OR/AND =
// - --, #, /*, */
```

### XSS

```javascript
// Sanitiza automáticamente:
// - <script> tags
// - javascript: protocol
// - on* event handlers
// - <iframe> tags
```

### CSRF

```javascript
// Protección con tokens
// - Generación automática
// - Validación en cada request
// - Expiración en 1 hora
```

### Brute Force

```javascript
// Bloqueo después de:
// - 5 intentos fallidos en 15 min
// - Bloqueo por 1 hora
// - Mensaje de retry
```

### DDoS

```javascript
// Rate limiting agresivo:
// - Auth: 5 req/15min
// - API: 30 req/1min
// - General: 100 req/15min
```

## 📋 Mejores Prácticas

### 1. Stack Completo

```javascript
app.use(security.helmet);
app.use(security.cors);
app.use(security.generalLimiter);
app.use(security.sanitizeRequest);
app.use(security.sqlInjectionProtection);
app.use(securityAdvanced.attachCSRFToken);
app.use(securityAdvanced.honeypotDetection());
```

### 2. Endpoints Sensibles

```javascript
app.post('/api/auth/login',
  security.authLimiter,
  securityAdvanced.bruteForceProtection,
  securityAdvanced.honeypotDetection(),
  loginHandler
);
```

### 3. APIs Públicas

```javascript
app.get('/api/public/products',
  security.publicLimiter,
  securityAdvanced.optionalApiKey,
  getProductsHandler
);
```

### 4. Webhooks

```javascript
app.post('/api/webhooks',
  securityAdvanced.verifyRequestSignature(secret),
  validateContentType(['application/json']),
  webhookHandler
);
```

### 5. File Uploads

```javascript
app.post('/api/upload',
  security.fileUploadSecurity,
  requestSizeLimiter('5mb'),
  uploadHandler
);
```

## 🧪 Testing

### Test CSRF Protection

```bash
# Should fail without token
curl -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'

# Should succeed with token
curl -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -d '{"data":"test"}'
```

### Test Rate Limiting

```bash
# Exceed rate limit
for i in {1..10}; do
  curl http://localhost:3001/api/auth/login
done
```

### Test SQL Injection

```bash
# Should be blocked
curl "http://localhost:3001/api/users?id=1 OR 1=1"
```

### Test Honeypot

```bash
# Should return fake success
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","website":"bot"}'
```

## 🔄 Integración con Otros Servicios

### Con Advanced Logger

```javascript
const advancedLogger = require('./services/advanced-logger');
global.advancedLogger = advancedLogger;

// Security logger usará advanced logger automáticamente
```

### Con RBAC

```javascript
const { rbacService } = require('./services/rbac-service');

app.post('/api/admin/users',
  security.authLimiter,
  securityAdvanced.requireApiKey,
  rbacService.middleware('users', 'create'),
  createUserHandler
);
```

### Con Webhooks

```javascript
const { webhookService } = require('./services/webhook-service');

app.post('/api/webhooks',
  securityAdvanced.verifyRequestSignature(
    process.env.WEBHOOK_SECRET
  ),
  webhookService.receiverMiddleware()
);
```

## ⚠️ Consideraciones de Producción

1. **Rate Limiting con Redis**:
   - Para clusters, usar Redis store
   - Evita inconsistencias entre instancias

2. **HTTPS Obligatorio**:
   - Forzar HTTPS en producción
   - Usar HSTS headers

3. **Secrets Management**:
   - Usar variables de entorno
   - Rotar API keys regularmente
   - Usar servicios como AWS Secrets Manager

4. **Monitoring**:
   - Logs de seguridad centralizados
   - Alertas para eventos críticos
   - Dashboard de métricas

5. **Updates**:
   - Mantener dependencias actualizadas
   - npm audit regularmente
   - Seguir CVE advisories

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)

---

**Versión:** 2.1.0
**Última actualización:** Enero 2025
**Autor:** SYSME Development Team
