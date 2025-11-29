# 🎯 PLAN MAESTRO DE IMPLEMENTACIÓN - SYSME 2.0
## De 35% a 100% de Funcionalidad Completa

**Fecha de inicio:** 2025-01-16
**Objetivo:** Reemplazar completamente el sistema antiguo en restaurantes
**Sistema de referencia:** E:\POS SYSME\Sysme_Principal\SYSME

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Progreso General: 35%

```
Sistema Antiguo: 143 tablas | 166+ funcionalidades principales
Sistema Nuevo:   13 tablas  | 46 funcionalidades implementadas

[████████████░░░░░░░░░░░░░░░░░░░░░░] 35%
```

### Desglose por Módulo

| Módulo | Progreso | Backend | Frontend | Prioridad |
|--------|----------|---------|----------|-----------|
| 🔐 Usuarios | 75% | ✅ | 🟡 | Media |
| 💰 Caja | 80% | ✅ | ❌ | **ALTA** |
| 🍕 Productos | 42% | 🟡 | 🟡 | **ALTA** |
| 🪑 Mesas | 75% | ✅ | 🟡 | Media |
| 💵 Ventas | 47% | 🟡 | 🟡 | **ALTA** |
| 👨‍🍳 Cocina | 30% | 🟡 | ❌ | **ALTA** |
| 📦 Inventario | 17% | ❌ | ❌ | **CRÍTICA** |
| 👥 Clientes | 20% | 🟡 | ❌ | Media |
| 🏭 Proveedores | 0% | ❌ | ❌ | **CRÍTICA** |
| 📄 Facturación | 8% | ❌ | ❌ | **CRÍTICA** |
| 📊 Reportes | 13% | ❌ | ❌ | Media |
| ⚙️ Configuración | 40% | 🟡 | ❌ | Media |

---

## 🚨 FUNCIONALIDADES BLOQUEANTES (URGENTES)

### 1. **Complementos/Modificadores de Productos** ❌ 0%
**Impacto:** 20-30% de ingresos adicionales perdidos
**Sistema Antiguo:** Tabla `complemento` con 8 campos
**Estado Actual:** NO IMPLEMENTADO

**Problema Real:**
- Cliente pide "Hamburguesa sin cebolla" → Sistema no puede registrarlo
- Cliente pide "Pizza con extra queso" → No se cobra el extra
- Restaurante pierde €€€ en cada pedido personalizado

**Solución Requerida:**
```sql
CREATE TABLE product_modifiers (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  name TEXT,              -- "Sin cebolla", "Sin sal"
  type TEXT,              -- 'modifier' o 'extra'
  price REAL DEFAULT 0,   -- 0 para modificadores, precio para extras
  is_default BOOLEAN,
  category TEXT           -- 'ingredients', 'cooking', 'size'
);
```

**Tareas:**
- [ ] Backend: Tabla + API CRUD modifiers
- [ ] Backend: Asociar modifiers a productos
- [ ] Backend: Calcular precio total con extras
- [ ] Frontend: UI selección de modifiers en POS
- [ ] Frontend: Mostrar modifiers en ticket de cocina
- [ ] Testing: 50+ combinaciones

**Duración:** 1 semana
**Inicio:** INMEDIATO

---

### 2. **Facturación Legal** ❌ 8%
**Impacto:** REQUISITO LEGAL OBLIGATORIO
**Sistema Antiguo:** Tabla `factura` con 45 campos + `serie` + libro
**Estado Actual:** PARCIALMENTE BLOQUEANTE

**Problema Real:**
- Sin facturación legal → Empresa en ILEGALIDAD FISCAL
- Clientes empresariales NO PUEDEN comprar (necesitan factura)
- Auditoría de Hacienda → MULTAS GRAVES

**Requerimientos Legales (España):**
1. Numeración secuencial por serie (A, B, C)
2. Datos fiscales completos (NIF, domicilio fiscal)
3. Desglose de IVA por tipo (21%, 10%, 4%, 0%)
4. Base imponible claramente especificada
5. Fecha de emisión y vencimiento
6. Rectificativas con referencia a original
7. Libro de facturas completo
8. Conservación 5 años

**Solución Requerida:**
```sql
CREATE TABLE invoice_series (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,        -- 'A', 'B', 'C'
  description TEXT,
  current_number INTEGER,  -- Contador
  prefix TEXT,             -- 'FAC-A-', 'FAC-B-'
  year INTEGER
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  series_id INTEGER,
  invoice_number TEXT UNIQUE,  -- 'FAC-A-2025-00123'
  issue_date DATE,
  due_date DATE,
  customer_id INTEGER,

  -- Datos fiscales cliente
  customer_tax_id TEXT,    -- NIF/CIF
  customer_name TEXT,
  customer_address TEXT,
  customer_postal_code TEXT,
  customer_city TEXT,

  -- Importes
  subtotal REAL,           -- Base imponible
  tax_21_base REAL,        -- Base IVA 21%
  tax_21_amount REAL,      -- Cuota IVA 21%
  tax_10_base REAL,        -- Base IVA 10%
  tax_10_amount REAL,      -- Cuota IVA 10%
  tax_4_base REAL,         -- Base IVA 4%
  tax_4_amount REAL,       -- Cuota IVA 4%
  total REAL,

  -- Estado
  status TEXT,             -- 'draft', 'issued', 'paid', 'cancelled'
  payment_method TEXT,
  paid_date DATE,

  -- Referencias
  origin_sale_id INTEGER,  -- Ticket origen
  rectified_invoice_id INTEGER,  -- Si es rectificativa

  -- Auditoría
  created_by INTEGER,
  created_at DATETIME,
  cancelled_reason TEXT
);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER,
  product_name TEXT,
  quantity REAL,
  unit_price REAL,
  discount_percent REAL,
  tax_rate REAL,           -- 21, 10, 4, 0
  line_total REAL
);
```

**Tareas:**
- [ ] Backend: Sistema de series con contador
- [ ] Backend: Generación de facturas desde tickets
- [ ] Backend: Cálculo automático de IVA por tipo
- [ ] Backend: Validación de datos fiscales
- [ ] Backend: Facturas rectificativas
- [ ] Backend: Libro de facturas (reporte)
- [ ] Frontend: Formulario de facturación
- [ ] Frontend: Template PDF factura legal
- [ ] Frontend: Búsqueda y listado de facturas
- [ ] Testing: Casos legales críticos

**Duración:** 2 semanas
**Inicio:** Después de Complementos

---

### 3. **Multi-Almacén** ❌ 0%
**Impacto:** Control de stock INCORRECTO sin esto
**Sistema Antiguo:** Tablas `almacen`, `almacen_complementg`, `traspasos`
**Estado Actual:** Solo un almacén genérico

**Problema Real:**
- Restaurante tiene: Cocina, Barra, Bodega
- Cerveza en barra se acaba → No saben si hay en bodega
- No pueden traspasar stock entre ubicaciones
- Mermas y robos no detectables

**Caso de Uso Real:**
```
Situación: Viernes noche, barra sin cerveza
Barra: 0 unidades
Bodega: 50 unidades
Cocina: 5 unidades

Solución: Traspaso de Bodega → Barra (24 unidades)
```

**Solución Requerida:**
```sql
CREATE TABLE warehouses (
  id INTEGER PRIMARY KEY,
  name TEXT,               -- 'Cocina', 'Barra', 'Bodega'
  type TEXT,               -- 'production', 'sales', 'storage'
  is_default BOOLEAN,
  location TEXT
);

CREATE TABLE warehouse_stock (
  id INTEGER PRIMARY KEY,
  warehouse_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  min_stock REAL,          -- Alerta por almacén
  last_count_date DATE,
  UNIQUE(warehouse_id, product_id)
);

CREATE TABLE stock_transfers (
  id INTEGER PRIMARY KEY,
  transfer_number TEXT UNIQUE,
  from_warehouse_id INTEGER,
  to_warehouse_id INTEGER,
  transfer_date DATETIME,
  status TEXT,             -- 'pending', 'completed', 'cancelled'
  notes TEXT,
  created_by INTEGER
);

CREATE TABLE transfer_items (
  id INTEGER PRIMARY KEY,
  transfer_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  unit_cost REAL
);
```

**Tareas:**
- [ ] Backend: CRUD almacenes
- [ ] Backend: Stock por almacén
- [ ] Backend: Traspasos entre almacenes
- [ ] Backend: Descontar de almacén correcto en ventas
- [ ] Backend: Alertas de stock mínimo por almacén
- [ ] Frontend: Gestión de almacenes
- [ ] Frontend: Interface de traspasos
- [ ] Frontend: Vista de stock multi-almacén
- [ ] Testing: Traspasos complejos

**Duración:** 1.5 semanas
**Inicio:** Paralelo con Facturación

---

### 4. **Packs y Combos Recursivos** ❌ 0%
**Impacto:** Menús del día IMPOSIBLES sin esto
**Sistema Antiguo:** Tablas `pack`, `pack_hosteleria`, `combinados`
**Estado Actual:** NO IMPLEMENTADO

**Problema Real:**
- "Menú del día" es 40% de las ventas
- Combo incluye: Primero + Segundo + Postre + Bebida
- No pueden vender menús → Pierden 40% ingresos

**Caso de Uso:**
```
Menú del Día (12€):
  ├─ Primero (elegir 1):
  │   ├─ Ensalada mixta
  │   ├─ Sopa del día
  │   └─ Pasta
  ├─ Segundo (elegir 1):
  │   ├─ Pollo asado
  │   ├─ Pescado plancha
  │   └─ Carne estofada
  ├─ Postre (elegir 1):
  │   ├─ Flan
  │   ├─ Fruta
  │   └─ Helado
  └─ Bebida incluida:
      ├─ Agua
      ├─ Refresco
      └─ Cerveza
```

**Solución Requerida:**
```sql
CREATE TABLE product_packs (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  pack_price REAL,         -- Precio especial del pack
  is_active BOOLEAN,
  start_date DATE,
  end_date DATE,
  requires_choice BOOLEAN  -- Si hay que elegir opciones
);

CREATE TABLE pack_items (
  id INTEGER PRIMARY KEY,
  pack_id INTEGER,
  product_id INTEGER,      -- Puede ser otro pack (recursivo)
  category TEXT,           -- 'first_course', 'second_course', etc.
  is_required BOOLEAN,
  quantity REAL,
  allow_choice BOOLEAN,    -- Cliente elige entre opciones
  extra_price REAL,        -- Precio adicional si elige esta opción
  sort_order INTEGER
);

CREATE TABLE pack_choices (
  id INTEGER PRIMARY KEY,
  pack_id INTEGER,
  category TEXT,           -- 'first_course'
  min_choices INTEGER,     -- Mínimo a elegir
  max_choices INTEGER,     -- Máximo a elegir
  label TEXT               -- 'Elige tu primero'
);
```

**Tareas:**
- [ ] Backend: CRUD de packs
- [ ] Backend: Asociación recursiva de productos/packs
- [ ] Backend: Cálculo de precio final del pack
- [ ] Backend: Descontar stock de todos los componentes
- [ ] Frontend: Constructor de packs visual
- [ ] Frontend: Selección de opciones en POS
- [ ] Frontend: Mostrar pack desglosado en cocina
- [ ] Testing: Packs dentro de packs

**Duración:** 1 semana
**Inicio:** Después de Multi-almacén

---

### 5. **Gestión de Proveedores y Compras** ❌ 0%
**Impacto:** Sin control de compras = CAOS
**Sistema Antiguo:** Tablas `proveedor`, `pedido`, `albaran`, `fac_comg`
**Estado Actual:** NO IMPLEMENTADO

**Problema Real:**
- No saben a quién comprar
- No controlan precios de compra
- No verifican entregas vs pedidos
- No saben cuánto deben a proveedores

**Solución Requerida:**
```sql
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  tax_id TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms INTEGER,   -- Días de pago
  notes TEXT
);

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE,
  supplier_id INTEGER,
  order_date DATE,
  expected_delivery_date DATE,
  status TEXT,             -- 'draft', 'sent', 'received', 'cancelled'
  subtotal REAL,
  tax_amount REAL,
  total REAL
);

CREATE TABLE purchase_order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  unit_cost REAL,
  discount_percent REAL,
  tax_rate REAL,
  line_total REAL
);

CREATE TABLE goods_receipts (
  id INTEGER PRIMARY KEY,
  receipt_number TEXT UNIQUE,
  purchase_order_id INTEGER,
  supplier_id INTEGER,
  receipt_date DATE,
  warehouse_id INTEGER,    -- A qué almacén llega
  status TEXT,
  notes TEXT
);

CREATE TABLE receipt_items (
  id INTEGER PRIMARY KEY,
  receipt_id INTEGER,
  product_id INTEGER,
  ordered_quantity REAL,
  received_quantity REAL,  -- Puede diferir
  unit_cost REAL
);
```

**Tareas:**
- [ ] Backend: CRUD proveedores
- [ ] Backend: Órdenes de compra
- [ ] Backend: Recepción de mercancía
- [ ] Backend: Actualización de stock al recibir
- [ ] Backend: Actualización de precio de costo
- [ ] Frontend: Gestión de proveedores
- [ ] Frontend: Crear orden de compra
- [ ] Frontend: Registrar recepción
- [ ] Testing: Flujo completo compra

**Duración:** 1.5 semanas
**Inicio:** Después de Packs

---

## 🟡 FUNCIONALIDADES CRÍTICAS (MUY IMPORTANTES)

### 6. **Panel de Cocina Completo** 🟡 30%
**Falta:** Bloques de cocina, prioridades, notificaciones

**Bloques de Cocina:**
```
Ticket #123:
├─ 🥗 ENTRANTES (Preparar primero)
│   └─ Ensalada César x2
├─ 🍗 PRINCIPALES (Preparar después)
│   ├─ Pollo asado x1
│   └─ Pescado plancha x1
└─ 🍰 POSTRES (Preparar al final)
    └─ Flan casero x2
```

**Tareas:**
- [ ] Backend: Campo `course_type` en productos
- [ ] Backend: Ordenar órdenes por curso
- [ ] Frontend: Tabs por tipo de curso
- [ ] Frontend: Timers de preparación
- [ ] Frontend: Notificación sonora nuevas órdenes (WebSocket)

**Duración:** 3 días

---

### 7. **Tarifas Dinámicas** ❌ 0%
**Sistema Antiguo:** Precios por mesa, cliente, horario

**Casos de Uso:**
- Mesa terraza: +10% en precios
- Cliente VIP: -5% descuento
- Happy Hour (17:00-19:00): -20% en bebidas

**Tareas:**
- [ ] Backend: Tabla `price_rules`
- [ ] Backend: Aplicar tarifas en tiempo real
- [ ] Frontend: Configurador de tarifas

**Duración:** 4 días

---

### 8. **División de Cuenta** ❌ 0%
**Caso de Uso:** 4 amigos, cada uno paga su parte

```
Mesa #5 - Total: 80€
├─ Dividir en 4 → 20€ cada uno
├─ Dividir por consumo individual
└─ Uno paga todo menos bebidas de otro
```

**Tareas:**
- [ ] Backend: Endpoint split sale
- [ ] Backend: Crear múltiples sales desde una
- [ ] Frontend: UI división de cuenta

**Duración:** 3 días

---

### 9. **Métodos de Pago Mixtos** 🟡 Parcial
**Sistema Actual:** Solo un método por venta
**Sistema Antiguo:** Varios métodos en misma venta

**Caso de Uso:**
```
Total: 50€
├─ Efectivo: 30€
├─ Tarjeta: 15€
└─ Vale: 5€
```

**Tareas:**
- [ ] Backend: Tabla `sale_payments`
- [ ] Backend: Validar suma = total
- [ ] Frontend: Múltiples inputs pago

**Duración:** 2 días

---

### 10. **Sistema de Reservas** ❌ 0%
**Tablas Antiguas:** `reserva`, `reservahora`

**Funcionalidades:**
- Reservar mesa por fecha/hora
- Confirmar/cancelar reserva
- Notas especiales (cumpleaños, alergias)
- Recordatorios automáticos

**Duración:** 1 semana

---

## 📊 FUNCIONALIDADES IMPORTANTES

### 11. **Reportes Avanzados** 🟡 13%

**Faltantes Críticos:**
- [ ] Ventas por producto (ranking)
- [ ] Ventas por camarero (comisiones)
- [ ] Ventas por horario (horas pico)
- [ ] Comparativa períodos (mes vs mes)
- [ ] Ticket promedio
- [ ] Rotación de productos
- [ ] Margen de beneficio
- [ ] Exportar a Excel

**Duración:** 1 semana

---

### 12. **Impresión Real** ❌ 0%

**Sistema Antiguo:** Impresoras térmicas + matriciales

**Tipos de Impresión:**
- Tickets de venta (58mm/80mm térmico)
- Tickets de cocina (80mm)
- Facturas (A4)
- Reportes (A4)
- Códigos de barras

**Tareas:**
- [ ] Backend: Integración con impresoras (ESC/POS)
- [ ] Backend: Plantillas de impresión
- [ ] Backend: Cola de impresión
- [ ] Frontend: Previsualización

**Duración:** 1 semana

---

### 13. **Gestión Completa de Clientes** 🟡 20%

**Faltantes:**
- [ ] Datos fiscales completos
- [ ] Historial de compras visual
- [ ] Programa de fidelización (puntos)
- [ ] Tarjetas de cliente
- [ ] Preferencias y alergias
- [ ] Última visita automática
- [ ] Total gastado acumulado

**Duración:** 1 semana

---

### 14. **Inventarios Físicos** ❌ 0%

**Proceso:**
1. Crear inventario (fecha, almacén)
2. Contar productos físicamente
3. Comparar con stock teórico
4. Generar faltantes/sobrantes
5. Ajustar stock real
6. Imprimir reporte

**Duración:** 3 días

---

### 15. **Backup Automático** ❌ 0%

**Sistema Antiguo:** Backups diarios automáticos

**Tareas:**
- [ ] Backup automático diario
- [ ] Rotación de backups (mantener 30 días)
- [ ] Restauración de backup
- [ ] Backup remoto (cloud)

**Duración:** 2 días

---

## 🗓️ CRONOGRAMA DETALLADO

### MES 1: Funcionalidades Bloqueantes (Enero 2025)

**Semana 1-2 (16-29 Enero):**
- ✅ Sistema de Caja Frontend
- ✅ Complementos/Modificadores (Backend + Frontend)
- Testing integración

**Semana 3-4 (30 Enero - 12 Febrero):**
- ✅ Facturación Legal (Backend)
- ✅ Facturación Legal (Frontend)
- ✅ Multi-almacén (Backend)
- Testing legal

---

### MES 2: Funcionalidades Críticas (Febrero 2025)

**Semana 5-6 (13-26 Febrero):**
- ✅ Multi-almacén (Frontend)
- ✅ Packs y Combos
- ✅ Panel de Cocina Completo
- ✅ Tarifas Dinámicas

**Semana 7-8 (27 Febrero - 12 Marzo):**
- ✅ Gestión de Proveedores
- ✅ División de Cuenta
- ✅ Métodos de Pago Mixtos
- ✅ Sistema de Reservas

---

### MES 3: Funcionalidades Importantes (Marzo 2025)

**Semana 9-10 (13-26 Marzo):**
- ✅ Gestión Completa de Clientes
- ✅ Reportes Avanzados
- ✅ Inventarios Físicos
- ✅ Impresión Real (Inicio)

**Semana 11-12 (27 Marzo - 9 Abril):**
- ✅ Impresión Real (Finalización)
- ✅ Backup Automático
- ✅ Testing completo del sistema
- ✅ Corrección de bugs

---

### MES 4: Refinamiento y Producción (Abril 2025)

**Semana 13-14 (10-23 Abril):**
- ✅ Optimización de performance
- ✅ Migración de datos desde sistema antiguo
- ✅ Documentación de usuario
- ✅ Videos tutoriales

**Semana 15-16 (24 Abril - 7 Mayo):**
- ✅ Piloto en restaurante real
- ✅ Ajustes basados en feedback
- ✅ Deploy en producción
- ✅ Soporte intensivo

---

## 📈 HITOS PRINCIPALES

| Fecha | Hito | Funcionalidad |
|-------|------|---------------|
| 29 Enero | 🎯 Bloqueantes completados | 50% funcional |
| 26 Febrero | 🎯 Críticas completadas | 70% funcional |
| 26 Marzo | 🎯 Importantes completadas | 90% funcional |
| 23 Abril | 🎯 Refinamiento completo | 95% funcional |
| 7 Mayo | 🚀 **PRODUCCIÓN** | **100% funcional** |

---

## 🎯 CRITERIOS DE ÉXITO

### Para considerar el sistema 100% listo:

#### Funcionalidades Core (OBLIGATORIAS)
- ✅ Sistema de Caja completo con Reporte Z
- ✅ Complementos/Modificadores funcionando
- ✅ Facturación legal completa
- ✅ Multi-almacén con traspasos
- ✅ Packs y combos recursivos
- ✅ Gestión de proveedores básica
- ✅ Panel de cocina con bloques
- ✅ Impresión de tickets funcionando

#### Cumplimiento Legal
- ✅ Facturas con formato legal español
- ✅ Series de facturación configurables
- ✅ Desglose correcto de IVA
- ✅ Libro de facturas completo
- ✅ Numeración secuencial sin saltos

#### Performance
- ✅ POS responde en < 300ms
- ✅ Reporte Z generado en < 2s
- ✅ Búsqueda de productos < 100ms
- ✅ Sistema estable 24/7

#### Testing
- ✅ 100+ pruebas automatizadas
- ✅ Testing manual completo
- ✅ Piloto exitoso en restaurante real
- ✅ 0 bugs críticos

---

## 🚀 PRÓXIMAS ACCIONES (Esta Semana)

### Prioridad MÁXIMA
1. **Completar Frontend Sistema de Caja** (3 días)
   - Pantalla apertura/cierre
   - Registro de movimientos
   - Visualización Reporte Z

2. **Iniciar Complementos de Productos** (2 días)
   - Diseño de BD
   - API básica
   - Preparar estructura frontend

---

## 💡 NOTAS IMPORTANTES

### Migración de Datos
- **Productos:** Migrar con categorías, precios, stock
- **Clientes:** Migrar datos fiscales completos
- **Empleados:** Migrar con permisos
- **Histórico:** Últimos 2 años de ventas (opcional)

### Compatibilidad con Sistema Antiguo
- Ambos sistemas correrán en paralelo 1 mes
- Comparar reportes diarios
- Validar que números coincidan

### Capacitación
- 2 días de capacitación por restaurante
- Videos tutoriales grabados
- Manual de usuario completo
- Soporte telefónico 24/7 primer mes

---

**Responsable:** Equipo de Desarrollo SYSME 2.0
**Próxima revisión:** Semanal, cada lunes
**Última actualización:** 2025-01-16
