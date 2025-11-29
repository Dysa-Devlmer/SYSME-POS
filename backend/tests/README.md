# Suite de Pruebas Unitarias - SYSME POS v2.1

## 📋 Descripción

Suite completa de pruebas unitarias para los 6 servicios enterprise de SYSME POS v2.1 utilizando Jest como framework de testing.

## 🎯 Cobertura de Servicios

### 1. **Email/SMS Service** (`tests/services/email-sms.test.js`)
- ✅ Inicialización y configuración
- ✅ Gestión de templates (Handlebars)
- ✅ Envío de emails con templates
- ✅ Rate limiting y throttling
- ✅ Gestión de cola de mensajes
- ✅ Estadísticas y métricas
- ✅ Notificaciones programadas (cron)
- **Total:** 15 pruebas

### 2. **RBAC Service** (`tests/services/rbac.test.js`)
- ✅ Inicialización de roles y permisos
- ✅ Asignación/eliminación de roles
- ✅ Verificación de permisos (can, canAll, canAny)
- ✅ Wildcards en permisos (* resource, * action)
- ✅ Cache de permisos de usuario
- ✅ Middleware de autorización
- ✅ Estadísticas del sistema RBAC
- **Total:** 18 pruebas

### 3. **i18n Service** (`tests/services/i18n.test.js`)
- ✅ Traducciones simples y anidadas
- ✅ Interpolación de parámetros
- ✅ Detección de locale (headers, cookies, query)
- ✅ Fallback a idioma por defecto
- ✅ Manejo de claves no encontradas
- ✅ Cache de traducciones
- ✅ Middleware de internacionalización
- ✅ Estadísticas (cache hits, missing keys)
- **Total:** 16 pruebas

### 4. **Performance Optimizer** (`tests/services/performance.test.js`)
- ✅ Recolección de métricas (CPU, memoria, requests)
- ✅ Tracking de operaciones (start/end)
- ✅ Detección de bottlenecks
- ✅ Profiling de memoria y CPU
- ✅ Auto-optimización (cache clearing, GC)
- ✅ Sistema de alertas (thresholds)
- ✅ Middleware de performance tracking
- ✅ Generación de reportes
- **Total:** 22 pruebas

### 5. **Config Manager** (`tests/services/config-manager.test.js`)
- ✅ Carga de configuración desde archivos
- ✅ Get/Set con dot notation
- ✅ Hot reload con file watchers
- ✅ Versionado (snapshots y restore)
- ✅ Encriptación AES-256-GCM
- ✅ Hashing SHA256
- ✅ Validación de configuraciones
- ✅ Merge profundo de configs
- ✅ Export/Import (JSON)
- ✅ Middleware de config injection
- **Total:** 24 pruebas

### 6. **Webhook Service** (`tests/services/webhook.test.js`)
- ✅ Registro/desregistro de webhooks
- ✅ Delivery con reintentos (exponential backoff)
- ✅ Generación y verificación de firmas HMAC SHA256
- ✅ Filtrado de eventos (con wildcards)
- ✅ Rate limiting por webhook
- ✅ Cola de deliveries
- ✅ Actualización de configuración
- ✅ Middleware receptor de webhooks
- ✅ Estadísticas (success rate, deliveries)
- **Total:** 21 pruebas

## 📊 Estadísticas Totales

- **Total de Servicios:** 6
- **Total de Archivos de Prueba:** 6
- **Total de Pruebas:** 116+
- **Cobertura Objetivo:** 70% (branches, functions, lines, statements)

## 🚀 Comandos de Testing

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con modo watch (desarrollo)
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Modo verbose (más detalles)
npm run test:verbose

# Ejecutar pruebas de un servicio específico
npm test -- tests/services/i18n.test.js

# Ejecutar pruebas que coincidan con un patrón
npm test -- --testNamePattern="should translate"
```

## ⚙️ Configuración Jest

**Archivo:** `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/node_modules/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

## 🔧 Setup Global

**Archivo:** `tests/setup.js`

- Mock de console.log/debug/info/warn/error
- Variables de entorno de prueba
- Timeout global de 10 segundos

## 📦 Dependencias de Testing

```json
{
  "devDependencies": {
    "jest": "^29.7.0",           // Framework de testing
    "nock": "^13.5.0",           // Mock de HTTP requests
    "supertest": "^6.3.3"        // Testing de APIs Express
  }
}
```

## 🎨 Patrones de Prueba

### Estructura Estándar

```javascript
describe('Service Name', () => {
  beforeAll(async () => {
    // Setup inicial
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Feature Group', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = service.method(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking de Servicios

```javascript
// Mock de email transporter
emailSMSService.emailTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
};

// Mock de HTTP requests (nock)
nock('https://example.com')
  .post('/webhook')
  .reply(200, { success: true });
```

### Pruebas Asíncronas

```javascript
test('should deliver webhook', async () => {
  const result = await webhookService.deliver(webhookId, payload);
  expect(result.success).toBe(true);
});
```

## 📈 Reporte de Cobertura

Después de ejecutar `npm run test:coverage`, el reporte estará disponible en:

- **Terminal:** Resumen de cobertura
- **HTML:** `coverage/lcov-report/index.html`
- **LCOV:** `coverage/lcov.info`

## ✅ Criterios de Éxito

Para que las pruebas pasen exitosamente:

1. **Todas las pruebas deben pasar** (verde)
2. **Cobertura mínima de 70%** en:
   - Branches (ramificaciones)
   - Functions (funciones)
   - Lines (líneas)
   - Statements (sentencias)
3. **No timeouts** (max 10 segundos por prueba)
4. **Sin errores de consola** (mocked en setup)

## 🔍 Debugging de Pruebas

```bash
# Ejecutar solo una prueba específica
npm test -- --testNamePattern="should translate simple key"

# Ver output detallado
npm run test:verbose

# Detectar pruebas lentas
npm test -- --verbose --detectOpenHandles

# Ejecutar en modo debug
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🚧 Fixtures de Prueba

Las pruebas utilizan fixtures en `tests/fixtures/`:

- `test-config.json` - Configuración de prueba para Config Manager
- Otros archivos de configuración según sea necesario

## 📝 Mejores Prácticas

1. **Aislamiento:** Cada prueba debe ser independiente
2. **Limpieza:** Usar `afterEach` para limpiar recursos
3. **Mocking:** Mockear dependencias externas (email, HTTP, DB)
4. **Nombres Descriptivos:** `should [action] [expected result]`
5. **Arrange-Act-Assert:** Seguir patrón AAA
6. **No usar datos reales:** Usar fixtures y mocks
7. **Timeout apropiado:** 10s por defecto, ajustar si es necesario

## 🔄 Integración Continua

Las pruebas se ejecutarán automáticamente en:

- **Pre-commit hooks** (opcional con husky)
- **Pull requests** (GitHub Actions)
- **Pipeline de CI/CD** (ver `.github/workflows/ci-cd.yml`)

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Nock Documentation](https://github.com/nock/nock)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

---

**Última actualización:** Fase 3 - v2.1.0
**Autor:** SYSME Development Team
