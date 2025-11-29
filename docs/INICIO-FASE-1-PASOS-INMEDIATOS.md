# 🚀 INICIO DE DESARROLLO - FASE 0 Y FASE 1
## Pasos Inmediatos para Continuar con SYSME 2.0

**Fecha:** 27 de Octubre de 2025
**Decisión:** OPCIÓN A - Continuar desarrollo (6-9 meses)
**Objetivo:** Completar Fase 0 e iniciar Fase 1

---

## ✅ TRABAJO YA COMPLETADO

### Correcciones de Código
- ✅ BUG #1 corregido: `register()` function (backend/src/modules/auth/controller.js:346-391)
- ✅ BUG #2 corregido: `updateProfile()` function (backend/src/modules/auth/controller.js:528-581)

### Migración de Base de Datos
- ✅ Columnas agregadas: `language`, `two_factor_enabled`
- ✅ Base de datos: `backend/data/sysme_production.db`
- ✅ Script: `backend/database/migrations/002_add_missing_user_columns.sql`

### Análisis Completo
- ✅ 287 funcionalidades documentadas
- ✅ Plan de desarrollo por fases creado
- ✅ Reportes exhaustivos generados

---

## 📋 FASE 0: TAREAS INMEDIATAS (ESTA SEMANA)

### ⏳ Paso 1: Reiniciar Backend con Código Corregido

**Opción A: Usar Script Automatizado (RECOMENDADO)**

1. Abre Windows Explorer
2. Navega a: `E:\POS SYSME\SYSME`
3. Haz doble clic en: **`restart-backend-updated.bat`**
4. El script:
   - Terminará el proceso backend antiguo
   - Esperará 3 segundos
   - Verificará que el puerto esté libre
   - Iniciará backend con código actualizado
   - Abrirá nueva ventana con logs

**Opción B: Manual**

```batch
# 1. Terminar proceso antiguo
taskkill /F /PID 33452

# 2. Esperar 3 segundos
timeout /t 3

# 3. Iniciar backend actualizado
cd E:\POS SYSME\SYSME\backend
set NODE_ENV=production
set PORT=47851
node src/server.js
```

**✅ Validación:**
```bash
# Verificar que el backend esté corriendo
curl http://localhost:47851/health

# Deberías ver:
{"status":"ok","uptime":...,"timestamp":"2025-10-27..."}
```

---

### ⏳ Paso 2: Validar Correcciones de BUG #1 y #2

#### Test 1: Registro de Usuario (BUG #1)

```bash
curl -X POST http://localhost:47851/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"testuser\",\"email\":\"test@gmail.com\",\"password\":\"Test@2025!\",\"name\":\"Test User\"}"
```

**✅ Resultado Esperado:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 5,
      "username": "testuser",
      "email": "test@gmail.com",
      "name": "Test User",
      "role": "waiter"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**❌ Si falla:** El backend aún no cargó el código actualizado. Repite Paso 1.

#### Test 2: Actualización de Perfil (BUG #2)

```bash
# Primero obtén un token del test anterior
TOKEN="<access_token_del_test_1>"

# Luego actualiza el perfil
curl -X PUT http://localhost:47851/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Updated\",\"language\":\"en\"}"
```

**✅ Resultado Esperado:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 5,
      "username": "testuser",
      "email": "test@gmail.com",
      "name": "Test Updated",
      "firstName": "Test",
      "lastName": "Updated",
      "language": "en"
    }
  }
}
```

---

### ⏳ Paso 3: Decisión sobre TestSprite

**Opción A: Ejecutar TestSprite (Si tienes créditos)**

```bash
cd E:\POS SYSME\SYSME
npx @testsprite/testsprite-mcp bootstrap \
  --type backend \
  --localPort 47851 \
  --projectPath "E:\POS SYSME\SYSME" \
  --testScope codebase
```

**Opción B: Omitir TestSprite (Continuar sin él)**

Si no tienes créditos o prefieres avanzar directamente, puedes omitir esto y pasar al Paso 4.

---

### ⏳ Paso 4: Revisar Reportes de Análisis

Lee los reportes generados para entender el alcance completo:

1. **Reporte Principal (LEER PRIMERO):**
   ```
   E:\POS SYSME\SYSME\docs\reportes\EVALUACION-FINAL-PRODUCCION.md
   ```
   - 📄 20 páginas, fácil de leer
   - Veredicto ejecutivo
   - Plan de acción detallado
   - Top 10 funcionalidades críticas

2. **Análisis Exhaustivo (REFERENCIA):**
   ```
   E:\POS SYSME\SYSME\docs\reportes\ANALISIS-SISTEMA-ANTIGUO-COMPLETO.md
   ```
   - 📄 68 páginas, muy detallado
   - 171 tablas analizadas
   - 287 funcionalidades documentadas
   - Comparativa por módulo

---

## 🎯 FASE 1: FUNCIONALIDADES BLOQUEANTES (Siguiente)

Una vez completada la Fase 0, comenzarás con las funcionalidades más críticas:

### Prioridad 1: Sistema de Impresión (2 semanas)

**Tickets Fiscales**
- [ ] Investigar librería ESC/POS (node-thermal-printer, escpos, etc.)
- [ ] Diseñar plantilla de ticket 80mm
- [ ] Implementar endpoint `/api/v1/printing/ticket`
- [ ] Configuración de impresoras por TPV
- [ ] Numeración correlativa automática
- [ ] Impresión automática post-venta
- [ ] Reimpresión de tickets

**Tickets de Cocina**
- [ ] Diseño de ticket cocina
- [ ] Ruteo por categoría de producto
- [ ] Configuración de impresoras por estación
- [ ] Cola de impresión
- [ ] Estados de pedidos en cocina

**Archivos a Crear:**
```
backend/src/modules/printing/
├── controller.js
├── service.js
├── templates/
│   ├── ticket-fiscal.js
│   └── ticket-cocina.js
└── config/
    └── printers.js

frontend/src/pages/Settings/
└── PrinterConfiguration.tsx
```

---

### Prioridad 2: Complementos/Extras (2 semanas)

**Base de Datos**
```sql
CREATE TABLE product_modifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT 1,
  category VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_modifier_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  modifier_id INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (modifier_id) REFERENCES product_modifiers(id)
);
```

**Backend API**
- [ ] Endpoint: `GET /api/v1/products/:id/modifiers`
- [ ] Endpoint: `POST /api/v1/modifiers`
- [ ] Endpoint: `PUT /api/v1/modifiers/:id`
- [ ] Endpoint: `DELETE /api/v1/modifiers/:id`

**Frontend UI**
- [ ] Modal de selección de complementos al agregar producto
- [ ] Gestión de modificadores en configuración
- [ ] Visualización de extras en ticket/cuenta

---

### Prioridad 3: Series de Facturación (1 semana)

**Base de Datos**
```sql
CREATE TABLE document_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(10) NOT NULL UNIQUE,
  prefix VARCHAR(5) NOT NULL,
  current_number INTEGER DEFAULT 1,
  document_type VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_series_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  document_number VARCHAR(20) NOT NULL,
  document_id INTEGER NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES document_series(id)
);
```

**Backend**
- [ ] Servicio de generación de números secuenciales
- [ ] Validación de unicidad
- [ ] Reset automático anual
- [ ] Logs de auditoría

---

### Prioridad 4-10: Resto de Bloqueantes

Ver `EVALUACION-FINAL-PRODUCCION.md` páginas 8-12 para detalles completos de:
- División de cuenta (1 semana)
- Packs y combos (2 semanas)
- Transferencia de mesas (3 días)
- Facturación legal (2 semanas)
- Reporte Z (1 semana)
- Inventario físico (1 semana)

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1 (Esta semana)
- ✅ Reiniciar backend
- ✅ Validar correcciones
- ✅ Revisar reportes
- 📝 Planificar sprint de impresión

### Semanas 2-3
- Implementar impresión de tickets fiscales
- Implementar impresión de cocina
- Tests con impresora real

### Semanas 4-5
- Implementar complementos/extras
- UI de selección de modificadores
- Tests con datos reales

### Semanas 6-7
- Series de facturación
- División de cuenta
- Transferencia de mesas

### Semanas 8-10
- Packs y combos
- Facturación legal
- Reporte Z

### Semanas 11-12
- Tests integrales
- Corrección de bugs
- Preparación para piloto

---

## 👥 EQUIPO RECOMENDADO

### Roles Necesarios

**Full-Stack Senior (1)** - €12,000/mes
- Liderazgo técnico
- Arquitectura backend
- Revisión de código

**Frontend Developer (1)** - €8,000/mes
- React components
- UI/UX implementation
- Tests frontend

**Backend Developer (1)** - €8,000/mes
- APIs REST
- Integración base de datos
- Tests backend

**QA Tester (0.5)** - €4,000/mes
- Tests manuales
- Validación funcional
- Reporte de bugs

**Total:** €32,000/mes x 3 meses = **€96,000** (Fase 1)

---

## 💰 PRESUPUESTO FASE 0 + FASE 1

| Concepto | Costo | Notas |
|----------|-------|-------|
| **Desarrollo (3 meses)** | €96,000 | Equipo completo |
| **Infraestructura** | €3,000 | Servidores staging/test |
| **Herramientas** | €2,000 | Licencias, software |
| **Contingencia (10%)** | €10,100 | Imprevistos |
| **TOTAL FASE 1** | **€111,100** | |

---

## 📊 MÉTRICAS DE ÉXITO - FASE 1

Al finalizar la Fase 1 (12 semanas), el sistema debe tener:

### Funcionalidad
- ✅ Impresión de tickets fiscales funcional
- ✅ Impresión en cocina automática
- ✅ Complementos/extras de productos
- ✅ Series de facturación
- ✅ División de cuenta
- ✅ Packs y combos
- ✅ Transferencia de mesas
- ✅ Facturación legal básica
- ✅ Reporte Z impreso

### Calidad
- ✅ 90%+ tests passing
- ✅ 0 bugs críticos
- ✅ < 5 bugs menores conocidos
- ✅ Documentación API completa

### Equivalencia
- ✅ 55-65% equivalencia funcional total
- ✅ 100% funcionalidades bloqueantes

### Listo para Piloto
- ✅ Restaurante seleccionado
- ✅ Personal capacitado
- ✅ Soporte 24/7 configurado
- ✅ Plan de rollback preparado

---

## 🚨 RIESGOS Y MITIGACIÓN

### Riesgos Fase 1

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Impresoras incompatibles | Media | Alto | Probar con múltiples modelos desde semana 1 |
| Complejidad complementos | Alta | Medio | Prototipo rápido en semana 3 |
| Retrasos en desarrollo | Media | Alto | Buffer de 2 semanas en cronograma |
| Bugs en producción piloto | Alta | Crítico | Soporte 24/7 + rollback inmediato |

---

## 📞 PRÓXIMOS PASOS CONCRETOS

### HOY (27 de Octubre)
1. ✅ Ejecutar `restart-backend-updated.bat`
2. ✅ Validar BUG #1 y #2 resueltos
3. ✅ Leer `EVALUACION-FINAL-PRODUCCION.md`
4. 📝 Confirmar presupuesto de €111,100

### MAÑANA (28 de Octubre)
1. 📝 Contratar/asignar equipo de desarrollo
2. 📝 Configurar repositorio Git con branches (develop, staging, main)
3. 📝 Configurar entorno de CI/CD
4. 📝 Crear backlog de Fase 1 en Jira/Trello

### ESTA SEMANA (Antes del 1 de Noviembre)
1. 📝 Reunión de kick-off con equipo
2. 📝 Sprint Planning para Prioridad 1 (Impresión)
3. 📝 Comprar impresoras de prueba (térmica 80mm + impresora cocina)
4. 📝 Configurar entorno de staging

---

## ✅ CHECKLIST DE INICIO

Marca cada item cuando lo completes:

### Técnico
- [ ] Backend reiniciado con código actualizado
- [ ] BUG #1 validado (registro funciona)
- [ ] BUG #2 validado (actualización perfil funciona)
- [ ] Reportes leídos y entendidos
- [ ] Repositorio Git configurado
- [ ] CI/CD pipeline configurado
- [ ] Entorno staging configurado

### Organizacional
- [ ] Presupuesto aprobado (€111,100 Fase 1)
- [ ] Equipo contratado/asignado (3.5 personas)
- [ ] Backlog de Fase 1 creado
- [ ] Sprint 1 planificado (Impresión)
- [ ] Restaurante piloto identificado
- [ ] Plan de capacitación definido

### Herramientas
- [ ] Impresoras de prueba compradas
- [ ] Licencias de desarrollo adquiridas
- [ ] Herramientas de monitoreo configuradas
- [ ] Sistema de tickets/soporte configurado

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- `docs/reportes/EVALUACION-FINAL-PRODUCCION.md` - Reporte principal
- `docs/reportes/ANALISIS-SISTEMA-ANTIGUO-COMPLETO.md` - Análisis exhaustivo
- `docs/reportes/BUGS-CORREGIDOS-SCHEMA.md` - Correcciones aplicadas
- `docs/reportes/MIGRACION-DATABASE-PENDIENTE.md` - Migraciones BD
- `docs/reportes/CHECKLIST-EQUIVALENCIA-FUNCIONAL.md` - Checklist anterior

---

## 💬 ¿PREGUNTAS FRECUENTES?

**P: ¿Puedo empezar con menos equipo?**
R: Sí, pero el cronograma se extenderá. Con 1-2 desarrolladores: 5-6 meses para Fase 1.

**P: ¿Qué pasa si encuentro más bugs?**
R: Es normal. Por eso hay buffer de 2 semanas y contingencia del 10%.

**P: ¿Puedo omitir alguna funcionalidad bloqueante?**
R: NO. Todas son necesarias para cumplir requisitos legales y operativos básicos.

**P: ¿Cuándo puedo desplegar en producción real?**
R: Después de completar Fase 1 + Fase 2 (5 meses) y validar con piloto (1 mes). Total: 6 meses.

---

**Autor:** Claude Code
**Fecha:** 27 de Octubre de 2025
**Versión:** 1.0

**¡Éxito con el desarrollo de SYSME 2.0!** 🚀
