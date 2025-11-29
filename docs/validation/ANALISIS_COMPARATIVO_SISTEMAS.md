# ANÁLISIS COMPARATIVO: SISTEMA ANTIGUO vs SISTEMA NUEVO

**Fecha:** 2025-10-25
**Estado:** CRÍTICO - GAP FUNCIONAL SIGNIFICATIVO DETECTADO

---

## RESUMEN EJECUTIVO

| Métrica | Sistema Antiguo | Sistema Nuevo | Cobertura |
|---------|----------------|---------------|-----------|
| **Total Tablas BD** | 171+ tablas | 10 tablas | 5.8% ❌ |
| **Módulos Funcionales** | 20+ módulos | 7 módulos | 35% ❌ |
| **Tecnología** | PHP 5.x + Delphi | Node.js + React | ✅ Moderna |
| **Años en Producción** | 10+ años | 0 días | - |

---

## 1. COMPARACIÓN DE TABLAS DE BASE DE DATOS

### ✅ TABLAS IMPLEMENTADAS (10/171)

| Tabla Nueva | Equivalente Antiguo | Estado | Observaciones |
|-------------|---------------------|--------|---------------|
| `users` | `sysme.usuario` | ✅ Parcial | Faltan campos: pin_code completo, assigned_tpv |
| `categories` | `sysmehotel.tipo_comg` | ✅ Básico | Falta jerarquía de categorías |
| `products` | `sysmehotel.complementog` | ✅ Básico | Faltan complementos, variaciones, packs |
| `tables` | `sysmehotel.mesa` | ✅ Completo | Similar al antiguo |
| `salons` | `sysmehotel.salon` | ✅ Completo | Implementado correctamente |
| `tarifas` | `sysmehotel.tarifa` | ✅ Completo | Sistema de precios especiales |
| `sales` | `sysmehotel.tiquet` | ✅ Básico | Falta integración con múltiples formas de pago |
| `sale_items` | `sysmehotel.ventadir_comg` | ✅ Básico | Líneas de venta básicas |
| `settings` | `sysmehotel.configuracion` | ✅ Básico | Configuración general |
| *(knex_migrations)* | - | ✅ Nuevo | Control de versiones BD |

---

## 2. ❌ FUNCIONALIDADES FALTANTES CRÍTICAS

### 🔴 CRÍTICO - IMPACTO ALTO (Bloqueantes para Producción)

#### A. GESTIÓN DE INVENTARIO (0% Implementado)

**Tablas Faltantes:**
- `almacen` - Maestro de almacenes
- `almacen_complementg` - Stock por almacén
- `inventario` - Inventario físico
- `inventario_complementg` - Detalles de inventario
- `traspasos` - Movimientos entre almacenes
- `traspasos_complementog` - Detalles de traspasos
- `entradas` - Recepciones de mercancía

**Impacto:**
- ❌ No se puede controlar stock en tiempo real
- ❌ No hay alertas de stock mínimo
- ❌ Imposible hacer inventarios físicos
- ❌ No se registran movimientos de entrada/salida

**Funcionalidades Perdidas:**
- Control de múltiples almacenes
- Traspasos entre puntos de venta
- Valoración de inventario
- Reportes de diferencias

---

#### B. GESTIÓN DE CLIENTES (0% Implementado)

**Tablas Faltantes:**
- `cliente` - Maestro de clientes (13,000+ registros en sistema antiguo)
- `cliente_cardex` - Historial de consumo
- `cliente_fan` - Clientes VIP
- `clientes_docs` - Documentos asociados
- `clientes_tarjeta` - Tarjetas de prepago/fidelización
- `cardex` - Movimientos de cuenta
- `res_com` - Consumiciones a cuenta
- `res_acuenta` - Anticipos de clientes
- `car_acuenta` - Saldo de clientes
- `car_com` - Cargos a cuenta
- `car_comg` - Detalles de cargos
- `eacuenta` - Estado de cuentas
- `tipo_cliente` - Clasificación de clientes

**Impacto:**
- ❌ No se puede facturar a nombre de clientes
- ❌ No hay programa de fidelización
- ❌ Imposible vender a cuenta
- ❌ No se registra historial de compras
- ❌ No hay tarjetas de cliente prepago

**Funcionalidades Perdidas:**
- CRM completo
- Consumiciones a cuenta
- Tarjetas regalo/prepago
- Historial de consumo por cliente
- Estadísticas por cliente

---

#### C. GESTIÓN DE CAJA (0% Implementado)

**Tablas Faltantes:**
- `cajas` - Maestro de cajas/turnos
- `apcajas` - Apertura y cierre de caja
- `apcajas2` - Cierre detallado
- `registrocajon` - Movimientos de efectivo (entradas/salidas)
- `registroz` - Reportes Z fiscales
- `zreport` - Cierres de caja históricos

**Impacto:**
- ❌ No hay control de efectivo en caja
- ❌ No se puede hacer cuadre de caja
- ❌ Imposible generar Reporte Z fiscal
- ❌ No se registran entradas/salidas de efectivo
- ❌ No hay apertura/cierre formal de turno

**Funcionalidades Perdidas:**
- Apertura de caja con fondo inicial
- Cierre de caja con arqueo
- Reporte Z fiscal (obligatorio en España)
- Control de diferencias de caja
- Entradas/salidas de efectivo

---

#### D. SISTEMA DE COMPLEMENTOS/PERSONALIZACIONES (0% Implementado)

**Tablas Faltantes:**
- `complemento` - Complementos disponibles
- `complementog_comercio` - Complementos por producto (comercio)
- `complementog_hosteleria` - Complementos por producto (hostelería)
- `complementog_peluqueria` - Complementos por producto (peluquería)
- `operaciones` - Operaciones con complementos
- `operaciones_complementog` - Detalles de operaciones

**Impacto:**
- ❌ No se pueden agregar extras a productos
- ❌ Ejemplo: Pizza sin poder agregar ingredientes extra
- ❌ No se puede personalizar platillos
- ❌ Pérdida de ingresos por ventas adicionales

**Funcionalidades Perdidas:**
- Agregar extras a productos (ej: queso extra, bacon)
- Modificaciones de productos (sin cebolla, sin gluten)
- Precio individual por complemento
- Combos personalizables

---

#### E. GESTIÓN DE PROVEEDORES (0% Implementado)

**Tablas Faltantes:**
- `proveedor` - Maestro de proveedores
- `pproveedor` - Proveedores adicionales
- `pedido` - Pedidos a proveedores
- `ped_comg` - Líneas de pedido
- `presupuesto` - Presupuestos de compra
- `presu_comg` - Líneas de presupuesto
- `acreedor` - Cuentas por pagar
- `fabricante` - Fabricantes de productos

**Impacto:**
- ❌ No se pueden gestionar compras
- ❌ No hay control de proveedores
- ❌ Imposible hacer pedidos automáticos
- ❌ No se registran cuentas por pagar

**Funcionalidades Perdidas:**
- Pedidos a proveedores
- Control de stock mínimo con pedido automático
- Presupuestos de compra
- Gestión de cuentas por pagar

---

#### F. FACTURACIÓN COMPLETA (0% Implementado)

**Tablas Faltantes:**
- `factura` - Facturas emitidas
- `factura2` - Facturas (versión 2)
- `pfactura` - Prefacturas
- `fac_comg` - Líneas de factura
- `albaran` - Albaranes
- `alb_comg` - Líneas de albarán
- `albaran_factura` - Relación albarán-factura
- `lineaseliminadas` - Auditoría de líneas eliminadas

**Impacto:**
- ❌ No se pueden emitir facturas legales
- ❌ No hay albaranes de entrega
- ❌ Imposible cumplir requisitos fiscales
- ❌ No se auditan cambios en documentos

**Funcionalidades Perdidas:**
- Emisión de facturas con requisitos legales
- Albaranes de entrega
- Prefacturación
- Auditoría de modificaciones

---

### 🟡 IMPORTANTE - IMPACTO MEDIO

#### G. MÓDULO DE HOTELERÍA (0% Implementado)

**Tablas Faltantes:**
- `habitacion` - Habitaciones de hotel
- `habitacion_fotos` - Fotos de habitaciones
- `tipo_hab` - Tipos de habitación
- `reserva` - Reservas de habitaciones
- `reservahora` - Reservas por hora
- `pre_reserva` - Pre-reservas
- `pre_reserva_hab` - Habitaciones prereservadas
- `pre_reserva_habi` - Detalles de prereserva
- `pre_reserva_com` - Consumiciones prereserva
- `res_conf_servicios` - Servicios confirmados

**Impacto:**
- ❌ No se puede usar en hoteles
- ❌ No hay gestión de habitaciones
- ❌ Imposible hacer reservas de alojamiento

---

#### H. SISTEMA DE COCINA AVANZADO (50% Implementado)

**Tablas Implementadas:**
- ✅ Sistema básico de órdenes a cocina (via WebSocket)

**Tablas Faltantes:**
- `notacocina` - Notas especiales de cocina
- `pnotacocina` - Plantillas de notas
- `venta_cocina` - Ventas desde cocina
- `venta_preticket` - Pre-tickets de cocina

**Impacto:**
- ⚠️ No hay notas especiales por platillo
- ⚠️ Cocina no puede registrar preparaciones
- ⚠️ No hay plantillas de modificaciones

---

#### I. PRODUCTOS COMBINADOS/PACKS (0% Implementado)

**Tablas Faltantes:**
- `pack` - Packs/combos de productos
- `pack_hosteleria` - Packs para hostelería
- `combinados` - Productos combinados
- `combinados_hosteleria` - Combinados hostelería

**Impacto:**
- ❌ No se pueden crear menús del día
- ❌ No hay combos promocionales
- ❌ Imposible vender productos agrupados

---

#### J. SISTEMA DE PRECIOS AVANZADO (30% Implementado)

**Tablas Implementadas:**
- ✅ `tarifas` - Tarifas básicas

**Tablas Faltantes:**
- `precio` - Precios históricos por producto
- `historicoprecios` - Historial de cambios de precio
- `comg_tarifa` - Relación producto-tarifa
- `promociones` - Promociones y descuentos

**Impacto:**
- ⚠️ No hay historial de precios
- ⚠️ No se pueden crear promociones automáticas
- ⚠️ Sistema de tarifas limitado

---

### 🟢 MENOR IMPACTO

#### K. GESTIÓN DE CONTRATOS/EVENTOS (0% Implementado)

**Tablas Faltantes:**
- `contrato` - Contratos de eventos
- `scontrato` - Subcontratos
- `scontrato_line` - Líneas de contrato
- `scontrato_line_fecha` - Fechas de servicio
- `cupos` - Cupos de eventos

**Impacto:**
- ⚠️ No se pueden gestionar eventos grandes
- ⚠️ No hay contratos de catering

---

#### L. ATRIBUTOS DE PRODUCTOS (0% Implementado)

**Tablas Faltantes:**
- `colores` - Colores de productos
- `tallas` - Tallas/tamaños
- `variaciones` - Variaciones de productos

**Impacto:**
- ⚠️ No se pueden vender productos con atributos (ropa, etc.)

---

#### M. INTEGRACIONES EXTERNAS (0% Implementado)

**Tablas Faltantes:**
- `opencart` - Integración OpenCart
- `opencart_comg` - Productos OpenCart
- `opencart_tipo_comg` - Categorías OpenCart
- `opencart_remove` - Productos eliminados
- `bitcoin` - Pagos Bitcoin
- `bitcoinlabel` - Direcciones Bitcoin
- `bitchange` - Cambio Bitcoin
- `smsenvio` - Envío de SMS
- `smsenvios` - Historial SMS

**Impacto:**
- ⚠️ No hay integración e-commerce
- ⚠️ No se aceptan pagos en Bitcoin
- ⚠️ No hay envío de SMS

---

#### N. REPORTES Y CONSULTAS (0% Implementado)

**Tablas Faltantes:**
- `reports` - Reportes personalizados
- `consultas` - Consultas guardadas
- `backup` - Configuración de backups

**Impacto:**
- ⚠️ No hay reportes personalizados
- ⚠️ Reportes limitados a los programados

---

#### O. OTROS MÓDULOS (0% Implementado)

**Tablas Faltantes:**
- `centralita` - Integración centralita telefónica
- `mensajes` - Mensajería interna
- `notificaciones` - Notificaciones del sistema
- `navigator_images` - Galería de imágenes
- `complementogimg` - Imágenes de productos
- `form_textos` - Textos personalizables
- `auxiliar` - Tablas auxiliares
- `estado` - Estados del sistema
- `dia`, `hora` - Control de horarios
- `contadores` - Contadores automáticos
- `serie` - Series de documentos
- `modo_pago` - Formas de pago extendidas
- `idioma` - Idiomas adicionales

---

## 3. COMPARACIÓN DE MÓDULOS FUNCIONALES

### Sistema Antiguo (20+ Módulos)

| # | Módulo | Estado en Sistema Nuevo |
|---|--------|------------------------|
| 1 | **Punto de Venta (TPV)** | ✅ 70% Implementado |
| 2 | **Gestión de Productos** | ✅ 40% Implementado (falta complementos, packs, variaciones) |
| 3 | **Gestión de Mesas** | ✅ 90% Implementado |
| 4 | **Panel de Cocina** | ✅ 60% Implementado (falta notas especiales) |
| 5 | **Inventario** | ❌ 0% Implementado |
| 6 | **Gestión de Clientes** | ❌ 0% Implementado |
| 7 | **Gestión de Caja** | ❌ 0% Implementado |
| 8 | **Facturación** | ❌ 0% Implementado |
| 9 | **Gestión de Proveedores** | ❌ 0% Implementado |
| 10 | **Hotelería** | ❌ 0% Implementado |
| 11 | **Complementos de Productos** | ❌ 0% Implementado |
| 12 | **Productos Combinados/Packs** | ❌ 0% Implementado |
| 13 | **Sistema de Precios Avanzado** | ⚠️ 30% Implementado |
| 14 | **Reportes FastReport** | ❌ 0% Implementado |
| 15 | **Integraciones E-commerce** | ❌ 0% Implementado |
| 16 | **Pagos Bitcoin** | ❌ 0% Implementado |
| 17 | **Sistema de Eventos/Contratos** | ❌ 0% Implementado |
| 18 | **SMS Marketing** | ❌ 0% Implementado |
| 19 | **Multiidioma** | ⚠️ Parcial (solo ES/EN) |
| 20 | **Sistema de Usuarios** | ✅ 80% Implementado |

**Cobertura Total de Funcionalidades: ~25%** ❌

---

## 4. ARQUITECTURA Y TECNOLOGÍA

### Ventajas del Sistema Nuevo

| Aspecto | Sistema Antiguo | Sistema Nuevo | Ventaja |
|---------|----------------|---------------|---------|
| **Backend** | PHP 5.x (EoL 2018) | Node.js 18+ | ✅ Moderno, seguro |
| **Frontend** | jQuery 1.8.2 (2013) | React 18 + TypeScript | ✅ Moderno, mantenible |
| **Base de Datos** | MySQL 5.0 (EoL 2009) | SQLite/MySQL 8+ | ✅ Moderno, seguro |
| **API** | Ninguna | REST API bien estructurada | ✅ Escalable |
| **Seguridad** | Básica | JWT, CORS, Helmet, bcrypt | ✅ Robusta |
| **Testing** | Ninguno | Preparado para tests | ✅ Calidad |
| **Documentación** | Mínima | OpenAPI/Swagger | ✅ Completa |
| **Arquitectura** | Monolítica | Modular/Microservicios | ✅ Escalable |

---

## 5. PLAN DE ACCIÓN RECOMENDADO

### FASE 1: FUNCIONALIDADES CRÍTICAS (1-2 meses)

**Prioridad 1 - Bloqueantes:**
1. ✅ Sistema de Gestión de Caja
   - Apertura/cierre de caja
   - Reporte Z fiscal
   - Movimientos de efectivo

2. ✅ Gestión de Inventario Básico
   - Control de stock
   - Alertas de mínimos
   - Entrada de mercancía

3. ✅ Complementos de Productos
   - Extras/modificaciones
   - Precio por complemento

4. ✅ Gestión de Clientes Básica
   - Maestro de clientes
   - Facturación a nombre

### FASE 2: FUNCIONALIDADES IMPORTANTES (2-3 meses)

5. ✅ Sistema de Facturación Completo
6. ✅ Gestión de Proveedores
7. ✅ Productos Combinados/Packs
8. ✅ Sistema de Precios Avanzado
9. ✅ Panel de Cocina Avanzado

### FASE 3: FUNCIONALIDADES ADICIONALES (3-4 meses)

10. ✅ Módulo de Hotelería
11. ✅ Integraciones E-commerce
12. ✅ Sistema de Reportes Avanzado
13. ✅ Eventos y Contratos

### FASE 4: OPTIMIZACIONES (ongoing)

14. ✅ Pagos alternativos (Bitcoin, etc.)
15. ✅ SMS Marketing
16. ✅ Atributos de productos
17. ✅ Módulos especializados

---

## 6. CONCLUSIONES

### ⚠️ ESTADO ACTUAL: NO APTO PARA PRODUCCIÓN

El sistema nuevo, aunque tecnológicamente superior, **solo cubre el 25% de las funcionalidades** del sistema antiguo.

### Funcionalidades Críticas Faltantes:

❌ Gestión de Inventario (0%)
❌ Gestión de Clientes (0%)
❌ Gestión de Caja (0%)
❌ Facturación (0%)
❌ Proveedores (0%)
❌ Complementos de Productos (0%)
❌ Packs/Combos (0%)

### Recomendación:

**NO SE PUEDE DESPLEGAR A PRODUCCIÓN** hasta completar al menos las fases 1 y 2 del plan de acción (3-5 meses de desarrollo).

**Alternativa para despliegue inmediato:**
- Mantener sistema antiguo en producción
- Usar sistema nuevo en modo piloto/pruebas
- Migración gradual módulo por módulo

---

## 7. MATRIZ DE RIESGO

| Funcionalidad | Riesgo si No Está | Impacto | Probabilidad | Nivel |
|---------------|-------------------|---------|--------------|-------|
| Gestión de Caja | Pérdida de efectivo, fraude | ALTO | ALTO | 🔴 CRÍTICO |
| Inventario | Desabastecimiento, pérdidas | ALTO | ALTO | 🔴 CRÍTICO |
| Clientes | Pérdida de fidelización | MEDIO | ALTO | 🟡 ALTO |
| Facturación | Incumplimiento legal | ALTO | ALTO | 🔴 CRÍTICO |
| Complementos | Pérdida de ingresos | MEDIO | MEDIO | 🟡 MEDIO |

---

**Elaborado por:** Análisis Automático Claude
**Fecha:** 2025-10-25
**Versión:** 1.0
