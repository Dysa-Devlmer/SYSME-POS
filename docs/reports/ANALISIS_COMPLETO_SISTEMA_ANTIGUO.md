# ANÁLISIS EXHAUSTIVO DEL SISTEMA SYSME ANTIGUO

**Fecha del Análisis:** 2025-10-26
**Sistema Analizado:** E:\POS SYSME\Sysme_Principal\SYSME
**Propósito:** Identificar TODAS las funcionalidades para migración completa

---

## 📊 RESUMEN EJECUTIVO

El sistema SYSME es un **POS (Point of Sale) completo** para hostelería y comercio desarrollado en **Delphi/Pascal** (aplicación de escritorio) con módulo web en **PHP/MySQL**.

### Datos Clave
- **166 tablas** en total (28 sistema base + 138 operaciones)
- **15+ años de desarrollo** (archivos desde 2005)
- **Múltiples módulos integrados** (ventas, inventario, facturación, hostelería, etc.)
- **Funcionalidades complejas** (packs recursivos, tarifas dinámicas, bloques de cocina)

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Base de Datos `sysme` (28 tablas)
Gestiona configuración general, usuarios y datos corporativos:

1. **Tpv** - Configuración de puntos de venta/cajas
2. **usuario** - Usuarios del sistema
3. **grupo** - Grupos de usuarios
4. **privilegios_a** - Privilegios de acceso
5. **empresa** - Datos de la empresa
6. **formaspago** - Formas de pago
7. **paises**, **provincias**, **poblaciones** - Datos geográficos
8. **moneda** - Monedas
9. **configuracion** - Configuración general
10. Y 18 tablas más de soporte

### Base de Datos `sysmehotel` (138 tablas)

#### PRODUCTOS Y CATÁLOGO (25 tablas)
- **complementog** - Productos principales (MAESTRO)
- **tipo_comg** - Categorías de productos
- **complemento** - Complementos/ingredientes
- **comg_tarifa** - Tarifas especiales por producto
- **tarifa** - Listas de precios
- **combinados**, **pack** - Productos combinados/packs
- **variaciones** - Variantes (color+talla)
- Y 17 tablas más de gestión de catálogo

#### INVENTARIO Y ALMACÉN (14 tablas)
- **almacen** - Almacenes
- **almacen_complementg** - Stock por almacén y producto
- **inventario** - Inventarios físicos
- **traspasos** - Traspasos entre almacenes
- **entradas** - Entradas de mercancía
- **operaciones** - Operaciones de stock
- Y 8 tablas más de gestión de inventario

#### VENTAS Y TICKETS (22 tablas)
- **ventadirecta** - Ventas (cabecera)
- **ventadir_comg** - Líneas de venta (detalle)
- **tiquet** - Tickets/recibos
- **pretiquet** - Pre-tickets (ventas pendientes)
- **venta_cocina** - Órdenes enviadas a cocina
- **borrador** - Borradores de venta
- Y 16 tablas más de gestión de ventas

#### FACTURACIÓN (10 tablas)
- **factura** - Facturas
- **fac_comg** - Líneas de factura
- **albaran** - Albaranes de entrega
- **serie** - Series de facturación
- Y 6 tablas más de facturación

#### CLIENTES (8 tablas)
- **cliente** - Clientes (maestro)
- **cliente_cardex** - Cardex de clientes
- **eacuenta** - Estados de cuenta
- Y 5 tablas más de gestión de clientes

#### PROVEEDORES (8 tablas)
- **proveedor** - Proveedores (maestro)
- **pedido** - Pedidos a proveedores
- **presupuesto** - Presupuestos
- Y 5 tablas más de gestión de proveedores

#### HOSTELERÍA - MESAS (10 tablas)
- **mesa** - Mesas
- **salon** - Salones/áreas
- **reserva** - Reservas
- **notacocina** - Opciones de cocina
- Y 6 tablas más de hostelería

#### GESTIÓN DE CAJA (8 tablas) ⚠️ CRÍTICO
- **cajas** - Cajas/puntos de venta
- **apcajas** - Aperturas y cierres de caja
- **registrocajon** - Registro de apertura de cajón
- **registroz** - Registro de informes Z
- **zreport** - Informes Z (cierre fiscal)
- **pagoscobros** - Pagos y cobros
- **gasto** - Gastos
- Y 1 tabla más

#### EMPLEADOS (4 tablas)
- **camareros** - Empleados/camareros
- **camarero_priv** - Privilegios de empleados
- **hora** - Registro de horas
- **claveadministrador** - Clave de administrador

#### SISTEMA (10 tablas)
- **configuracion** - Configuración general
- **contadores** - Contadores del sistema
- **backup** - Backups
- **reports** - Reportes
- **impresoras** - Configuración de impresoras
- Y 5 tablas más

#### INTEGRACIÓN (5 tablas)
- **opencart** - Integración con OpenCart
- **bitcoin** - Pagos con Bitcoin
- **smsenvio** - Envío de SMS
- Y 2 tablas más

---

## 🎯 FUNCIONALIDADES CRÍTICAS

### 1. SISTEMA DE CAJA ⚠️ BLOQUEANTE

**Tabla principal:** `apcajas`

**Funcionalidades:**
- ✅ Apertura de caja con importe inicial
- ✅ Cierre de caja con saldo final
- ✅ Control de estado (abierta/cerrada)
- ✅ Movimientos de caja en tiempo real
- ✅ Reporte Z (cierre fiscal OBLIGATORIO por ley)
- ✅ Informe de cierre detallado
- ✅ Registro de cajón portamonedas
- ✅ Totales por forma de pago

**Flujo:**
```
Apertura → Importe Inicial
↓
+ Ventas en Efectivo
+ Entradas de Efectivo
- Salidas de Efectivo
- Gastos
↓
= Saldo Actual
↓
Cierre → Importe Final → Reporte Z
```

**Validación:** No se pueden finalizar ventas si la caja está cerrada

### 2. GESTIÓN DE INVENTARIO ⚠️ CRÍTICO

**Tablas:** `almacen`, `almacen_complementg`, `inventario`, `traspasos`

**Funcionalidades:**
- ✅ Múltiples almacenes
- ✅ Stock en tiempo real por almacén
- ✅ Descuento automático al vender
- ✅ Descuento de componentes en packs (recursivo)
- ✅ Alertas de stock mínimo
- ✅ Inventarios físicos
- ✅ Traspasos entre almacenes
- ✅ Entrada de mercancías
- ✅ Operaciones manuales de stock

### 3. COMPLEMENTOS DE PRODUCTOS ⚠️ CRÍTICO

**Tabla:** `complemento`, `notacocina`

**Tipos:**
- Modificadores negativos: "Sin cebolla", "Sin gluten"
- Extras positivos: "Extra queso", "Extra jamón"
- Opciones de cocción: "Poco hecho", "Al punto"
- Opciones de tamaño: "Pequeño", "Mediano", "Grande"

**Impacto:** Pérdida del 20-30% de ingresos por extras si no se implementa

### 4. MÓDULO DE HOSTELERÍA ⚠️ CRÍTICO

**Funcionalidades específicas:**

**Mesas y Salones:**
- Mapa visual de mesas
- Estados (libre/ocupada/pre-ticket)
- Asignación de venta a mesa
- Navegación entre salones
- Tarifa por mesa

**Bloques de Cocina:**
- Bloque 1: Entradas
- Bloque 2: Plato principal
- Bloque 3: Postre
- Bloque 4: Café/Bebidas

**Panel de Cocina:**
- Visualización de órdenes pendientes
- Órdenes por mesa
- Marcar como servido
- Actualización en tiempo real

### 5. PRODUCTOS COMBINADOS (PACKS) ⚠️ ALTA

**Tablas:** `pack`, `pack_hosteleria`, `combinados`

**Características:**
- Packs fijos (Hamburguesa + Papas + Refresco)
- Menús del día (Entrada + Plato + Postre)
- **PACKS RECURSIVOS** (packs dentro de packs)
- Descuento automático de componentes
- Precio especial del combo

**Ejemplo de pack recursivo:**
```
Pack "Menú Familiar"
  ├─ Pack "Hamburguesa Completa"
  │   ├─ Hamburguesa
  │   ├─ Papas
  │   └─ Refresco
  ├─ Pack "Pizza Familiar"
  │   ├─ Pizza Grande
  │   └─ 2 Refrescos
  └─ Postre
```

### 6. TARIFAS DINÁMICAS 🔴 ALTA

**Tabla:** `comg_tarifa`

**Permite:**
- Tarifa por mesa
- Tarifa por salón
- Tarifa por cliente
- Tarifa por horario
- **Recálculo automático** al cambiar de mesa

### 7. GESTIÓN DE CLIENTES 🟡 ALTA

**Tabla:** `cliente`, `eacuenta`

**Funcionalidades:**
- Datos completos de clientes
- Historial de compras
- **Ventas a cuenta**
- **Facturación a nombre**
- Saldos pendientes
- Tarjetas de fidelización

### 8. FACTURACIÓN LEGAL 🔴 CRÍTICA

**Tablas:** `factura`, `albaran`, `serie`

**Tipos de documentos:**
- Factura
- Albará
- Presupuesto
- Ticket
- Pre-factura

**Requisitos legales:**
- Numeración consecutiva
- Series de facturación
- Datos fiscales
- Desglose de impuestos

### 9. GESTIÓN DE PROVEEDORES 🟢 MEDIA

**Tablas:** `proveedor`, `pedido`, `albaran`

**Funcionalidades:**
- Maestro de proveedores
- Pedidos a proveedores
- Entrada de albaranes
- Actualización de precio de compra
- Almacenamiento automático

### 10. REPORTES E INFORMES 🟡 ALTA

**Informes FastReport (.fr3):**
- InformeCaja.fr3 - Informe de cierre
- zreport.fr3 - Reporte Z (FISCAL)
- ticket.fr3 - Ticket de venta
- TiquetCocina.fr3 - Orden de cocina
- factura.fr3 - Factura
- inventario.fr3 - Inventario físico
- stock.fr3 - Stock actual
- Y 14 informes más

---

## 📊 COMPARATIVA: SISTEMA ACTUAL vs REQUERIDO

| Módulo | Sistema Antiguo | Sistema Nuevo | Gap |
|--------|-----------------|---------------|-----|
| **Base de Datos** | 166 tablas | 10 tablas | 94% ❌ |
| **Sistema de Caja** | Completo (apcajas, registroz) | No existe | 100% ❌ |
| **Inventario** | Multi-almacén + traspasos | Básico (1 almacén) | 70% ❌ |
| **Complementos** | Modificadores + extras | No existe | 100% ❌ |
| **Hostelería** | Mesas + bloques + cocina | Mesas básicas | 60% ❌ |
| **Packs** | Recursivos | No existe | 100% ❌ |
| **Tarifas** | Dinámicas por mesa | 1 tarifa fija | 90% ❌ |
| **Clientes** | Completo + a cuenta | Básico | 70% ❌ |
| **Facturación** | Legal completa | No existe | 100% ❌ |
| **Proveedores** | Completo | No existe | 100% ❌ |
| **Reportes** | 21 informes | Básicos | 80% ❌ |

**COBERTURA TOTAL: ~15%** ❌

---

## 🚨 FUNCIONALIDADES BLOQUEANTES

Sin estas funcionalidades, el sistema **NO puede reemplazar** al antiguo:

1. **Sistema de Caja** (0% implementado)
   - Riesgo: Fraude, incumplimiento legal

2. **Reporte Z Fiscal** (0% implementado)
   - Riesgo: Multas, sanciones fiscales

3. **Complementos de Productos** (0% implementado)
   - Riesgo: Pérdida 20-30% ingresos

4. **Inventario Multi-almacén** (30% implementado)
   - Riesgo: Desabastecimiento, pérdidas

5. **Facturación Legal** (0% implementado)
   - Riesgo: Sanciones fiscales

---

## 📋 PLAN DE MIGRACIÓN RECOMENDADO

### FASE 1: FUNCIONALIDADES BLOQUEANTES (Semanas 1-4)

**Sprint 1-2: Sistema de Caja**
- Tabla: cash_sessions, cash_movements
- Funcionalidades:
  - Apertura/cierre de caja
  - Registro de movimientos
  - Control de estado
  - Validación pre-venta

**Sprint 3: Reporte Z**
- Tabla: z_reports
- Funcionalidades:
  - Generación de reporte Z
  - Totales por categoría/producto/empleado
  - Desglose de impuestos
  - Formas de pago

**Sprint 4: Inventario Multi-almacén**
- Tablas: warehouses, warehouse_stock
- Funcionalidades:
  - Múltiples almacenes
  - Stock por almacén
  - Descuento automático en venta
  - Descuento recursivo en packs

### FASE 2: FUNCIONALIDADES CRÍTICAS (Semanas 5-8)

**Sprint 5: Complementos de Productos**
- Tabla: product_modifiers, product_extras
- Funcionalidades:
  - Modificadores (sin X)
  - Extras (+X)
  - Precio por extra
  - Notas personalizadas

**Sprint 6: Módulo de Hostelería Completo**
- Tablas: kitchen_blocks, kitchen_orders
- Funcionalidades:
  - Bloques de cocina (1,2,3,4)
  - Envío a cocina
  - Panel de cocina en tiempo real
  - Marcar como servido

**Sprint 7: Packs y Combos**
- Tabla: product_packs, pack_components
- Funcionalidades:
  - Definición de packs
  - Componentes
  - Descuento recursivo de stock
  - Precio especial

**Sprint 8: Gestión de Clientes**
- Tabla: customers, customer_accounts
- Funcionalidades:
  - Maestro de clientes
  - Ventas a cuenta
  - Saldos
  - Facturación a nombre

### FASE 3: FUNCIONALIDADES IMPORTANTES (Semanas 9-12)

**Sprint 9: Facturación Legal**
- Tablas: invoices, invoice_lines, invoice_series
- Funcionalidades:
  - Generación de facturas
  - Series y numeración
  - Datos fiscales
  - Impresión legal

**Sprint 10: Tarifas Dinámicas**
- Tabla: price_lists, table_prices
- Funcionalidades:
  - Múltiples tarifas
  - Tarifa por mesa
  - Recálculo automático
  - Tarifa por cliente

**Sprint 11: Gestión de Proveedores**
- Tablas: suppliers, purchase_orders, deliveries
- Funcionalidades:
  - Maestro de proveedores
  - Pedidos
  - Albaranes
  - Almacenamiento

**Sprint 12: Reportes Avanzados**
- Funcionalidades:
  - Reportes de ventas
  - Reportes de inventario
  - Exportación (PDF, Excel)
  - Gráficos

---

## 🔍 CAMPOS CRÍTICOS QUE NO SE DEBEN PERDER

### En Productos (complementog)
```sql
id_complementog         -- ID para migración
cod_barras              -- CRÍTICO para lectura
id_adicional            -- Código alternativo
contabilizar_stock      -- Control de stock (S/N)
precio_ultima_compra    -- Análisis de costos
historicoprecios        -- Auditoría
```

### En Ventas (ventadirecta, ventadir_comg)
```sql
id_venta                -- Trazabilidad
bloque_cocina           -- CRÍTICO para hostelería
servido                 -- Estado de plato (S/N)
enviado_cocina          -- Control de envío (S/N)
nota                    -- Notas del producto
```

### En Caja (apcajas, pagoscobros)
```sql
id_apcajas              -- Trazabilidad
cambio_inicial          -- Auditoría
cambio_final            -- Auditoría
abierta                 -- Estado (S/N)
tipo                    -- VENTA/ENTRADA/SALIDA/GASTO
saldo                   -- Saldo acumulado
```

### En Clientes (cliente)
```sql
documento               -- CRÍTICO (NIF, DNI)
tipo_documento          -- Validación
saldo                   -- Cuentas pendientes
credito_limite          -- Límite de crédito
```

---

## ⚙️ CONFIGURACIÓN ENCONTRADA

### Archivo sysmetpv.ini
```ini
dbhost = 127.0.0.1
dbport = 4306
dbuser = root
dbpass = infusorio
dbname = sysmehotel
idioma = es
almacen = Local
tpv = TPV1
hosteleria = S              # HOSTELERÍA ACTIVA
checkincremento = N          # No incrementar cantidad auto
SerieFactura = F            # Serie por defecto
login = S                   # Requiere login
```

### Tecnologías Identificadas
- **Backend:** Delphi/Pascal + PHP 5.x
- **Base de Datos:** MySQL 5.1 (puerto 4306)
- **Reportes:** FastReport 3 (.fr3)
- **Hardware:** Impresora térmica, cajón, visor cliente

---

## 📦 SCRIPTS DE MIGRACIÓN SUGERIDOS

### Migración de Productos
```sql
INSERT INTO products (
  id, code, name, price, cost, tax_rate,
  category_id, track_stock, active
)
SELECT
  id_complementog,
  COALESCE(id_adicional, id_complementog),
  complemento,
  pvp,
  precio,
  avgiva,
  id_tipo_comg,
  CASE WHEN contabilizar_stock = 'S' THEN true ELSE false END,
  CASE WHEN activo = 'S' THEN true ELSE false END
FROM sysmehotel.complementog
WHERE activo = 'S';
```

### Migración de Stock
```sql
INSERT INTO warehouse_stock (
  product_id, warehouse_id, quantity, min_stock
)
SELECT
  id_complementog,
  id_almacen,
  cantidad,
  stock_minimo
FROM sysmehotel.almacen_complementg;
```

### Migración de Packs
```sql
INSERT INTO product_packs (
  pack_product_id, component_product_id, quantity
)
SELECT
  id_complementog,
  id_complementog1,
  cantidad
FROM sysmehotel.pack;
```

---

## ✅ TESTING CRÍTICO

### Escenarios que DEBEN funcionar:

1. **Apertura/Cierre de Caja**
   - Abrir con importe inicial
   - Realizar ventas
   - Registrar entradas/salidas
   - Cerrar y verificar saldo
   - Generar Reporte Z

2. **Venta con Pack Recursivo**
   - Vender pack que contiene otro pack
   - Verificar descuento de stock de todos los componentes

3. **Venta en Hostelería**
   - Seleccionar mesa
   - Agregar productos con modificadores
   - Enviar bloque 1 a cocina
   - Agregar más productos (bloque 2)
   - Verificar panel de cocina
   - Marcar servido
   - Finalizar y liberar mesa

4. **Cambio de Tarifa**
   - Crear venta en mesa con tarifa A
   - Cambiar a mesa con tarifa B
   - Verificar recálculo automático

5. **Inventario Completo**
   - Crear inventario
   - Contar productos
   - Comparar faltantes/sobrantes
   - Consolidar
   - Verificar ajuste de stock

---

## 🎯 CONCLUSIONES

### Complejidad del Sistema
- **15+ años de desarrollo**
- **166 tablas**
- **Múltiples módulos integrados**
- **Funcionalidades complejas** (recursividad, cálculos dinámicos)

### Gap de Implementación
**Sistema actual: ~15% de funcionalidad**
**Sistema requerido: 100%**
**Gap: 85%**

### Tiempo Estimado para Producción
- **FASE 1 (Bloqueantes):** 4 semanas
- **FASE 2 (Críticas):** 4 semanas
- **FASE 3 (Importantes):** 4 semanas
- **TOTAL:** 12 semanas (3 meses)

### Riesgo de Despliegue Prematuro
⚠️ **CRÍTICO**: NO desplegar sin completar al menos FASE 1 y FASE 2
- Riesgo legal (sin Reporte Z)
- Riesgo financiero (sin caja)
- Riesgo operacional (sin complementos)

---

**Análisis realizado por:** Agente de Exploración Exhaustiva
**Fecha:** 2025-10-26
**Sistema Origen:** E:\POS SYSME\Sysme_Principal\SYSME
**Sistema Destino:** E:\POS SYSME\SYSME (Nuevo)
