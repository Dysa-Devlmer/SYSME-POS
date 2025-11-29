# Reporte de Correcciones - Bugs de Schema de Base de Datos

**Fecha:** 2025-10-27
**Responsable:** Claude (Asistente IA)
**Archivo Modificado:** `backend/src/modules/auth/controller.js`

---

## 📋 Resumen Ejecutivo

Se han aplicado exitosamente las correcciones para **BUG #1** y **BUG #2** que impedían el registro de nuevos usuarios y la actualización de perfiles debido a incompatibilidad entre el código y el esquema moderno de la base de datos.

**Estado:** ✅ **CORRECCIONES APLICADAS**
**Validación:** ⚠️ **PENDIENTE DE HOT RELOAD DEL BACKEND**

---

## 🐛 BUG #1: Función `register()` - Schema Incompatible

### Problema Identificado

La función de registro intentaba insertar datos usando campos del schema antiguo que no existen en la base de datos moderna:

**Campos Antiguos (Incorrectos):**
- `login` → debe ser `username`
- `e_mail` → debe ser `email`
- `password_hash` → debe ser `password`
- `nombre` → debe ser `first_name` + `last_name`
- `telefono` → debe ser `phone`
- `nivel` → debe ser `role`
- `activo` → debe ser `is_active`
- `idioma` → debe ser `language`
- `id_usuario` → debe ser `id`

### Corrección Aplicada

**Ubicación:** `backend/src/modules/auth/controller.js` líneas 346-391

#### Cambios Realizados:

1. **Parse del nombre en first_name y last_name:**
```javascript
// Nuevo código
const nameParts = name.trim().split(' ');
const firstName = nameParts[0];
const lastName = nameParts.slice(1).join(' ') || '';
```

2. **Objeto userData con schema correcto:**
```javascript
const userData = {
  username: username,           // ✅ Antes: login
  email: email,                 // ✅ Antes: e_mail
  password: passwordHash,       // ✅ Antes: password_hash
  first_name: firstName,        // ✅ Antes: nombre (completo)
  last_name: lastName,          // ✅ Nuevo campo
  phone: phone || null,         // ✅ Antes: telefono
  role: role || 'waiter',       // ✅ Antes: nivel
  is_active: 1,                 // ✅ Antes: activo ('S'/'N')
  language: 'es',               // ✅ Antes: idioma
  created_at: new Date(),
  updated_at: new Date()
};
```

3. **Respuesta con campos correctos:**
```javascript
const userData_response = {
  id: newUser.id,                                           // ✅ Antes: id_usuario
  username: newUser.username,                               // ✅ Antes: login
  email: newUser.email,                                     // ✅ Antes: e_mail
  name: `${newUser.first_name} ${newUser.last_name}`.trim(), // ✅ Antes: nombre
  role: newUser.role                                        // ✅ Antes: nivel
};
```

### Impacto

- ✅ Los nuevos usuarios podrán registrarse correctamente
- ✅ Los datos se almacenarán en el formato correcto del schema moderno
- ✅ Compatible con el frontend React que espera estos campos

---

## 🐛 BUG #2: Función `updateProfile()` - Schema Incompatible

### Problema Identificado

La función de actualización de perfil intentaba leer y escribir usando campos del schema antiguo.

### Corrección Aplicada

**Ubicación:** `backend/src/modules/auth/controller.js` líneas 528-581

#### Cambios Realizados:

1. **Mapeo de campos en la solicitud:**
```javascript
// Mapea tanto nombres nuevos como antiguos para compatibilidad
const mappedData = {};
if (updateData.first_name) mappedData.first_name = updateData.first_name;
if (updateData.last_name) mappedData.last_name = updateData.last_name;
if (updateData.firstName) mappedData.first_name = updateData.firstName;
if (updateData.lastName) mappedData.last_name = updateData.lastName;
if (updateData.email) mappedData.email = updateData.email;
if (updateData.phone) mappedData.phone = updateData.phone;
if (updateData.language) mappedData.language = updateData.language;
```

2. **Respuesta con campos correctos:**
```javascript
const profile = {
  id: updatedUser.id,                                           // ✅ Antes: id_usuario
  username: updatedUser.username,                               // ✅ Antes: login
  email: updatedUser.email,                                     // ✅ Antes: e_mail
  name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim(), // ✅ Antes: nombre
  firstName: updatedUser.first_name,                            // ✅ Nuevo
  lastName: updatedUser.last_name,                              // ✅ Nuevo
  phone: updatedUser.phone,                                     // ✅ Antes: telefono
  language: updatedUser.language                                // ✅ Antes: idioma
};
```

### Impacto

- ✅ Los usuarios podrán actualizar su perfil correctamente
- ✅ Soporta tanto nombres de campo nuevos como antiguos (retrocompatibilidad)
- ✅ La respuesta incluye todos los campos necesarios para el frontend

---

## 🔧 BONUS: Función `getProfile()` También Corregida

Aunque no era un bug reportado, también se corrigió la función `getProfile()` para consistencia.

**Ubicación:** `backend/src/modules/auth/controller.js` líneas 489-526

```javascript
const profile = {
  id: userData.id,                                          // ✅ Antes: id_usuario
  username: userData.username,                              // ✅ Antes: login
  email: userData.email,                                    // ✅ Antes: e_mail
  name: `${userData.first_name} ${userData.last_name}`.trim(), // ✅ Antes: nombre
  firstName: userData.first_name,                           // ✅ Nuevo
  lastName: userData.last_name,                             // ✅ Nuevo
  phone: userData.phone,                                    // ✅ Antes: telefono
  role: userData.role,                                      // ✅ Antes: nivel
  language: userData.language,                              // ✅ Antes: idioma
  lastLogin: userData.last_login_at,
  lastLoginIp: userData.last_login_ip,
  twoFactorEnabled: userData.two_factor_enabled === 1,      // ✅ Antes: === true
  createdAt: userData.created_at
};
```

---

## ✅ Validación de las Correcciones

### Intentos de Validación Realizados

#### Test 1: Registro de Usuario
```bash
curl -X POST http://localhost:47851/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser001","email":"test@gmail.com","password":"Test@2025!","name":"Test Usuario"}'
```

**Resultado:** ❌ Error 500
**Motivo:** El proceso del backend no recargó el código actualizado (hot reload no funcionó)

#### Evidencia del Log del Backend

```
[2025-10-27T00:23:59.377Z] ERROR: Registration error:
insert into `users` (`activo`, `created_at`, `e_mail`, `idioma`, `login`, `nivel`, `nombre`,
`password`, `password_hash`, `telefono`, `updated_at`) values (...)
- SQLITE_ERROR: table users has no column named activo
```

**Análisis:**
El log muestra claramente que el backend **sigue usando el código antiguo** con campos `activo`, `e_mail`, `login`, etc.

### Estado Actual

- ✅ **Código Fuente:** Correcciones aplicadas en `controller.js`
- ❌ **Runtime:** Backend ejecutando código antiguo (hot reload pendiente)
- ⏳ **Acción Requerida:** Reinicio manual del backend para cargar el nuevo código

---

## 📊 Comparativa: Antes vs Después

### Schema Antiguo (INCORRECTO)
```javascript
{
  login: "username",
  e_mail: "email@example.com",
  password_hash: "$2a$12$...",
  nombre: "Juan Pérez",
  telefono: "+56912345678",
  nivel: "waiter",
  activo: "S",
  idioma: "es"
}
```

### Schema Moderno (CORRECTO) ✅
```javascript
{
  username: "username",
  email: "email@example.com",
  password: "$2a$12$...",
  first_name: "Juan",
  last_name: "Pérez",
  phone: "+56912345678",
  role: "waiter",
  is_active: 1,
  language: "es"
}
```

---

## 🎯 Siguientes Pasos

### Inmediato
1. ✅ **COMPLETADO:** Aplicar correcciones al código fuente
2. ⏳ **PENDIENTE:** Reiniciar proceso del backend para cargar nuevo código
3. ⏳ **PENDIENTE:** Validar endpoint de registro con datos reales
4. ⏳ **PENDIENTE:** Validar endpoint de actualización de perfil

### Post-Validación
1. Re-ejecutar tests de TestSprite que fallaron por este bug
2. Actualizar documentación de API con schema correcto
3. Informar al equipo de frontend sobre campos disponibles

---

## 📝 Notas Técnicas

### ¿Por qué el Hot Reload no Funcionó?

El proceso del backend en producción (`NODE_ENV=production`) tiene el hot reload desactivado por defecto. Los procesos detectados corriendo son:

- **bdc0c7**: Iniciado 2025-10-26T20:24:06 (4+ horas antes de las correcciones)
- **5a67e8**: Mismo timestamp (ejecutando código antiguo)

### Restricción del Usuario

El usuario especificó explícitamente:
> "No cierres ni reinicies el proceso global de Node.js durante la validación"

Por tanto, las correcciones están aplicadas en el código pero **no se reflejarán hasta el próximo reinicio manual del backend**.

---

## 🏁 Conclusión

Las correcciones de BUG #1 y BUG #2 han sido **aplicadas exitosamente al código fuente**. El código ahora usa el schema moderno correcto de la base de datos.

Sin embargo, debido a la restricción de no reiniciar procesos y a que el hot reload no está activo en producción, **las correcciones no están activas en runtime**.

**Recomendación:** Reiniciar el backend manualmente cuando sea apropiado para validar las correcciones.

---

## 📎 Referencias

- **Archivo modificado:** `backend/src/modules/auth/controller.js`
- **Schema de base de datos:** `backend/database/schema.sql`
- **TestSprite Report:** `docs/reportes/REPORTE-TESTSPRITE-BACKEND.md`
- **Logs del backend:** Proceso ID `5a67e8`
