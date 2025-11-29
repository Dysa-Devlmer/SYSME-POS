# Migración de Base de Datos Pendiente - SYSME 2.0

**Fecha:** 2025-10-27
**Responsable:** Claude (Asistente IA)
**Prioridad:** 🔴 **BLOQUEANTE PARA PRODUCCIÓN**

---

## 📋 Resumen Ejecutivo

Las correcciones de BUG #1 y BUG #2 están **aplicadas correctamente en el código**, pero el schema de la base de datos SQLite de producción **no está actualizado** con las columnas modernas requeridas.

**Estado Actual:**
- ✅ Código corregido (backend/src/modules/auth/controller.js)
- ✅ Backend reiniciado con código actualizado
- ❌ Schema de base de datos desactualizado
- ⚠️ **BLOQUEANTE:** Registro de usuarios y actualización de perfil no funcionales

---

## 🐛 Error Específico Encontrado

### Intento de Registro de Usuario

```bash
curl -X POST http://localhost:47851/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testusuario","email":"testusuario@gmail.com",
       "password":"Test@2025!","name":"Test Usuario Validacion"}'
```

### Error Retornado

```
SQLITE_ERROR: table users has no column named language
```

### Log Completo del Backend

```
[2025-10-27T04:41:12.037Z] ERROR: Registration error:
insert into `users`
  (`created_at`, `email`, `first_name`, `is_active`, `language`,
   `last_name`, `password`, `phone`, `role`, `updated_at`, `username`)
values
  ('2025-10-27 01:41:12.035', 'testusuario@gmail.com', 'Test', 1, 'es',
   'Usuario Validacion', '$2a$12$rskuxt...', NULL, 'cashier',
   '2025-10-27 01:41:12.035', 'testusuario')
- SQLITE_ERROR: table users has no column named language
```

### Análisis del Error

El código corregido intenta insertar usando el schema moderno:

**Campos que el código intenta usar:**
- ✅ `username` (correcto)
- ✅ `email` (correcto)
- ✅ `first_name` (correcto)
- ✅ `last_name` (correcto)
- ✅ `password` (correcto)
- ✅ `phone` (correcto)
- ✅ `role` (correcto)
- ✅ `is_active` (correcto)
- ❌ **`language` (NO EXISTE EN LA BD)**
- ✅ `created_at` (correcto)
- ✅ `updated_at` (correcto)

---

## 🔍 Estado del Schema Actual

### Base de Datos Afectada

- **Archivo:** `backend/sysme_production.db`
- **Tipo:** SQLite 3
- **Ubicación:** Raíz del backend

### Columnas Faltantes en Tabla `users`

Basándonos en los errores encontrados:

| Columna | Requerida por Código | Existe en BD | Estado |
|---------|---------------------|--------------|--------|
| `language` | SÍ | ❌ NO | **FALTANTE** |

**Posibles Otras Columnas Faltantes** (no confirmadas aún):
- `two_factor_enabled`
- `last_login_at`
- `last_login_ip`
- `failed_login_attempts`
- `locked_until`

---

## 🔧 Solución Requerida: Migración de Base de Datos

### Opción 1: ALTER TABLE (Recomendado para Producción)

```sql
-- Agregar columna language
ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'es';

-- Agregar otras columnas si no existen
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
```

**Pros:**
- Mantiene datos existentes
- No requiere regenerar base de datos
- Reversible con backups

**Contras:**
- Requiere ejecución manual
- Potencialmente afecta datos en uso

### Opción 2: Recrear Base de Datos (Solo Desarrollo)

```bash
cd backend
rm sysme_production.db
npm run db:migrate
npm run db:seed
```

**Pros:**
- Garantiza schema limpio y correcto
- No hay riesgo de incompatibilidades

**Contras:**
- ⚠️ **PÉRDIDA TOTAL DE DATOS**
- Solo viable en desarrollo/staging

### Opción 3: Script de Migración Automático

Crear script en `backend/database/migrations/`:

```javascript
// 002_add_missing_user_columns.js
exports.up = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.string('language', 5).defaultTo('es');
    table.integer('two_factor_enabled').defaultTo(0);
    table.datetime('last_login_at');
    table.string('last_login_ip', 45);
    table.integer('failed_login_attempts').defaultTo(0);
    table.datetime('locked_until');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.dropColumn('language');
    table.dropColumn('two_factor_enabled');
    table.dropColumn('last_login_at');
    table.dropColumn('last_login_ip');
    table.dropColumn('failed_login_attempts');
    table.dropColumn('locked_until');
  });
};
```

**Pros:**
- Versionado y trackeable
- Reversible
- Aplicable en todos los entornos

**Contras:**
- Requiere configurar sistema de migraciones
- Más complejo inicialmente

---

## 📝 Pasos para Resolver (Recomendado)

### Inmediato (Desarrollo/Staging)

1. **Backup de la base de datos actual:**
   ```bash
   cd E:/POS SYSME/SYSME/backend
   cp sysme_production.db sysme_production.db.backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Ejecutar ALTERs manualmente:**
   ```bash
   sqlite3 sysme_production.db < backend/database/migrations/add_user_columns.sql
   ```

3. **Validar schema:**
   ```bash
   sqlite3 sysme_production.db ".schema users"
   ```

4. **Probar registro:**
   ```bash
   curl -X POST http://localhost:47851/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@test.com",
          "password":"Test@2025!","name":"Test User"}'
   ```

### Largo Plazo (Producción)

1. **Implementar sistema de migraciones** (Knex.js)
2. **Crear migraciones versionadas** para todos los cambios de schema
3. **Documentar proceso de migración** para actualizaciones futuras
4. **Configurar CI/CD** para aplicar migraciones automáticamente

---

## ✅ Verificación de la Corrección

Una vez aplicadas las migraciones, validar:

### Test 1: Registro de Usuario
```bash
curl -X POST http://localhost:47851/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario_prueba","email":"prueba@sysme.local",
       "password":"Test@2025!","name":"Usuario de Prueba"}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 5,
      "username": "usuario_prueba",
      "email": "prueba@sysme.local",
      "name": "Usuario de Prueba",
      "role": "waiter"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Test 2: Actualización de Perfil
```bash
TOKEN="<token del test anterior>"

curl -X PUT http://localhost:47851/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"Usuario","lastName":"Actualizado","language":"en"}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 5,
      "username": "usuario_prueba",
      "email": "prueba@sysme.local",
      "name": "Usuario Actualizado",
      "firstName": "Usuario",
      "lastName": "Actualizado",
      "phone": null,
      "language": "en"
    }
  }
}
```

---

## 🎯 Siguientes Pasos

### Prioridad Alta (Bloqueante)
1. ⏳ **Crear script de migración** con ALTER TABLEs necesarios
2. ⏳ **Aplicar migración** en base de datos de desarrollo
3. ⏳ **Validar** registro y actualización de perfil
4. ⏳ **Re-ejecutar TestSprite** para confirmar mejora

### Prioridad Media
1. ⏳ Implementar sistema de migraciones con Knex.js
2. ⏳ Versionar todas las migraciones de schema
3. ⏳ Documentar proceso de actualización de BD

### Prioridad Baja
1. ⏳ Configurar CI/CD para migraciones automáticas
2. ⏳ Implementar rollback automático de migraciones fallidas

---

## 📎 Referencias

- **Código corregido:** `backend/src/modules/auth/controller.js`
- **Reportes previos:**
  - `docs/reportes/BUGS-CORREGIDOS-SCHEMA.md`
  - `docs/reportes/REPORTE-TESTSPRITE-BACKEND.md`
- **Base de datos:** `backend/sysme_production.db`

---

## 🏁 Conclusión

Las correcciones de BUG #1 y BUG #2 están **correctamente implementadas** en el código. El problema actual es de **migración de base de datos**, no de lógica de negocio.

**Acción Inmediata Requerida:** Crear y aplicar script de migración para agregar columna `language` a la tabla `users`.

Una vez resuelto este problema de migración, se espera que el registro de usuarios y actualización de perfiles funcionen correctamente, mejorando significativamente los resultados de TestSprite.
