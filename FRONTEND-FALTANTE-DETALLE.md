# 🎨 PÁGINAS Y COMPONENTES FRONTEND FALTANTES EN SYSME-POS

**Análisis Comparativo:** Sistema Antiguo vs Sistema Nuevo
**Fecha:** 2 de Diciembre de 2024
**Estado Actual:** ~60% Completado, ~40% Faltante

---

## 📱 PÁGINAS PRINCIPALES FALTANTES

### 1. PUNTO DE VENTA EXTENDIDO

#### 🔴 **VentasAbiertas.jsx** (CRÍTICO)
```javascript
// Equivalente a: abiertas.php
// Funcionalidad: Listar y gestionar ventas suspendidas/aparcadas

Componente debe incluir:
- Lista de ventas abiertas por empleado
- Filtros por mesa/fecha/empleado
- Botón reanudar venta
- Botón eliminar venta
- Vista previa de items
- Total de cada venta
- Tiempo transcurrido desde apertura
```

#### 🔴 **AparcarVenta.jsx** (CRÍTICO)
```javascript
// Nueva funcionalidad para suspender venta actual
// Sistema antiguo: Lo hace inline en venta.php

Funciones necesarias:
- Modal para confirmar suspensión
- Input para nombre/referencia
- Guardar estado actual completo
- Limpiar terminal para nueva venta
- Notificación de éxito
```

#### 🔴 **CambiarMesa.jsx** (CRÍTICO)
```javascript
// Equivalente a: funcionalidad dentro de venta.php
// Cambiar mesa de una venta activa

Incluir:
- Selector de mesa destino
- Validación mesa libre/ocupada
- Actualizar venta con nueva mesa
- Actualizar mapa de mesas
- Historial de cambios
```

---

### 2. GESTIÓN DE TARIFAS Y PRECIOS

#### 🟡 **GestionTarifas.jsx**
```javascript
// Gestión completa de tarifas
// Sistema antiguo: tabla comg_tarifa

Componentes:
- ListaTarifas
- FormularioTarifa
- AsignacionProductos
- PreciosPorTarifa
- ImportExportTarifas
```

#### 🟡 **CambioTarifaVenta.jsx**
```javascript
// Modal para cambiar tarifa en venta activa
// Recalcular todos los precios automáticamente

Features:
- Selector de tarifa
- Preview de cambios de precio
- Confirmación de cambio
- Recálculo automático
```

---

### 3. GESTIÓN DE PROVEEDORES (MÓDULO COMPLETO)

#### 🔴 **Proveedores.jsx** (PÁGINA PRINCIPAL)
```javascript
// Sistema completo de proveedores
// Antiguo: proveedor, pproveedor

Subcomponentes necesarios:
├── ListaProveedores.jsx
├── FormularioProveedor.jsx
├── FichaProveedor.jsx
├── HistorialCompras.jsx
└── EvaluacionProveedor.jsx
```

#### 🔴 **OrdenesCompra.jsx**
```javascript
// Gestión de pedidos a proveedores
// Antiguo: pedido, ped_comg

Funcionalidades:
- Crear orden de compra
- Selección de productos
- Cantidades y precios
- Aprobación de orden
- Seguimiento de entrega
- Recepción de mercancía
```

#### 🔴 **RecepcionMercancia.jsx**
```javascript
// Recibir productos de proveedores
// Actualizar inventario

Incluir:
- Escaneo de albarán
- Verificación de cantidades
- Control de calidad
- Actualización de stock
- Generación de incidencias
```

---

### 4. GESTIÓN DE ALMACENES

#### 🔴 **Almacenes.jsx**
```javascript
// Multi-almacén completo
// Antiguo: almacen, almacen_complementg

Componentes:
├── ListaAlmacenes.jsx
├── StockPorAlmacen.jsx
├── TraspasoAlmacenes.jsx
├── MovimientosAlmacen.jsx
└── ConfiguracionAlmacen.jsx
```

#### 🔴 **TraspasoStock.jsx**
```javascript
// Transferencias entre almacenes
// Antiguo: traspasos, traspasos_complementog

Features:
- Selección almacén origen/destino
- Lista de productos a traspasar
- Cantidades disponibles
- Documento de traspaso
- Confirmación recepción
```

#### 🔴 **ControlMermas.jsx**
```javascript
// Registro de pérdidas/mermas
// Nueva funcionalidad mejorada

Incluir:
- Tipo de merma (rotura, caducidad, robo)
- Productos afectados
- Cantidades
- Motivo detallado
- Aprobación supervisor
- Ajuste automático stock
```

---

### 5. GESTIÓN AVANZADA DE CLIENTES

#### 🟡 **CuentasCorrientes.jsx**
```javascript
// Ventas a crédito para clientes
// Antiguo: car_acuenta, res_acuenta

Funcionalidades:
- Estado de cuenta por cliente
- Límites de crédito
- Pagos parciales
- Antigüedad de saldos
- Alertas de morosidad
- Historial de pagos
```

#### 🟡 **TarjetasFidelidad.jsx**
```javascript
// Sistema de fidelización
// Antiguo: carnet, cliente_fan

Componentes:
- Emisión de tarjetas
- Acumulación de puntos
- Canje de puntos
- Beneficios VIP
- Historial de movimientos
- Estadísticas de uso
```

#### 🟡 **SegmentacionClientes.jsx**
```javascript
// Segmentación avanzada con IA
// Mejora del sistema antiguo

Features:
- Segmentación automática (JARVIS)
- Criterios personalizados
- Grupos dinámicos
- Campañas por segmento
- Análisis de comportamiento
```

---

### 6. DOCUMENTOS COMERCIALES

#### 🔴 **Albaranes.jsx**
```javascript
// Gestión de albaranes
// Antiguo: albaran, alb_comg

Componentes:
├── ListaAlbaranes.jsx
├── NuevoAlbaran.jsx
├── EditorAlbaran.jsx
├── ImpresionAlbaran.jsx
└── ConversionFactura.jsx
```

#### 🔴 **Presupuestos.jsx**
```javascript
// Sistema de presupuestos
// Antiguo: presupuesto, presu_comg

Funciones:
- Crear presupuesto
- Plantillas de presupuesto
- Vigencia y seguimiento
- Conversión a venta
- Historial de versiones
- Aprobación cliente
```

#### 🔴 **SeriesDocumentos.jsx**
```javascript
// Configuración de series
// Antiguo: serie

Gestionar:
- Series de facturas
- Series de albaranes
- Series de presupuestos
- Numeración automática
- Prefijos y sufijos
```

---

### 7. PANEL DE COCINA MEJORADO

#### 🟡 **PanelCocinaAvanzado.jsx**
```javascript
// Mejora del panel actual
// Añadir funcionalidades del sistema antiguo

Nuevas features:
- Vista por estaciones
- Tiempos estimados (IA)
- Priorización automática
- Comunicación con camareros
- Historial de preparación
- Métricas de eficiencia
```

#### 🟡 **GestionBloquesCocina.jsx**
```javascript
// Organización de platos por bloques
// Para servir juntos

Incluir:
- Agrupación de órdenes
- Sincronización de tiempos
- Vista de bloques activos
- Marcar bloque completo
```

---

### 8. INTEGRACIONES E-COMMERCE

#### 🟡 **IntegracionOpenCart.jsx**
```javascript
// Sincronización con OpenCart
// Antiguo: sysmetpvopencart/*

Módulos:
├── ConfiguracionOpenCart.jsx
├── SincronizacionProductos.jsx
├── ImportacionPedidos.jsx
├── ActualizacionStock.jsx
└── LogSincronizacion.jsx
```

#### 🟡 **IntegracionWooCommerce.jsx**
```javascript
// Sincronización con WooCommerce
// Antiguo: sysmetpvopencart-wc/*

Similar a OpenCart pero para WordPress/WooCommerce
```

---

### 9. GESTIÓN DE HABITACIONES (HOTEL)

#### 🟢 **GestionHabitaciones.jsx**
```javascript
// Si el negocio es hotel
// Antiguo: habitacion, tipo_hab

Componentes:
├── MapaHabitaciones.jsx
├── EstadoHabitaciones.jsx
├── ReservasHabitacion.jsx
├── CheckInOut.jsx
└── ServiciosHabitacion.jsx
```

---

### 10. CONFIGURACIÓN Y ADMINISTRACIÓN

#### 🟡 **ConfiguracionEmpresa.jsx**
```javascript
// Datos de la empresa
// Antiguo: empresa

Secciones:
- Datos fiscales
- Logos y branding
- Múltiples sucursales
- Configuración regional
- Integración fiscal
```

#### 🟡 **GestionPrivilegios.jsx**
```javascript
// Control granular de permisos
// Antiguo: privilegios_a, privilegios_e, camareros_priv

Gestionar:
- Permisos por usuario
- Permisos por grupo
- Permisos especiales
- Matriz de permisos
- Auditoría de cambios
```

#### 🟡 **MultiIdioma.jsx**
```javascript
// Gestión de traducciones
// Antiguo: es.php, en.php, nl.php

Features:
- Editor de traducciones
- Importar/Exportar
- Idiomas personalizados
- Variables dinámicas
- Preview por idioma
```

---

## 🧩 COMPONENTES REUTILIZABLES FALTANTES

### Componentes de UI

```javascript
// Selector de Empleado con Foto
EmployeeSelector.jsx
- Muestra foto del empleado
- Validación de clave
- Estado online/offline

// Teclado Numérico Virtual
VirtualNumpad.jsx
- Para tablets/touch
- Entrada rápida de cantidades
- Cálculo de cambio

// Selector de Mesa Visual
TablePicker.jsx
- Mapa interactivo
- Estado en tiempo real
- Drag & drop para cambiar

// Buscador de Productos Avanzado
AdvancedProductSearch.jsx
- Búsqueda por código
- Búsqueda por nombre
- Búsqueda por categoría
- Historial de búsquedas

// Editor de Notas de Cocina
KitchenNotesEditor.jsx
- Notas predefinidas
- Notas personalizadas
- Iconos especiales
- Prioridad de nota

// Calculadora de Cambio
ChangeCalculator.jsx
- Billetes y monedas
- Sugerencia de cambio
- Múltiples monedas

// Timeline de Eventos
EventTimeline.jsx
- Historial de acciones
- Filtros por tipo
- Exportación de logs

// Selector de Fecha/Hora Personalizado
CustomDateTimePicker.jsx
- Rangos predefinidos
- Comparación períodos
- Festivos y eventos
```

### Componentes de Negocio

```javascript
// Gestor de Packs/Combos
PackManager.jsx
- Crear packs
- Componentes del pack
- Precios especiales
- Vigencia temporal

// Control de Caducidades
ExpiryControl.jsx
- Alertas de caducidad
- Productos próximos a vencer
- Gestión FIFO/LIFO

// Gestor de Turnos
ShiftManager.jsx
- Apertura de turno
- Cambio de turno
- Cierre de turno
- Traspaso de caja

// Control de Mesas Fusionadas
MergedTablesControl.jsx
- Fusionar mesas
- Separar mesas
- Mantener cuentas

// Gestor de Reservas Avanzado
AdvancedReservations.jsx
- Calendario visual
- Bloqueo de mesas
- Lista de espera
- Confirmaciones automáticas
```

### Componentes de Reportes

```javascript
// Dashboard Gerencial
ManagerDashboard.jsx
- KPIs en tiempo real
- Comparativas
- Proyecciones
- Alertas críticas

// Análisis de Rentabilidad
ProfitabilityAnalysis.jsx
- Por producto
- Por categoría
- Por período
- Por empleado

// Matriz BCG de Productos
BCGMatrix.jsx
- Clasificación productos
- Estrella/Vaca/Perro/Interrogante
- Recomendaciones

// Heatmap de Ventas
SalesHeatmap.jsx
- Por hora/día
- Por mesa/zona
- Por producto
- Patrones identificados
```

---

## 📊 PÁGINAS DE ADMINISTRACIÓN FALTANTES

```javascript
// Sistema de Auditoría
AuditLog.jsx
- Todas las acciones
- Filtros avanzados
- Exportación forense

// Gestión de Backups
BackupManager.jsx
- Programación backups
- Restauración
- Historial
- Verificación integridad

// Monitor de Sistema
SystemMonitor.jsx
- Estado servicios
- Uso recursos
- Alertas sistema
- Logs en tiempo real

// Configuración Fiscal
FiscalConfig.jsx
- Tipos de IVA
- Configuración facturas
- Integración SII/AEAT
- Certificados digitales

// Gestión de Dispositivos
DeviceManager.jsx
- Impresoras
- Cajones monederos
- Lectores códigos
- Terminales pago

// Centro de Notificaciones
NotificationCenter.jsx
- Configurar alertas
- Canales (email, SMS)
- Plantillas mensajes
- Historial envíos
```

---

## 🎯 PRIORIZACIÓN DE DESARROLLO FRONTEND

### FASE 1: CRÍTICO (1-2 semanas)
1. ✅ VentasAbiertas.jsx
2. ✅ AparcarVenta.jsx
3. ✅ CambiarMesa.jsx
4. ✅ Proveedores.jsx (módulo básico)
5. ✅ OrdenesCompra.jsx
6. ✅ Almacenes.jsx
7. ✅ TraspasoStock.jsx

### FASE 2: IMPORTANTE (1-2 semanas)
1. ✅ Albaranes.jsx
2. ✅ Presupuestos.jsx
3. ✅ SeriesDocumentos.jsx
4. ✅ CuentasCorrientes.jsx
5. ✅ GestionTarifas.jsx
6. ✅ RecepcionMercancia.jsx

### FASE 3: MEJORAS (1 semana)
1. ✅ TarjetasFidelidad.jsx
2. ✅ PanelCocinaAvanzado.jsx
3. ✅ IntegracionOpenCart.jsx
4. ✅ IntegracionWooCommerce.jsx
5. ✅ ConfiguracionEmpresa.jsx

### FASE 4: OPTIMIZACIÓN (1 semana)
1. ✅ Componentes reutilizables
2. ✅ Testing de integración
3. ✅ Optimización de performance
4. ✅ Documentación de componentes

---

## 📈 ESTIMACIÓN DE ESFUERZO

| Categoría | Páginas | Componentes | Horas Est. | Desarrolladores |
|-----------|---------|-------------|------------|-----------------|
| Críticas | 12 | 35 | 240h | 2 devs × 2 semanas |
| Importantes | 10 | 25 | 160h | 2 devs × 1.5 semanas |
| Mejoras | 8 | 20 | 120h | 1 dev × 2 semanas |
| Optimización | 5 | 15 | 80h | 1 dev × 1 semana |
| **TOTAL** | **35** | **95** | **600h** | **2 devs × 5 semanas** |

---

## 🔧 CONFIGURACIÓN DE RUTAS FALTANTES

```javascript
// Nuevas rutas a añadir en React Router

// Ventas
<Route path="/pos/ventas-abiertas" element={<VentasAbiertas />} />
<Route path="/pos/aparcar" element={<AparcarVenta />} />
<Route path="/pos/cambiar-mesa/:saleId" element={<CambiarMesa />} />

// Proveedores
<Route path="/proveedores" element={<Proveedores />} />
<Route path="/proveedores/:id" element={<FichaProveedor />} />
<Route path="/ordenes-compra" element={<OrdenesCompra />} />
<Route path="/ordenes-compra/nueva" element={<NuevaOrdenCompra />} />
<Route path="/recepcion" element={<RecepcionMercancia />} />

// Almacenes
<Route path="/almacenes" element={<Almacenes />} />
<Route path="/almacenes/traspasos" element={<TraspasoStock />} />
<Route path="/almacenes/mermas" element={<ControlMermas />} />

// Clientes Avanzado
<Route path="/clientes/cuentas" element={<CuentasCorrientes />} />
<Route path="/clientes/fidelidad" element={<TarjetasFidelidad />} />
<Route path="/clientes/segmentacion" element={<SegmentacionClientes />} />

// Documentos
<Route path="/documentos/albaranes" element={<Albaranes />} />
<Route path="/documentos/presupuestos" element={<Presupuestos />} />
<Route path="/documentos/series" element={<SeriesDocumentos />} />

// Configuración
<Route path="/config/empresa" element={<ConfiguracionEmpresa />} />
<Route path="/config/privilegios" element={<GestionPrivilegios />} />
<Route path="/config/idiomas" element={<MultiIdioma />} />
<Route path="/config/tarifas" element={<GestionTarifas />} />

// Integraciones
<Route path="/integraciones/opencart" element={<IntegracionOpenCart />} />
<Route path="/integraciones/woocommerce" element={<IntegracionWooCommerce />} />

// Administración
<Route path="/admin/audit" element={<AuditLog />} />
<Route path="/admin/backup" element={<BackupManager />} />
<Route path="/admin/monitor" element={<SystemMonitor />} />
<Route path="/admin/fiscal" element={<FiscalConfig />} />
<Route path="/admin/devices" element={<DeviceManager />} />
```

---

**CONCLUSIÓN:** El sistema nuevo tiene implementada la base arquitectural moderna y las funcionalidades core, pero requiere desarrollar **35 páginas principales** y **95 componentes** adicionales para alcanzar la paridad funcional completa con el sistema antiguo. Con un equipo de 2 desarrolladores, se estima completar en **5 semanas** de desarrollo intensivo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>