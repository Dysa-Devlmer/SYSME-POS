# 🔧 CORRECCIONES DE BUGS CRÍTICOS - GUÍA DE APLICACIÓN
## SYSME 2.0 - Fase 0

**Fecha:** 26 de Octubre de 2025
**Prioridad:** 🔴 CRÍTICA
**Tiempo estimado:** 1 hora 10 minutos

---

## ⚠️ IMPORTANTE: Detener Servidores Temporalmente

Para aplicar estas correcciones correctamente SIN conflictos de hot reload:

```bash
# Opcional: Detener temporalmente SOLO durante la edición (5 minutos)
# El usuario puede elegir editar con el servidor corriendo si su editor maneja bien los archivos
```

---

## 🐛 BUG #1: Error en Registro de Usuarios

### Archivo a Corregir
`E:/POS SYSME/SYSME/backend/src/modules/auth/controller.js`

### Líneas: 346-361

### Código INCORRECTO Actual:
```javascript
    // Create user
    const userData = {
      login: username,
      e_mail: email,
      password_hash: passwordHash,
      password: '', // Keep empty for security
      nombre: name,
      telefono: phone || null,
      nivel: role || 'cashier',
      activo: 'S',
      idioma: 'es',
      created_at: new Date(),
      updated_at: new Date()
    };

    const newUser = await dbService.create('users', userData);
```

### Código CORRECTO (Reemplazar con):
```javascript
    // Create user with correct column mapping (new schema)
    const nameParts = name.split(' ');
    const userData = {
      username: username,
      email: email,
      password: passwordHash,
      first_name: nameParts[0] || name,
      last_name: nameParts.slice(1).join(' ') || '',
      phone: phone || null,
      role: role || 'cashier',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const newUser = await dbService.create('users', userData);
```

### Cambios Realizados:
| Antes (Sistema Antiguo) | Después (Sistema Nuevo) | Explicación |
|-------------------------|-------------------------|-------------|
| `login` | `username` | Nombre de columna correcto |
| `e_mail` | `email` | Nombre de columna correcto |
| `password_hash` | `password` | Columna unificada |
| `password: ''` | (eliminado) | Redundante |
| `nombre` | `first_name + last_name` | Split del nombre completo |
| `telefono` | `phone` | Nombre de columna correcto |
| `nivel` | `role` | Nombre de columna correcto |
| `activo: 'S'` | `is_active: true` | Boolean en lugar de string |
| `idioma: 'es'` | (eliminado) | Columna no existe en nuevo schema |

---

### También Corregir: Líneas 380-386 (Respuesta del registro)

### Código INCORRECTO Actual:
```javascript
    const userData_response = {
      id: newUser.id_usuario,
      username: newUser.login,
      email: newUser.e_mail,
      name: newUser.nombre,
      role: newUser.nivel
    };
```

### Código CORRECTO (Reemplazar con):
```javascript
    const userData_response = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: `${newUser.first_name} ${newUser.last_name}`.trim(),
      role: newUser.role
    };
```

---

## 🐛 BUG #2: Error en Actualización de Perfil

### Archivo a Corregir
`E:/POS SYSME/SYSME/backend/src/modules/auth/controller.js`

### Líneas: 522-561

### Código INCORRECTO Actual:
```javascript
export const updateProfile = async (req, res) => {
  const { user } = req;
  const updateData = req.body;

  try {
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.id;

    // Update user
    const updatedUser = await dbService.update('users', user.id, {
      ...updateData,
      updated_at: new Date()
    });

    logAuditEvent('PROFILE_UPDATED', user, {
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });

    const profile = {
      id: updatedUser.id_usuario,
      username: updatedUser.login,
      email: updatedUser.e_mail,
      name: updatedUser.nombre,
      phone: updatedUser.telefono,
      language: updatedUser.idioma
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: profile }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    throw error;
  }
};
```

### Código CORRECTO (Reemplazar con):
```javascript
export const updateProfile = async (req, res) => {
  const { user } = req;
  const { name, email, phone } = req.body;

  try {
    // Build update object with correct column mapping
    const updateData = {
      updated_at: new Date()
    };

    // Handle name update (split into first_name and last_name)
    if (name) {
      const nameParts = name.split(' ');
      updateData.first_name = nameParts[0] || '';
      updateData.last_name = nameParts.slice(1).join(' ') || '';
    }

    // Handle email update
    if (email && email !== user.email) {
      // Check if email already exists
      const existingEmail = await dbService.findByField('users', 'email', email);
      if (existingEmail && existingEmail.id !== user.id) {
        throw new ConflictError('Email already in use');
      }
      updateData.email = email;
    }

    // Handle phone update
    if (phone !== undefined) {
      updateData.phone = phone || null;
    }

    // Update user
    const updatedUser = await dbService.update('users', user.id, updateData);

    logAuditEvent('PROFILE_UPDATED', user, {
      updatedFields: Object.keys(updateData),
      ip: req.ip
    });

    const profile = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim(),
      phone: updatedUser.phone,
      role: updatedUser.role
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: profile }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    throw error;
  }
};
```

### Cambios Realizados:
1. **Mapeo explícito de campos** en lugar de spread operator ciego
2. **Split de `name`** en `first_name` y `last_name`
3. **Validación de email duplicado** antes de actualizar
4. **Eliminación de campo `language`** (no existe en nuevo schema)
5. **Respuesta con nombres de columnas correctos**

---

## 🗄️ BUG #3: Crear Tabla login_attempts

### Opción 1: Crear la Tabla (Recomendado)

```sql
-- Ejecutar en SQLite
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

**Comando bash:**
```bash
cd "E:/POS SYSME/SYSME/backend"
sqlite3 data/sysme.db < docs/reportes/create_login_attempts_table.sql
```

### Opción 2: Deshabilitar el Logging (Rápido)

**Archivo:** `backend/src/modules/auth/controller.js`

Buscar todas las líneas que contienen:
```javascript
await dbService.create('login_attempts', {...});
```

Y envolver en try-catch:
```javascript
try {
  await dbService.create('login_attempts', {
    username,
    ip_address: ip,
    success: false,
    failure_reason: 'Invalid password',
    created_at: new Date()
  });
} catch (err) {
  // Silently fail - tabla no existe pero no es crítico
  logger.debug('Login attempts table not available:', err.message);
}
```

---

## 🔑 BUG #4: Resetear Password del Admin

### Opción 1: Script Node.js

**Crear archivo:** `backend/scripts/reset-admin-password.js`

```javascript
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';

const DB_PATH = './data/sysme.db';
const NEW_PASSWORD = 'Admin@2025!';

const db = new sqlite3.Database(DB_PATH);

async function resetAdminPassword() {
  try {
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);

    db.run(`
      UPDATE users
      SET
        password = ?,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = datetime('now')
      WHERE username = 'admin'
    `, [hash], function(err) {
      if (err) {
        console.error('❌ Error:', err);
      } else {
        console.log('✅ Admin password reset successfully!');
        console.log('New password:', NEW_PASSWORD);
        console.log('Rows updated:', this.changes);
      }
      db.close();
    });
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    db.close();
  }
}

resetAdminPassword();
```

**Ejecutar:**
```bash
cd "E:/POS SYSME/SYSME/backend"
node scripts/reset-admin-password.js
```

### Opción 2: SQL Directo (Más Rápido)

**Paso 1: Generar hash**
```bash
cd "E:/POS SYSME/SYSME/backend"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@2025!', 12).then(console.log);"
```

**Paso 2: Copiar el hash y ejecutar SQL**
```sql
UPDATE users
SET
  password = '$2a$12$[PEGAR_HASH_AQUI]',
  failed_login_attempts = 0,
  locked_until = NULL,
  updated_at = datetime('now')
WHERE username = 'admin';
```

**Ejemplo completo:**
```bash
sqlite3 "E:/POS SYSME/SYSME/backend/data/sysme.db" "UPDATE users SET password = '\$2a\$12\$ejemplo...', failed_login_attempts = 0, locked_until = NULL WHERE username = 'admin';"
```

---

## ✅ Validación de Correcciones

### Después de Aplicar Todas las Correcciones

#### Test 1: Registro de Usuario
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
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": ...,
      "username": "testuser",
      "email": "test@example.com",
      "name": "Test Usuario",
      "role": "waiter"
    },
    "token": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

#### Test 2: Login Admin
```bash
curl -X POST http://localhost:47851/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2025!"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

#### Test 3: Update Profile
```bash
TOKEN="[token del login]"
curl -X PUT http://localhost:47851/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Administrador Principal", "phone": "+123456789"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@sysme.local",
      "name": "Administrador Principal",
      "phone": "+123456789",
      "role": "admin"
    }
  }
}
```

---

## 📝 Checklist de Aplicación

- [ ] **BUG #1:** Corregir función `register()` (líneas 346-361)
- [ ] **BUG #1:** Corregir respuesta de registro (líneas 380-386)
- [ ] **BUG #2:** Corregir función `updateProfile()` (líneas 522-561)
- [ ] **BUG #3:** Crear tabla `login_attempts` O deshabilitar logging
- [ ] **BUG #4:** Resetear password del admin
- [ ] **Validación:** Ejecutar Test 1 (Registro)
- [ ] **Validación:** Ejecutar Test 2 (Login Admin)
- [ ] **Validación:** Ejecutar Test 3 (Update Profile)
- [ ] **Logs:** Verificar que no haya errores SQL en logs
- [ ] **Documentar:** Registrar correcciones aplicadas

---

## 🚨 Notas Importantes

1. **Backup antes de editar:**
   ```bash
   cp backend/src/modules/auth/controller.js backend/src/modules/auth/controller.js.backup
   ```

2. **Hot Reload:**
   - El servidor detectará cambios automáticamente
   - NO necesitas reiniciar manualmente
   - Espera 2-3 segundos después de guardar

3. **Si algo falla:**
   - Restaurar desde backup
   - Revisar logs del servidor
   - Verificar sintaxis JavaScript

4. **Orden recomendado:**
   1. BUG #4 (resetear admin) - más rápido
   2. BUG #3 (tabla login_attempts) - independiente
   3. BUG #1 (registro) - requiere atención
   4. BUG #2 (update profile) - similar a #1

---

## 📊 Tiempo Estimado por Corrección

| Bug | Tiempo | Dificultad |
|-----|--------|------------|
| #1 - Registro | 30 min | Media |
| #2 - Update Profile | 20 min | Media |
| #3 - login_attempts | 15 min | Baja |
| #4 - Admin Password | 5 min | Baja |
| **Validación** | 10 min | Baja |
| **TOTAL** | **1h 20min** | - |

---

**Preparado por:** Claude Code
**Última actualización:** 26 de Octubre de 2025
**Próximo paso:** Aplicar correcciones y re-ejecutar pruebas
