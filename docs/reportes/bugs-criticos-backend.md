# BUGS CRÍTICOS ENCONTRADOS - BACKEND SYSME 2.0
## Análisis de Logs y Soluciones

**Fecha:** 26 de Octubre de 2025
**Severity:** 🔴 CRÍTICA
**Estado:** BLOQUEANTE PARA PRODUCCIÓN

---

## 🔴 BUG #1: Error de Mapeo de Columnas en Registro de Usuarios

### Descripción
El endpoint de registro de usuarios intenta insertar datos usando nombres de columnas del **sistema antiguo** que no existen en la tabla `users` del **sistema nuevo**.

### Evidencia del Error (Logs)
```
[2025-10-27T00:23:59.377Z] ERROR: Registration error:
Error: insert into `users` (`activo`, `created_at`, `e_mail`, `idioma`, `login`, `nivel`, `nombre`, `password`, `password_hash`, `telefono`, `updated_at`)
values ('S', '2025-10-26 21:23:59.377', 'test@validation.com', 'es', 'testuser', 'waiter', 'Test Usuario', '', '$2a$12$...', NULL, '2025-10-26 21:23:59.377')
- SQLITE_ERROR: table users has no column named activo
```

### Análisis Técnico

**Columnas que intenta insertar (Sistema Antiguo):**
- `activo` ❌
- `e_mail` ❌
- `idioma` ❌
- `login` ❌
- `nivel` ❌
- `nombre` ❌
- `password` ❌
- `password_hash` ✅ (existe)

**Esquema real de la tabla (Sistema Nuevo):**
```sql
CREATE TABLE `users` (
  `id` integer not null primary key autoincrement,
  `username` varchar(50) not null,
  `email` varchar(100) not null,
  `password` varchar(255) not null,
  `first_name` varchar(50) not null,
  `last_name` varchar(50) not null,
  `role` text check (`role` in ('admin', 'manager', 'cashier', 'waiter', 'kitchen')) default 'cashier',
  `is_active` boolean default '1',
  `phone` varchar(20),
  ...
)
```

### Mapeo Correcto

| Sistema Antiguo | Sistema Nuevo | Tipo Correcto |
|----------------|---------------|---------------|
| `activo` | `is_active` o `active` | boolean |
| `e_mail` | `email` | varchar(100) |
| `idioma` | ❓ (no existe) | Eliminar o agregar columna |
| `login` | `username` | varchar(50) |
| `nivel` | `role` | enum |
| `nombre` | `first_name` + `last_name` | varchar(50) + varchar(50) |
| `password` | NO usar (redundante) | Solo `password` es necesario |
| `password_hash` | `password` | varchar(255) |

### Ubicación del Bug
- **Archivo:** `backend/src/modules/auth/controller.js`
- **Función:** `register()`
- **Línea aproximada:** Donde se hace el insert a la tabla users

### Código Problemático (estimado)
```javascript
// INCORRECTO (código actual)
const user = await db('users').insert({
  activo: 'S',
  e_mail: email,
  idioma: 'es',
  login: username,
  nivel: role,
  nombre: name,
  password: '',
  password_hash: hashedPassword,
  telefono: phone,
  created_at: new Date(),
  updated_at: new Date()
});
```

### Solución Propuesta
```javascript
// CORRECTO (código arreglado)
const [userId] = await db('users').insert({
  username: username,
  email: email,
  password: hashedPassword,
  first_name: name.split(' ')[0] || name,
  last_name: name.split(' ').slice(1).join(' ') || '',
  role: role,
  is_active: true,
  phone: phone || null,
  created_at: new Date(),
  updated_at: new Date()
});
```

### Impacto
- **Severidad:** 🔴 CRÍTICA
- **Afectados:** Todos los intentos de registro de nuevos usuarios
- **Frecuencia:** 100% de los registros fallan
- **Workaround:** Insertar usuarios directamente en la BD con SQL
- **Tiempo estimado de corrección:** 30 minutos

---

## 🔴 BUG #2: Error de Mapeo de Columnas en Actualización de Perfil

### Descripción
El endpoint de actualización de perfil intenta actualizar columnas que no existen en el esquema nuevo.

### Evidencia del Error (Logs)
```
[2025-10-27T00:24:38.804Z] ERROR: Update profile error:
Error: update `users` set `name` = 'Carlos López Actualizado', `language` = 'es', `updated_at` = '2025-10-26 21:24:38.803' where `id` = 3
- SQLITE_ERROR: no such column: name
```

### Análisis Técnico

**Columnas que intenta actualizar:**
- `name` ❌ (no existe)
- `language` ❌ (no existe)
- `updated_at` ✅ (existe)

**Esquema real:**
- `first_name` ✅
- `last_name` ✅
- No hay columna para idioma/language

### Ubicación del Bug
- **Archivo:** `backend/src/modules/auth/controller.js`
- **Función:** `updateProfile()`
- **Línea aproximada:** Donde se hace el update a la tabla users

### Código Problemático (estimado)
```javascript
// INCORRECTO (código actual)
await db('users')
  .where({ id: userId })
  .update({
    name: req.body.name,
    language: req.body.language || 'es',
    updated_at: new Date()
  });
```

### Solución Propuesta
```javascript
// CORRECTO (código arreglado)
const updates = {
  updated_at: new Date()
};

if (req.body.name) {
  const nameParts = req.body.name.split(' ');
  updates.first_name = nameParts[0] || '';
  updates.last_name = nameParts.slice(1).join(' ') || '';
}

if (req.body.email) {
  updates.email = req.body.email;
}

if (req.body.phone) {
  updates.phone = req.body.phone;
}

// Si necesitas guardar idioma, agregar columna a la BD o usar JSON en campo permissions
// Por ahora, omitir language ya que no existe en el schema

await db('users')
  .where({ id: userId })
  .update(updates);
```

### Impacto
- **Severidad:** 🔴 ALTA
- **Afectados:** Todos los intentos de actualización de perfil
- **Frecuencia:** 100% de las actualizaciones fallan
- **Workaround:** Actualizar perfiles directamente en la BD con SQL
- **Tiempo estimado de corrección:** 20 minutos

---

## 🟡 BUG #3: Tabla login_attempts No Existe

### Descripción
El sistema intenta registrar intentos de login en una tabla `login_attempts` que no existe en el esquema de la base de datos.

### Evidencia del Error (Logs)
```
[2025-10-27T00:22:57.997Z] ERROR: Failed to log login attempt:
Error: insert into `login_attempts` (`created_at`, `ip_address`, `success`, `username`) values (...)
- SQLITE_ERROR: no such table: login_attempts
```

### Análisis Técnico

**Tabla esperada (no existe):**
```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50),
  ip_address VARCHAR(45),
  success BOOLEAN,
  created_at DATETIME
);
```

**Situación actual:**
- El sistema SÍ bloquea cuentas por intentos fallidos
- Usa columnas `failed_login_attempts` y `locked_until` en la tabla `users`
- El registro detallado de intentos en tabla separada NO funciona

### Impacto

**Funcionalidad afectada:**
- ❌ No se registra historial de intentos de login
- ❌ No se puede hacer análisis forense de seguridad
- ✅ El bloqueo de cuentas SÍ funciona (usa columnas en users)
- ✅ La autenticación básica funciona correctamente

### Soluciones

**Opción 1: Crear la tabla (Recomendado)**
```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username VARCHAR(50),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
```

**Opción 2: Desactivar el logging de intentos (Rápido)**
```javascript
// En backend/src/modules/auth/controller.js
// Comentar o envolver en try-catch el código que inserta en login_attempts

try {
  await db('login_attempts').insert({...});
} catch (err) {
  // Silently fail - tabla no existe pero no es crítico
  logger.debug('Login attempts table not available:', err.message);
}
```

### Impacto
- **Severidad:** 🟡 MEDIA (no bloquea funcionalidad principal)
- **Afectados:** Auditoría de seguridad, análisis forense
- **Frecuencia:** Cada intento de login genera un error en logs
- **Workaround:** Ignorar los errores (ya se hace)
- **Tiempo estimado de corrección:**
  - Opción 1 (crear tabla): 15 minutos
  - Opción 2 (try-catch): 5 minutos

---

## 🟠 ISSUE #4: Usuario Admin con Hash de Contraseña Inválido

### Descripción
El usuario administrador no puede iniciar sesión con ninguna contraseña. El hash almacenado en la BD puede estar corrupto o usar un algoritmo diferente.

### Evidencia del Error (Logs)
```
[2025-10-27T00:22:57.997Z] WARN: Security Event:
{
  event: 'LOGIN_FAILED',
  userId: 1,
  username: 'admin',
  ip: '::1',
  reason: 'Invalid password'
}
```

### Análisis Técnico

**Intentos de login probados:**
- `admin` / `admin` → ❌ Invalid credentials
- `admin` / `admin123` → ❌ Invalid credentials
- `admin` / `admin123!` → ❌ Invalid credentials

**Estado actual en BD:**
```sql
SELECT id, username, password FROM users WHERE username = 'admin';
-- Resultado: id=1, username='admin', password='[hash]'
```

**Posibles causas:**
1. Hash generado con algoritmo incompatible (MD5 del sistema viejo)
2. Hash generado con salt diferente
3. Contraseña nunca configurada correctamente
4. Migración de datos incompleta

### Solución 1: Resetear contraseña directamente en BD

**Generar nuevo hash:**
```javascript
// Node.js
const bcrypt = require('bcrypt');
const newPassword = 'Admin@2025!';
const hash = await bcrypt.hash(newPassword, 12);
console.log(hash);
// Copiar el hash generado
```

**Actualizar en BD:**
```sql
UPDATE users
SET
  password = '$2a$12$[hash_generado_arriba]',
  failed_login_attempts = 0,
  locked_until = NULL
WHERE username = 'admin';
```

### Solución 2: Script de recuperación de admin

**Archivo:** `backend/scripts/reset-admin-password.js`
```javascript
import bcrypt from 'bcrypt';
import db from '../src/config/database.js';

async function resetAdminPassword() {
  const newPassword = process.argv[2] || 'Admin@2025!';

  const hash = await bcrypt.hash(newPassword, 12);

  await db('users')
    .where({ username: 'admin' })
    .update({
      password: hash,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date()
    });

  console.log('✅ Admin password reset successfully');
  console.log('New password:', newPassword);

  process.exit(0);
}

resetAdminPassword().catch(console.error);
```

**Ejecutar:**
```bash
cd backend
node scripts/reset-admin-password.js "NuevaContraseñaSegura@123"
```

### Impacto
- **Severidad:** 🟠 ALTA (pero no bloquea operación POS)
- **Afectados:** Acceso administrativo al sistema
- **Workaround:** Usar usuarios POS para operación diaria
- **Tiempo estimado de corrección:** 5 minutos

---

## 📊 Resumen de Bugs y Prioridades

| Bug | Severidad | Impacto | Esfuerzo | Prioridad | Estado |
|-----|-----------|---------|----------|-----------|--------|
| #1: Registro usuarios | 🔴 CRÍTICA | ALTO | 30 min | P0 | PENDIENTE |
| #2: Update perfil | 🔴 ALTA | MEDIO | 20 min | P0 | PENDIENTE |
| #3: login_attempts | 🟡 MEDIA | BAJO | 15 min | P1 | PENDIENTE |
| #4: Admin password | 🟠 ALTA | MEDIO | 5 min | P0 | PENDIENTE |

### Tiempo Total Estimado de Corrección
- **Bugs críticos (P0):** 55 minutos
- **Bugs importantes (P1):** 15 minutos
- **TOTAL:** 1 hora 10 minutos

---

## 🔧 Plan de Acción Inmediato

### Paso 1: Resetear password del admin (5 min)
```bash
cd E:/POS\ SYSME/SYSME/backend
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin@2025!', 12).then(console.log);"
```
```sql
UPDATE users SET password='[hash]', failed_login_attempts=0, locked_until=NULL WHERE username='admin';
```

### Paso 2: Corregir registro de usuarios (30 min)
1. Abrir `backend/src/modules/auth/controller.js`
2. Localizar función `register()`
3. Corregir mapeo de columnas según sección BUG #1
4. Probar con curl

### Paso 3: Corregir update de perfil (20 min)
1. Abrir `backend/src/modules/auth/controller.js`
2. Localizar función `updateProfile()`
3. Corregir mapeo de columnas según sección BUG #2
4. Probar con curl

### Paso 4: Crear tabla login_attempts (15 min)
1. Ejecutar script SQL de creación de tabla
2. Re-ejecutar pruebas de login
3. Verificar que no haya errores en logs

---

## 🎯 Criterios de Validación

### Para considerar bugs resueltos:

**BUG #1 (Registro):**
```bash
curl -X POST http://localhost:47851/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@123456",
    "role": "waiter",
    "name": "Test Usuario"
  }'
# Respuesta esperada: HTTP 201 + {"success": true, "user": {...}}
```

**BUG #2 (Update Profile):**
```bash
TOKEN="[token_válido]"
curl -X PUT http://localhost:47851/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuevo Nombre"}'
# Respuesta esperada: HTTP 200 + {"success": true, "user": {...}}
```

**BUG #4 (Admin Login):**
```bash
curl -X POST http://localhost:47851/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2025!"}'
# Respuesta esperada: HTTP 200 + token JWT
```

---

## 📝 Notas Adicionales

### Causa Raíz Común
Los bugs #1 y #2 tienen la misma causa raíz:
- **Mapeo incorrecto entre esquemas de BD antiguo y nuevo**
- El código del controlador usa nombres de columnas del sistema viejo
- Esto sugiere que la migración fue incompleta o el código no se actualizó

### Recomendación para el Futuro
1. **Crear una capa de abstracción (Repository Pattern)**
   - Centralizar acceso a BD en clases Repository
   - Evitar queries SQL directas en controladores
   - Facilitar migraciones futuras

2. **Pruebas unitarias de integración con BD**
   - Probar inserts y updates antes de desplegar
   - Validar que esquema coincida con queries

3. **Migraciones con herramientas como Knex Migrations**
   - Versionar cambios de esquema
   - Aplicar migraciones de forma controlada

---

**Preparado por:** Claude Code
**Última actualización:** 26 de Octubre de 2025 - 21:30 GMT
**Próxima revisión:** Después de aplicar correcciones

**Archivos Relacionados:**
- `backend/src/modules/auth/controller.js` - Controlador con bugs
- `backend/src/config/database.js` - Configuración de BD
- `docs/reportes/reporte-pruebas-backend-auth.md` - Reporte completo de pruebas
