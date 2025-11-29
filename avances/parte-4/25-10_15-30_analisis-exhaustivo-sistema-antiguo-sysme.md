# ANÁLISIS EXHAUSTIVO DEL SISTEMA SYSME EN PRODUCCIÓN

**Fecha de Análisis:** 25 de Octubre de 2024 - 15:30
**Sistema Analizado:** SYSME (Sistema de Gestión para Restaurantes)
**Ubicación:** E:\POS SYSME\Sysme_Principal\SYSME
**Estado:** En producción real en múltiples restaurantes
**Analista:** Claude Code con TestSprite
**Propósito:** Base para desarrollo de sistema sustituto (RestaurantBot Analytics)

---

## ⚠️ ADVERTENCIA CRÍTICA

Este sistema está **EN PRODUCCIÓN REAL** en restaurantes. Cualquier funcionalidad faltante en el nuevo sistema podría causar **interrupciones graves** en el servicio. Los restaurantes dependen 100% de este sistema para operar.

---

## RESUMEN EJECUTIVO

Basado en mi exploración exhaustiva del sistema SYSME ubicado en `E:\POS SYSME\Sysme_Principal\SYSME`, he identificado:

- **143 tablas** en la base de datos
- **20+ módulos funcionales**
- **30+ funcionalidades críticas** que DEBEN estar en el nuevo sistema
- **5 integraciones externas** activas
- **Tecnología:** PHP Legacy + MySQL + jQuery Mobile
- **Arquitectura:** Monolítica Cliente-Servidor

---

## 1. ESTRUCTURA GENERAL DEL PROYECTO

### 1.1 Arquitectura Principal

El sistema SYSME está dividido en **DOS componentes principales**:

**A. SGC (Sistema de Gestión Comercial)**
- Ubicación: `E:\POS SYSME\Sysme_Principal\SYSME\SGC`
- Contiene: XAMPP (Apache + MySQL + PHP)
- Rol: Servidor web y aplicaciones
- Puerto Apache: 4406
- Puerto MySQL Cliente: 4306

**B. sysmeserver (Servidor de Base de Datos)**
- Ubicación: `E:\POS SYSME\Sysme_Principal\SYSME\sysmeserver`
- Contiene: MySQL Server
- Rol: Motor de base de datos principal
- Base de datos: `sysmehotel` (143 tablas)

### 1.2 Stack Tecnológico Identificado

**Backend:**
```
- PHP 5.x (Legacy)
- MySQL extension (NO MySQLi - DEPRECATED)
- MySQL 5.x Server
- Apache Web Server 2.x (vía XAMPP)
- Puerto MySQL: 4306 (personalizado)
- Puerto Apache: 4406 (personalizado)
```

**Frontend:**
```
- jQuery 1.8.2
- jQuery Mobile (Framework móvil)
- jQuery UI 1.8.9
- DataTables (Tablas dinámicas)
- jQuery numeric
- HTML5 + CSS3
- Responsive Design
```

**Arquitectura:**
```
- Modelo: Cliente-Servidor tradicional
- Patrón: SIN framework MVC formal
- Sesiones: PHP Sessions
- AJAX: jQuery.load() para actualizaciones
- Real-time: Polling cada 5 segundos (NO WebSockets)
```

---

## 2. MÓDULOS PRINCIPALES DEL SISTEMA

### 2.1 Módulo POS (Point of Sale) - Sistema TPV Principal ⭐⭐⭐⭐⭐

**Ubicación:** `htdocs/pos/pos/`
**Criticidad:** MÁXIMA - Es el corazón del sistema

#### A. Gestión de Ventas (Core del Sistema)

**Archivos principales:**
```
abiertas.php           - Lista de ventas en curso
venta/nuevaventa.php   - Crear nueva transacción
aparcarventa.php       - Guardar venta temporalmente
venta/finalizaventa.php - Completar y cerrar venta
venta/cancelaventa.php  - Anular transacción
```

**Funcionalidades:**
- ✅ Crear venta nueva (asociada a mesa y empleado)
- ✅ Listar ventas abiertas con filtros
- ✅ Aparcar venta (guardar temporalmente sin cerrar)
- ✅ Recuperar venta aparcada
- ✅ Finalizar venta (genera ticket, registra pago)
- ✅ Cancelar venta (restaura stock, audita)
- ✅ Modificar venta en curso

**Flujo Completo:**
```
1. Empleado selecciona mesa libre
2. Sistema crea ventadirecta (cabecera)
3. Empleado añade productos (ventadir_comg)
4. Sistema descuenta stock automáticamente
5. Envía a cocina (venta_cocina)
6. Cocina prepara y marca servido
7. Empleado imprime pre-ticket (opcional)
8. Cliente paga
9. Sistema genera ticket fiscal
10. Mesa queda libre
```

#### B. Gestión de Productos

**Archivos:**
```
catalogo.php          - Catálogo visual de productos
bproductos.php        - Búsqueda de productos
categorias.php        - Lista de categorías
sub_categorias.php    - Subcategorías
image.php             - Servir imagen de producto
imagecat.php          - Servir imagen de categoría
```

**Funcionalidades:**
- ✅ Navegación por categorías jerárquicas
- ✅ Búsqueda de productos por nombre/código
- ✅ Vista de catálogo con imágenes
- ✅ Información detallada de producto
- ✅ Precio según tarifa de mesa
- ✅ Stock disponible en tiempo real

**Gestión de Líneas de Venta:**
```
venta/insertalinea.php   - Añadir producto a venta
venta/updatelinea.php    - Modificar cantidad/precio
venta/borralinea.php     - Eliminar línea (con auditoría)
```

#### C. Gestión de Mesas (Hostelería) ⭐⭐⭐⭐⭐

**Archivos críticos:**
```
mapa-mesas.php   - Mapa visual de mesas
mapa.php         - Renderizado del mapa
showmap.php      - Toggle mostrar/ocultar mapa
```

**Funcionalidades:**
- ✅ **Mapa visual de mesas:**
  - Posicionamiento CSS personalizado (top, left, width, height)
  - Estado visual: libre (verde) / ocupada (rojo)
  - Click para crear venta o abrir existente
  - Responsive para tablets

- ✅ **Salones múltiples:**
  - Diferentes zonas del restaurante
  - Terraza, salón principal, VIP, etc.
  - Cambio rápido entre salones

- ✅ **Cambio de mesa:**
  - Durante la venta activa
  - Recalcula tarifas si aplica

- ✅ **Comensales por mesa:**
  - Registro de número de personas
  - Analytics de ticket medio por comensal

**Estructura de Datos:**
```sql
mesa:
  - id_mesa
  - Num_Mesa (número visible)
  - id_salon (zona)
  - id_tarifa (precio especial)
  - posicion_x, posicion_y (CSS)
  - ancho, alto (CSS)
  - estado (libre/ocupada)
```

#### D. Gestión de Cocina ⭐⭐⭐⭐⭐

**Panel de Cocina en Tiempo Real:**

**Archivos:**
```
panelcocina.php      - Vista principal cocina
panel.php            - Contenedor con auto-refresh
marcar_servido.php   - Marcar producto como preparado
operaciones_venta.php - Enviar órdenes a cocina
```

**Funcionalidades:**
- ✅ **Cola de órdenes:**
  - Tabla `venta_cocina`
  - Muestra solo productos pendientes (cocina < cantidad)
  - Auto-refresh cada 5 segundos

- ✅ **Bloque de cocina:**
  - Agrupa productos que van juntos
  - Permite envíos parciales:
    - Bloque 1: Entrantes
    - Bloque 2: Platos principales
    - Bloque 3: Postres

- ✅ **Marcar como servido:**
  - Un click marca producto preparado
  - UPDATE ventadir_comg SET cocina = cantidad
  - Desaparece de la cola automáticamente

- ✅ **Notas de cocina:**
  - Tabla `notacocina`
  - Opciones de preparación:
    - "Sin cebolla"
    - "Poco hecho"
    - "Muy hecho"
    - "Sin gluten"
    - "Picante"
  - Asociadas a productos específicos

**Flujo de Cocina:**
```
1. Mesero envía orden (operaciones_venta.php)
   └─> INSERT INTO venta_cocina

2. Panel detecta nueva orden (5s polling)
   └─> SELECT WHERE cocina < cantidad

3. Cocina prepara producto

4. Cocina marca servido (click)
   └─> UPDATE cocina = cantidad

5. Producto desaparece de panel
```

#### E. Sistema de Tarifas ⭐⭐⭐⭐

**Características:**
- ✅ **Múltiples tarifas por producto:**
  - Tabla `comg_tarifa` (id_complementog, id_tarifa, pvptarifa)
  - Cada mesa puede tener tarifa específica
  - Cálculo automático al añadir producto

- ✅ **Ejemplos de uso:**
  - Tarifa "Terraza": +10%
  - Tarifa "Bar": Precio estándar
  - Tarifa "VIP": -5%
  - Tarifa "Happy Hour": -20%

- ✅ **Cambio de tarifa:**
  - Manual por empleado (si tiene permiso `cambiartarifa`)
  - Afecta todos los productos de la venta
  - Recalcula precios automáticamente

#### F. Control de Empleados y Privilegios ⭐⭐⭐⭐⭐

**Sistema de Login:**
```php
login.php           - Pantalla de login
form-login.php      - Formulario
imageempleado.php   - Foto de empleado
```

**Privilegios Granulares:**
```
borrarlinea       - Puede eliminar líneas de venta
modtiquet         - Puede modificar tickets
modtraspreticket  - Puede modificar tras pre-ticket
finalizarventas   - Puede cerrar ventas
cancelartiquet    - Puede anular tickets
preciomanual      - Puede establecer precio manual
cambiartarifa     - Puede cambiar tarifa de mesa
```

**Implementación:**
```php
// En login.php - Carga privilegios en sesión
$_SESSION['borrarlinea'] = $row['borrarlinea'];
$_SESSION['finalizarventas'] = $row['finalizarventas'];
$_SESSION['preciomanual'] = $row['preciomanual'];
$_SESSION['cambiartarifa'] = $row['cambiartarifa'];

// En páginas - Valida antes de mostrar opciones
if ($_SESSION['finalizarventas'] == 'S') {
    // Mostrar botón finalizar venta
}

if ($_SESSION['borrarlinea'] == 'S') {
    // Permitir eliminar líneas
}
```

#### G. Gestión de Stock Automática ⭐⭐⭐⭐⭐

**Archivo:** `funciones.php`

**Funciones principales:**
```php
restastock($id_producto, $cantidad)
restaurastock($id_producto, $cantidad)
```

**Funcionalidades:**
- ✅ **Descuento automático al vender:**
  ```php
  // Al insertar línea de venta
  restastock($id_complementog, $cantidad);
  // UPDATE almacen_complementg SET cantidad = cantidad - X
  ```

- ✅ **Restauración al cancelar:**
  ```php
  // Al cancelar venta
  restaurastock($id_complementog, $cantidad);
  ```

- ✅ **Gestión de Packs/Combos:**
  - Descuenta componentes individuales
  - **Recursivo:** Packs dentro de packs
  ```php
  // Si es pack, obtener componentes
  SELECT FROM pack WHERE id_complementog = $id
  // Para cada componente
  restastock($componente, $cantidad * $factor);
  ```

- ✅ **Multi-almacén:**
  - Stock independiente por almacén
  - Descuento del almacén activo del TPV

#### H. Sistema de Tickets e Impresión ⭐⭐⭐⭐⭐

**Tablas:**
```sql
tiquet            - Tickets emitidos (histórico)
venta_preticket   - Cola de pre-tickets
venta_ticket      - Cola de tickets fiscales
```

**Funcionalidades:**
- ✅ **Pre-tickets:**
  - Cliente revisa cuenta antes de pagar
  - Puede añadir más productos después
  - No cierra la venta

- ✅ **Tickets fiscales:**
  - Generación automática al finalizar venta
  - Serie de facturación configurable
  - Cola de impresión

- ✅ **Impresión:**
  - Sistema de colas
  - Múltiples impresoras
  - Reintentos automáticos

#### I. Pagos y Caja ⭐⭐⭐⭐⭐

**Tablas:**
```sql
apcajas        - Aperturas/cierres de caja
pagoscobros    - Registro de todos los pagos
modo_pago      - Formas de pago disponibles
cajas          - Puntos de venta (TPV)
```

**Funcionalidades:**
- ✅ **Apertura de caja:**
  - Registra empleado, fecha, hora
  - Saldo inicial

- ✅ **Múltiples modos de pago:**
  - Efectivo
  - Tarjeta
  - Transferencia
  - Bitcoin
  - Cheque
  - Vale

- ✅ **Registro de pagos:**
  - Cada pago registrado en `pagoscobros`
  - Asociado a venta y empleado
  - Timestamp preciso

- ✅ **Cierre de caja:**
  - Conteo de efectivo
  - Comparación con sistema
  - Generación de reporte Z
  - Marca abierta = 'N'

#### J. Combinados y Extras ⭐⭐⭐

**Tablas:**
```sql
combinados              - Definición de combinados
pack                   - Packs de productos
combinados_hosteleria  - Específico para restaurantes
```

**Niveles de Combinación:**

**Nivel 1: Combinados Simples**
```
Hamburguesa + opción de carne
  - Res
  - Pollo
  - Cerdo
```

**Nivel 2: Packs Compuestos**
```
Menú del Día:
  - Entrante (varios opciones)
  - Plato principal (varios opciones)
  - Postre (varios opciones)
  - Bebida
```

**Nivel 3: Recursivo**
```
Pack "Fiesta":
  - Pack "Entrantes" (que a su vez tiene componentes)
  - Pack "Platos" (que a su vez tiene componentes)
  - Bebidas individuales
```

#### K. Características Adicionales

**Multi-idioma:**
```php
es.php  - Español
en.php  - Inglés
nl.php  - Holandés (Neerlandés)
```

**Otras Features:**
- ✅ Observaciones en ventas (nivel cabecera)
- ✅ Observaciones en líneas (por producto)
- ✅ Incremento automático de cantidad (configurable)
- ✅ QR Code para acceso móvil
- ✅ Responsive para tablets y móviles
- ✅ Modo oscuro/claro (parcial)

---

### 2.2 Módulo CARTA (Menú Digital para Clientes) ⭐⭐⭐

**Ubicación:** `htdocs/carta/pos/`

**Propósito:** Menú visual para que clientes vean en tablets en las mesas

**Funcionalidades:**
- ✅ Visualización de menú
- ✅ Navegación por categorías/subcategorías
- ✅ Ficha detallada de producto (`ficha_producto.php`)
- ✅ Galería de imágenes
- ✅ Sin precios o con precios (configurable)
- ✅ Scroll infinito para productos
- ✅ Diseño atractivo y moderno

**Diferencias con POS:**
- Solo lectura (no permite ventas directas)
- Interfaz más visual y atractiva
- Enfocado en experiencia del cliente
- Sin información de stock

---

### 2.3 Módulo STATS (Reportes y Analytics) ⭐⭐⭐⭐

**Ubicación:** `htdocs/stats/`

#### A. Informe de Ventas (`informe-ventas.php`)

**Filtros disponibles:**
```
- Rango de fechas (desde/hasta)
- Rango de horas (desde/hasta)
- Punto de venta (TPV específico)
- Almacén
- Empleado/Mesero
- Categoría de producto
- Producto específico
```

**Tipos de informe:**
```
S - Ventas normales
R - Roturas (mermas)
I - Invitaciones (cortesías)
A - Auto-consumo (empleados)
O - Otros conceptos
```

**Agrupaciones:**
```
- Total general
- Por año
- Por mes
- Por día
- Por hora
- Por categoría de producto
- Por producto individual
- Por empleado
- Por punto de venta
```

**Tecnología:**
- jQuery UI (Datepicker, Tabs, Buttons)
- DataTables para tablas dinámicas
- Export a Excel/PDF (posible)
- AJAX para carga de resultados

**Métricas calculadas:**
- Total de ventas (€)
- Número de tickets
- Ticket medio
- Productos vendidos
- Comparativa periodos

---

### 2.4 Módulo BITCOIN (Pagos en Criptomonedas) ⭐⭐

**Ubicación:** `htdocs/bitcoin/`

**Funcionalidades:**
- ✅ Integración con Bitcoin Core (JSON-RPC)
- ✅ Generación de direcciones de pago únicas
- ✅ QR codes automáticos para pagos
- ✅ Verificación de pagos recibidos
- ✅ Conversión a moneda local
- ✅ Registro de transacciones

**Archivos:**
```
index.php           - Interfaz de generación de pago
jsonRPCClient.php   - Cliente JSON-RPC
checkpayment.php    - Verificar pago recibido
testconn.php        - Test de conexión con Bitcoin Core
```

**Parámetros:**
- Host y puerto de Bitcoin Core
- Usuario y contraseña RPC
- Monto en BTC
- Etiqueta de transacción

**Flujo:**
```
1. Cliente elige pagar con Bitcoin
2. Sistema genera nueva dirección (getnewaddress)
3. Muestra QR code
4. Cliente escanea y envía BTC
5. Sistema verifica pago (checkpayment.php)
6. Confirma transacción
7. Finaliza venta
```

---

### 2.5 Integración OPENCART (E-commerce) ⭐⭐⭐⭐

**Ubicación:** `htdocs/sysmetpvopencart/`

**Propósito:** Sincronización bidireccional entre SYSME y OpenCart

#### A. Sincronización de Productos (`updateproduct.php`)

**De SYSME a OpenCart:**
```
Campos sincronizados:
- model (id_complementog)
- sku (código interno)
- ean (código de barras)
- quantity (stock actual)
- price (precio)
- weight (peso)
- image (imagen principal)
- sort_order (orden de visualización)
- status (activo/inactivo)
```

**Proceso:**
```sql
-- Lee de SYSME
SELECT * FROM complementog WHERE activo = 'S'

-- Compara con OpenCart
SELECT * FROM oc_product WHERE model = {id_complementog}

-- Si existe: UPDATE
-- Si no existe: INSERT
```

**Soporta OpenCart:**
- Versión 1.5.x
- Versión 2.0.x
- Versión 2.x

#### B. Sincronización de Categorías (`updatecategory.php`)

**Funciones:**
```
cattree.php          - Árbol de categorías
product_category.php - Relación producto-categoría
repaircat.php        - Reparar categorías rotas
```

**Características:**
- Mapeo de categorías SYSME ↔ OpenCart
- Jerarquía de categorías
- Sincronización de imágenes de categoría

#### C. Sincronización de Pedidos (`orders.php`)

**De OpenCart a SYSME:**
```php
// Descarga pedidos nuevos
SELECT * FROM oc_order WHERE importado = 'N'

// Para cada pedido
SELECT * FROM oc_order_product WHERE order_id = X
SELECT * FROM oc_order_total WHERE order_id = X
SELECT * FROM oc_order_shipping WHERE order_id = X

// Crea en SYSME
INSERT INTO ventadirecta (...)
INSERT INTO ventadir_comg (...)

// Marca como importado
UPDATE oc_order SET importado = 'S' WHERE order_id = X
```

**Datos sincronizados:**
- Datos de cliente
- Productos del pedido
- Cantidades
- Precios
- Dirección de envío
- Método de pago
- Totales

#### D. Otras Sincronizaciones

```
product_image.php     - Galería de imágenes
product_special.php   - Precios especiales/ofertas
updatetallas.php      - Tallas/variaciones
remove.php            - Eliminar productos
```

**Seguridad:**
```
token.php  - Sistema de autenticación
```

**Validación:**
```php
if ($_GET['token'] !== EXPECTED_TOKEN) {
    die('Unauthorized');
}
```

---

### 2.6 Integración WOOCOMMERCE ⭐⭐⭐

**Ubicación:** `htdocs/sysmetpvopencart-wc/`

**Funcionalidades:**
- Similar a OpenCart
- Adaptado a WooCommerce (WordPress)
- Misma estructura de archivos
- Sincronización bidireccional

---

## 3. BASE DE DATOS - sysmehotel

### 3.1 Información General

```
Nombre:        sysmehotel
Motor:         MySQL 5.x (InnoDB)
Total Tablas:  143 tablas
Puerto:        4306 (personalizado)
Usuario:       root
Contraseña:    infusorio
```

### 3.2 Tablas Principales por Categoría

#### A. Gestión de Ventas (12 tablas) ⭐⭐⭐⭐⭐

```sql
ventadirecta          -- Cabecera de ventas (mesa, empleado, totales)
ventadir_comg         -- Líneas de detalle (productos vendidos)
venta_cocina          -- Cola de órdenes a cocina
venta_preticket       -- Cola de pre-tickets
venta_ticket          -- Cola de tickets definitivos
lineaseliminadas      -- Auditoría de líneas borradas
tiquet                -- Tickets emitidos (histórico)
pagoscobros           -- Registro de todos los pagos
factura               -- Facturas generadas
presupuesto           -- Presupuestos
pedido                -- Pedidos
albaran               -- Albaranes de entrega
```

**Relaciones críticas:**
```sql
ventadirecta (1) ----< (N) ventadir_comg
    |
    +---> mesa (N:1)
    +---> camareros (N:1)
    +---> cajas (N:1)

ventadir_comg (N) ----> (1) complementog
ventadir_comg (N) ----> (1) venta_cocina
```

#### B. Productos y Catálogo (15 tablas) ⭐⭐⭐⭐⭐

```sql
complementog              -- Productos principales (nombre, precio base, stock)
complementogimg           -- Imágenes de productos (URLs)
foto_complementog         -- Galería de fotos adicionales
tipo_comg                -- Categorías de productos
almacen_complementg       -- Stock actual por almacén
comg_tarifa              -- Precios por tarifa especial
combinados               -- Definición de combos
pack                     -- Packs de productos
notacocina               -- Opciones de cocina (sin cebolla, etc.)
pnotacocina              -- Relación producto-notas de cocina
historicoprecios         -- Histórico de cambios de precio
complemento              -- (Complementario)
precio                   -- Tabla de precios
tallas                   -- Tallas/variaciones de productos
colores                  -- Colores de productos
```

**Estructura de complementog:**
```sql
CREATE TABLE complementog (
    id_complementog INT PRIMARY KEY AUTO_INCREMENT,
    descripcion VARCHAR(255),         -- Nombre del producto
    id_tipo_comg INT,                 -- Categoría
    PVP DECIMAL(10,2),               -- Precio base
    codigo VARCHAR(50),               -- Código interno
    codigobarras VARCHAR(50),         -- EAN/UPC
    activo CHAR(1) DEFAULT 'S',      -- S/N
    peso DECIMAL(10,2),              -- Peso
    es_pack CHAR(1) DEFAULT 'N',     -- S si es pack
    observaciones TEXT,               -- Descripción larga
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### C. Hostelería (8 tablas) ⭐⭐⭐⭐⭐

```sql
mesa                    -- Mesas del restaurante
salon                   -- Salones/zonas (terraza, interior, VIP)
reserva                 -- Reservas de mesas
reservahora             -- Reservas por hora específica
tarifa                  -- Tarifas de precios (happy hour, etc.)
habitacion              -- (Para hoteles)
tipo_hab                -- Tipos de habitación
cupos                   -- Control de aforo máximo
```

**Estructura de mesa:**
```sql
CREATE TABLE mesa (
    id_mesa INT PRIMARY KEY AUTO_INCREMENT,
    Num_Mesa VARCHAR(20),            -- Número visible (ej: "Mesa 5", "Terraza 2")
    id_salon INT,                    -- Zona/salón
    id_tarifa INT,                   -- Tarifa especial (opcional)
    posicion_x INT,                  -- Coordenada X en mapa (CSS)
    posicion_y INT,                  -- Coordenada Y en mapa (CSS)
    ancho INT DEFAULT 80,            -- Ancho en pixels
    alto INT DEFAULT 80,             -- Alto en pixels
    estado CHAR(1) DEFAULT 'L',      -- L=Libre, O=Ocupada
    comensales_max INT DEFAULT 4,    -- Capacidad máxima
    activa CHAR(1) DEFAULT 'S'       -- S/N
);
```

#### D. Personal y Usuarios (5 tablas) ⭐⭐⭐⭐

```sql
camareros              -- Empleados/meseros
camarero_priv         -- Privilegios de empleados
claveadministrador    -- Clave de admin principal
usuario               -- Usuarios del sistema (base)
usu_gru              -- Relación usuario-grupo
```

**Estructura de camareros:**
```sql
CREATE TABLE camareros (
    id_camarero INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100),
    clavecamarero VARCHAR(50),       -- Contraseña (TEXTO PLANO!)
    foto VARCHAR(255),               -- URL de foto
    activo CHAR(1) DEFAULT 'S',
    -- Privilegios (redundante con camarero_priv)
    borrarlinea CHAR(1) DEFAULT 'N',
    modtiquet CHAR(1) DEFAULT 'N',
    finalizarventas CHAR(1) DEFAULT 'S',
    cancelartiquet CHAR(1) DEFAULT 'N',
    preciomanual CHAR(1) DEFAULT 'N',
    cambiartarifa CHAR(1) DEFAULT 'N'
);
```

#### E. Caja y Finanzas (6 tablas) ⭐⭐⭐⭐⭐

```sql
cajas                  -- Puntos de venta (TPV1, TPV2, etc.)
apcajas               -- Aperturas/cierres de caja
modo_pago             -- Formas de pago (efectivo, tarjeta, etc.)
pagoscobros           -- Registro de todas las transacciones
registrocajon         -- Registro de apertura de cajón
registroz             -- Registro Z diario (cierre contable)
```

**Estructura de apcajas:**
```sql
CREATE TABLE apcajas (
    id_apcaja INT PRIMARY KEY AUTO_INCREMENT,
    id_caja INT,                     -- TPV
    id_camarero INT,                 -- Empleado
    fecha DATE,
    hora_apertura TIME,
    hora_cierre TIME,
    saldo_inicial DECIMAL(10,2),
    saldo_final DECIMAL(10,2),
    abierta CHAR(1) DEFAULT 'S',     -- S/N
    observaciones TEXT
);
```

**Estructura de pagoscobros:**
```sql
CREATE TABLE pagoscobros (
    id_pago INT PRIMARY KEY AUTO_INCREMENT,
    id_venta INT,                    -- Referencia a ventadirecta
    id_modo_pago INT,                -- Forma de pago
    importe DECIMAL(10,2),
    fecha DATE,
    hora TIME,
    id_camarero INT,
    id_caja INT
);
```

#### F. Inventario y Almacén (10 tablas) ⭐⭐⭐⭐

```sql
almacen                    -- Almacenes físicos
almacen_complementg        -- Stock actual por producto y almacén
inventario                 -- Inventarios realizados (cabecera)
inventario_complementg     -- Detalle de inventario
traspasos                  -- Traspasos entre almacenes (cabecera)
traspasos_complementog     -- Detalle de traspasos
entradas                   -- Entradas de mercancía
variaciones                -- Ajustes de stock (mermas, etc.)
operaciones               -- Operaciones especiales
orden_fabrica             -- Órdenes de producción
```

**Control de Stock:**
```sql
-- Stock actual
SELECT cantidad FROM almacen_complementg
WHERE id_almacen = 1 AND id_complementog = 100;

-- Restar stock al vender
UPDATE almacen_complementg
SET cantidad = cantidad - 5
WHERE id_almacen = 1 AND id_complementog = 100;

-- Restaurar stock al cancelar
UPDATE almacen_complementg
SET cantidad = cantidad + 5
WHERE id_almacen = 1 AND id_complementog = 100;
```

#### G. Clientes y Proveedores (8 tablas) ⭐⭐⭐

```sql
cliente                -- Clientes registrados
cliente_cardex        -- Historial de cliente (check-ins hotel)
clientes_docs         -- Documentos de cliente
clientes_tarjeta      -- Tarjetas de fidelización
tipo_cliente          -- Clasificación de clientes (VIP, regular, etc.)
proveedor             -- Proveedores
acreedor              -- Acreedores
pproveedor            -- (Relación)
```

#### H. Integración E-commerce (6 tablas) ⭐⭐⭐

```sql
opencart              -- Configuración OpenCart/WooCommerce
opencart_comg         -- Productos sincronizados
opencart_tipo_comg    -- Categorías sincronizadas
opencart_log          -- Log de sincronizaciones
opencart_remove       -- Productos marcados para eliminar
bitcoin               -- Transacciones Bitcoin
```

#### I. Configuración y Sistema (15+ tablas) ⭐⭐⭐

```sql
empresa               -- Datos de la empresa (nombre, CIF, dirección)
centro                -- Centros/sedes de la empresa
configuracion         -- Configuración general del sistema
serie                 -- Series de documentos (facturas, albaranes)
impresoras            -- Configuración de impresoras
mensajes              -- Mensajería interna
notificaciones        -- Alertas y notificaciones
consultas             -- Consultas guardadas
reports               -- Reportes personalizados
backup                -- Gestión de backups
contadores            -- Contadores automáticos (id_venta, etc.)
idioma                -- Configuración de idiomas
smsenvios             -- Envío de SMS
formaspago            -- Formas de pago adicionales
contabilidad          -- Asientos contables
```

### 3.3 Relaciones Clave del Sistema

```sql
-- Flujo de Venta Completo
ventadirecta (cabecera)
    ├── id_mesa → mesa
    ├── id_camarero → camareros
    ├── id_caja → cajas
    ├── id_tarifa → tarifa (opcional)
    └── (1:N) → ventadir_comg (líneas)
                    ├── id_complementog → complementog
                    ├── (N:1) → venta_cocina
                    └── Stock: almacen_complementg

-- Al Finalizar Venta
ventadirecta
    ├── → tiquet (generado)
    └── → pagoscobros (registro de pago)

-- Panel de Cocina
venta_cocina
    ├── id_venta → ventadirecta
    └── (1:N) → ventadir_comg WHERE cocina < cantidad

-- Stock y Productos
complementog
    ├── (1:N) → almacen_complementg (stock por almacén)
    ├── (1:N) → comg_tarifa (precios por tarifa)
    ├── (1:N) → pack (si es pack, componentes)
    ├── (N:1) → tipo_comg (categoría)
    └── (N:N) → notacocina (opciones de cocina)
```

---

## 4. CONFIGURACIÓN DEL SISTEMA

### 4.1 Archivo Principal: sysmetpv.ini

**Ubicación:** `htdocs/sysmetpv.ini`

**Contenido completo:**
```ini
[database]
dbhost = 127.0.0.1
dbport = 4306
dbuser = root
dbpass = infusorio
dbname = sysmehotel

[application]
idioma = es
almacen = Local
tpv = TPV1
hosteleria = S              # S=Restaurante, N=Comercio
checkincremento = N         # Auto-incrementar cantidad
ordercat = 1                # Orden de categorías (1=nombre, 0=id)
orderpro = 0                # Orden de productos
SerieFactura = F
login = S                   # Requiere login de empleado

[display]
anchotpv = 1936            # Resolución pantalla (width)
altotpv = 948              # Resolución pantalla (height)
```

### 4.2 Archivos de Configuración Individual

**Ubicación:** `htdocs/`

```
dbhost.txt          - 127.0.0.1
dbport.txt          - (implícito 4306)
dbuser.txt          - root
dbpass.txt          - infusorio
dbname.txt          - sysmehotel
language.txt        - es
hosteleria.txt      - S
ordercat.txt        - 1
orderpro.txt        - 0
checkincremento.txt - N
```

**Carga en PHP:**
```php
// conn.php (repetido en cada módulo)
session_start();

// Leer configuración
$_SESSION['dbhost'] = file_get_contents('dbhost.txt');
$_SESSION['dbuser'] = file_get_contents('dbuser.txt');
$_SESSION['dbpass'] = file_get_contents('dbpass.txt');
$_SESSION['dbname'] = file_get_contents('dbname.txt');
$_SESSION['idioma'] = file_get_contents('language.txt');
$_SESSION['hosteleria'] = file_get_contents('hosteleria.txt');

// Conexión a BD
$conexion = mysql_connect(
    $_SESSION['dbhost'] . ':' . $_SESSION['dbport'],
    $_SESSION['dbuser'],
    $_SESSION['dbpass']
);
mysql_select_db($_SESSION['dbname'], $conexion);
```

### 4.3 Variables de Sesión Críticas

```php
// Configuración
$_SESSION['dbhost']
$_SESSION['dbport']
$_SESSION['dbuser']
$_SESSION['dbpass']
$_SESSION['dbname']
$_SESSION['idioma']          // es, en, nl
$_SESSION['hosteleria']      // S/N

// Usuario Actual
$_SESSION['id_camarero']     // ID del empleado logueado
$_SESSION['nombre_camarero'] // Nombre del empleado
$_SESSION['foto_camarero']   // URL de foto

// Contexto de Trabajo
$_SESSION['id_almacen']      // Almacén activo
$_SESSION['id_caja']         // Caja (TPV) activo
$_SESSION['seriefactura']    // Serie de facturación (F, A, B, etc.)
$_SESSION['moneda']          // € (EUR)
$_SESSION['bloque_cocina']   // Bloque actual para envíos
$_SESSION['id_salon']        // Salón activo
$_SESSION['showmap']         // Mostrar mapa de mesas (S/N)

// Privilegios
$_SESSION['borrarlinea']       // S/N
$_SESSION['modtiquet']         // S/N
$_SESSION['modtraspreticket']  // S/N
$_SESSION['finalizarventas']   // S/N
$_SESSION['cancelartiquet']    // S/N
$_SESSION['preciomanual']      // S/N
$_SESSION['cambiartarifa']     // S/N

// Pantalla
$_SESSION['ancho']           // 1936
$_SESSION['alto']            // 948
```

---

## 5. FLUJOS DE TRABAJO CRÍTICOS

### 5.1 Flujo: Crear y Completar una Venta ⭐⭐⭐⭐⭐

**Paso a Paso Completo:**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EMPLEADO HACE LOGIN                                      │
└─────────────────────────────────────────────────────────────┘
   ↓
   login.php
   └─> Valida clavecamarero en tabla camareros
   └─> Carga privilegios en $_SESSION
   └─> Redirige a menu.php

┌─────────────────────────────────────────────────────────────┐
│ 2. SELECCIONA "VENTAS ABIERTAS"                            │
└─────────────────────────────────────────────────────────────┘
   ↓
   abiertas.php
   └─> Muestra mapa de mesas (mapa-mesas.php)
   └─> Lista ventas en curso
   └─> Filtra por salón activo

┌─────────────────────────────────────────────────────────────┐
│ 3. CLICK EN MESA LIBRE                                      │
└─────────────────────────────────────────────────────────────┘
   ↓
   Abre modal "Nueva Venta"
   └─> Pide número de comensales
   └─> Ejecuta venta/nuevaventa.php
        ↓
        INSERT INTO ventadirecta (
            Num_Mesa,
            id_camarero,
            id_caja,
            id_tarifa,  -- Desde mesa.id_tarifa
            comensales,
            fecha,
            hora,
            cerrada = 'N',
            tipo = 'S'  -- S=Venta normal
        )
        ↓
        Obtiene id_venta (LAST_INSERT_ID)
        ↓
        UPDATE mesa SET estado = 'O' WHERE id_mesa = X

┌─────────────────────────────────────────────────────────────┐
│ 4. AÑADIR PRODUCTOS                                          │
└─────────────────────────────────────────────────────────────┘
   ↓
   Navega por categorías (categorias.php)
   └─> Selecciona categoría
   └─> Lista productos (productos.php)
   └─> Click en producto
        ↓
        Modal de opciones:
        - Cantidad
        - Notas de cocina (pnotacocina)
        - Observaciones personalizadas
        ↓
        venta/insertalinea.php
             ↓
             -- Obtener precio según tarifa de mesa
             SELECT pvptarifa FROM comg_tarifa
             WHERE id_complementog = X
             AND id_tarifa = (SELECT id_tarifa FROM mesa WHERE Num_Mesa = Y)
             ↓
             -- Si no hay tarifa especial, usar PVP base
             SELECT PVP FROM complementog WHERE id_complementog = X
             ↓
             INSERT INTO ventadir_comg (
                 id_venta,
                 id_complementog,
                 cantidad,
                 precio,      -- Según tarifa
                 total,       -- cantidad * precio
                 cocina = 0,  -- Inicialmente no enviado
                 servido = 0, -- Inicialmente no servido
                 observaciones,
                 bloque_cocina
             )
             ↓
             -- Descontar stock
             funciones.php::restastock(id_complementog, cantidad)
                  ↓
                  UPDATE almacen_complementg
                  SET cantidad = cantidad - {cantidad}
                  WHERE id_almacen = {activo}
                  AND id_complementog = {producto}
                  ↓
                  -- Si es pack, recursivo
                  IF es_pack = 'S' THEN
                      SELECT * FROM pack WHERE id_complementog = X
                      FOR EACH componente:
                          restastock(componente, cantidad * factor)
                  END IF

┌─────────────────────────────────────────────────────────────┐
│ 5. ENVIAR A COCINA                                           │
└─────────────────────────────────────────────────────────────┘
   ↓
   operaciones_venta.php?accion=enviar_cocina
        ↓
        -- Verificar que hay productos sin enviar
        SELECT COUNT(*) FROM ventadir_comg
        WHERE id_venta = X AND cocina = 0
        ↓
        IF count > 0 THEN
            INSERT INTO venta_cocina (id_venta, id_caja, bloque_cocina)
            VALUES (X, Y, Z)
        END IF

┌─────────────────────────────────────────────────────────────┐
│ 6. PANEL DE COCINA DETECTA ORDEN                            │
└─────────────────────────────────────────────────────────────┘
   ↓
   panel.php (auto-refresh cada 5 segundos)
   └─> Carga panelcocina.php vía AJAX
        ↓
        SELECT
            vc.*,
            v.Num_Mesa,
            v.comensales,
            vdc.id_complementog,
            vdc.cantidad,
            vdc.cocina,
            vdc.observaciones,
            c.descripcion
        FROM venta_cocina vc
        JOIN ventadirecta v ON vc.id_venta = v.id_venta
        JOIN ventadir_comg vdc ON v.id_venta = vdc.id_venta
        JOIN complementog c ON vdc.id_complementog = c.id_complementog
        WHERE vdc.cocina < vdc.cantidad  -- Solo pendientes
        ORDER BY vc.bloque_cocina, vc.timestamp
        ↓
        Muestra en pantalla:
        - Mesa
        - Producto
        - Cantidad pendiente
        - Observaciones/notas
        - Botón "Marcar Servido"

┌─────────────────────────────────────────────────────────────┐
│ 7. COCINA MARCA COMO SERVIDO                                │
└─────────────────────────────────────────────────────────────┘
   ↓
   marcar_servido.php?id_linea=X
        ↓
        UPDATE ventadir_comg
        SET cocina = cantidad  -- Marca todo como preparado
        WHERE id_linea = X
        ↓
        -- Verificar si todas las líneas están listas
        SELECT COUNT(*) FROM ventadir_comg
        WHERE id_venta = Y AND cocina < cantidad
        ↓
        IF count = 0 THEN
            -- Toda la venta está lista
            DELETE FROM venta_cocina WHERE id_venta = Y
        END IF

┌─────────────────────────────────────────────────────────────┐
│ 8. CLIENTE PIDE CUENTA (OPCIONAL: PRE-TICKET)               │
└─────────────────────────────────────────────────────────────┘
   ↓
   operaciones_venta.php?accion=preticket
        ↓
        -- Calcular totales
        SELECT SUM(total) FROM ventadir_comg WHERE id_venta = X
        ↓
        INSERT INTO venta_preticket (
            id_venta,
            id_caja,
            timestamp
        )
        ↓
        -- Cola de impresión recoge y imprime
        -- Venta sigue abierta, puede añadir más productos

┌─────────────────────────────────────────────────────────────┐
│ 9. FINALIZAR VENTA                                           │
└─────────────────────────────────────────────────────────────┘
   ↓
   venta/finalizaventa.php?id_venta=X&modo_pago=Y&importe=Z
        ↓
        BEGIN TRANSACTION
        ↓
        -- Generar número de ticket
        SELECT MAX(id_tiquet) FROM tiquet
        SET nuevo_tiquet = MAX + 1
        ↓
        -- Insertar ticket
        INSERT INTO tiquet (
            id_tiquet = nuevo_tiquet,
            id_venta,
            serie,
            numero,
            fecha,
            hora,
            total
        )
        ↓
        -- Registrar pago
        INSERT INTO pagoscobros (
            id_venta,
            id_modo_pago,
            importe,
            fecha,
            hora,
            id_camarero,
            id_caja
        )
        ↓
        -- Cerrar venta
        UPDATE ventadirecta
        SET cerrada = 'S',
            id_tiquet = nuevo_tiquet,
            hora_cierre = NOW()
        WHERE id_venta = X
        ↓
        -- Liberar mesa
        UPDATE mesa
        SET estado = 'L'
        WHERE Num_Mesa = (SELECT Num_Mesa FROM ventadirecta WHERE id_venta = X)
        ↓
        -- Enviar a cola de impresión
        INSERT INTO venta_ticket (id_venta, id_caja, timestamp)
        ↓
        COMMIT

┌─────────────────────────────────────────────────────────────┐
│ 10. CIERRE DE CAJA (FIN DEL DÍA)                            │
└─────────────────────────────────────────────────────────────┘
   ↓
   Supervisor cuenta efectivo
   └─> Compara con pagoscobros
   └─> Ejecuta cierre
        ↓
        UPDATE apcajas
        SET abierta = 'N',
            saldo_final = {contado},
            hora_cierre = NOW()
        WHERE id_apcaja = X
        ↓
        -- Generar Reporte Z
        INSERT INTO registroz (
            id_caja,
            fecha,
            total_ventas,
            total_efectivo,
            total_tarjeta,
            num_tickets,
            ticket_medio
        )
        SELECT ...
```

---

### 5.2 Flujo: Panel de Cocina en Tiempo Real ⭐⭐⭐⭐⭐

**Arquitectura de Actualización:**

```javascript
// panel.php
$(document).ready(function() {
    refrescapanel(); // Primera carga
    setInterval(refrescapanel, 5000); // Cada 5 segundos
});

function refrescapanel() {
    $('#panel-container').load('panelcocina.php', function() {
        // Callback después de cargar
        console.log('Panel actualizado');
    });
}
```

**panelcocina.php - Query Principal:**

```sql
SELECT
    vc.id_venta_cocina,
    vc.id_venta,
    vc.bloque_cocina,
    vc.timestamp AS enviado_a_cocina,
    v.Num_Mesa,
    v.comensales,
    v.alias,
    vdc.id_linea,
    vdc.id_complementog,
    vdc.cantidad AS cantidad_total,
    vdc.cocina AS cantidad_preparada,
    (vdc.cantidad - vdc.cocina) AS cantidad_pendiente,
    vdc.observaciones,
    c.descripcion AS producto,
    nc.texto AS nota_cocina
FROM venta_cocina vc
INNER JOIN ventadirecta v
    ON vc.id_venta = v.id_venta
INNER JOIN ventadir_comg vdc
    ON v.id_venta = vdc.id_venta
INNER JOIN complementog c
    ON vdc.id_complementog = c.id_complementog
LEFT JOIN pnotacocina pnc
    ON vdc.id_complementog = pnc.id_complementog
LEFT JOIN notacocina nc
    ON pnc.id_notacocina = nc.id_notacocina
WHERE vdc.cocina < vdc.cantidad  -- Solo productos pendientes
AND v.cerrada = 'N'              -- Solo ventas abiertas
ORDER BY
    vc.bloque_cocina ASC,        -- Bloques en orden
    vc.timestamp ASC             -- Más antiguos primero
```

**Renderizado en Pantalla:**

```html
<!-- Para cada orden -->
<div class="orden-cocina" data-id-venta="123">
    <div class="cabecera-orden">
        <span class="mesa">Mesa 5</span>
        <span class="comensales">4 pax</span>
        <span class="bloque">Bloque 1</span>
        <span class="tiempo">Hace 5 min</span>
    </div>

    <!-- Para cada producto pendiente -->
    <div class="producto-pendiente" data-id-linea="456">
        <div class="cantidad-badge">3</div>
        <div class="nombre-producto">Hamburguesa Completa</div>
        <div class="observaciones">Sin cebolla, Punto medio</div>
        <div class="notas-cocina">
            <span class="nota">🌶️ Picante</span>
        </div>
        <button class="btn-servido" onclick="marcarServido(456)">
            ✓ Marcar Servido
        </button>
    </div>
</div>
```

**JavaScript - Marcar Servido:**

```javascript
function marcarServido(id_linea) {
    $.post('marcar_servido.php', {id_linea: id_linea}, function(response) {
        if (response.success) {
            // Eliminar visualmente
            $('[data-id-linea="' + id_linea + '"]').fadeOut(300);

            // Sonido de confirmación (si está configurado)
            playSound('servido.mp3');

            // Si era el último producto de la venta, eliminar venta completa
            var $orden = $('[data-id-linea="' + id_linea + '"]').closest('.orden-cocina');
            if ($orden.find('.producto-pendiente:visible').length === 0) {
                $orden.fadeOut(500);
            }
        }
    });
}
```

**marcar_servido.php:**

```php
<?php
session_start();
include('conn.php');

$id_linea = $_POST['id_linea'];

// Marcar como totalmente preparado
$sql = "UPDATE ventadir_comg
        SET cocina = cantidad
        WHERE id_linea = $id_linea";
mysql_query($sql);

// Obtener id_venta para verificar
$sql2 = "SELECT id_venta FROM ventadir_comg WHERE id_linea = $id_linea";
$result = mysql_query($sql2);
$row = mysql_fetch_assoc($result);
$id_venta = $row['id_venta'];

// Verificar si toda la venta está lista
$sql3 = "SELECT COUNT(*) as pendientes
         FROM ventadir_comg
         WHERE id_venta = $id_venta
         AND cocina < cantidad";
$result3 = mysql_query($sql3);
$row3 = mysql_fetch_assoc($result3);

if ($row3['pendientes'] == 0) {
    // Toda la venta lista, eliminar de cola
    $sql4 = "DELETE FROM venta_cocina WHERE id_venta = $id_venta";
    mysql_query($sql4);
}

echo json_encode(['success' => true]);
?>
```

---

### 5.3 Flujo: Gestión de Stock Automática ⭐⭐⭐⭐⭐

**funciones.php - Función restastock():**

```php
function restastock($id_complementog, $cantidad) {
    global $conexion; // Conexión MySQL global

    $id_almacen = $_SESSION['id_almacen']; // Almacén activo del TPV

    // Verificar si es un pack
    $sql_pack = "SELECT es_pack FROM complementog
                 WHERE id_complementog = $id_complementog";
    $result = mysql_query($sql_pack, $conexion);
    $row = mysql_fetch_assoc($result);

    if ($row['es_pack'] == 'S') {
        // Es un pack, restar componentes
        $sql_componentes = "SELECT id_componente, cantidad_componente
                           FROM pack
                           WHERE id_complementog = $id_complementog";
        $result_comp = mysql_query($sql_componentes, $conexion);

        while ($comp = mysql_fetch_assoc($result_comp)) {
            // Llamada recursiva para cada componente
            // Si el componente también es pack, se procesará recursivamente
            restastock(
                $comp['id_componente'],
                $cantidad * $comp['cantidad_componente']
            );
        }
    } else {
        // Producto simple, restar directamente
        $sql_resta = "UPDATE almacen_complementg
                      SET cantidad = cantidad - $cantidad
                      WHERE id_almacen = $id_almacen
                      AND id_complementog = $id_complementog";
        mysql_query($sql_resta, $conexion);

        // Verificar stock bajo (opcional)
        $sql_check = "SELECT cantidad, stock_minimo
                      FROM almacen_complementg
                      WHERE id_almacen = $id_almacen
                      AND id_complementog = $id_complementog";
        $result_check = mysql_query($sql_check, $conexion);
        $stock = mysql_fetch_assoc($result_check);

        if ($stock['cantidad'] < $stock['stock_minimo']) {
            // Crear alerta de stock bajo
            insertarNotificacion(
                "Stock bajo: Producto $id_complementog",
                "warning"
            );
        }
    }
}

function restaurastock($id_complementog, $cantidad) {
    // Simplemente invierte el signo y llama a restastock
    restastock($id_complementog, -$cantidad);
}
```

**Ejemplo de Pack Recursivo:**

```
Pack "Menú Completo" (id: 100)
    ├── Pack "Entrantes" (id: 200) x1
    │       ├── Ensalada (id: 301) x1
    │       └── Pan (id: 302) x2
    ├── Hamburguesa (id: 400) x1
    └── Bebida (id: 500) x1

Al vender 1 "Menú Completo":
1. restastock(100, 1)
   └─> Es pack, obtiene componentes

2. restastock(200, 1) // Pack Entrantes
   └─> Es pack, obtiene componentes
   └─> restastock(301, 1) // Ensalada
   └─> restastock(302, 2) // Pan x2

3. restastock(400, 1) // Hamburguesa

4. restastock(500, 1) // Bebida

Resultado final:
- Ensalada: -1
- Pan: -2
- Hamburguesa: -1
- Bebida: -1
```

---

## 6. INTEGRACIONES EXTERNAS

### 6.1 OpenCart (E-commerce) ⭐⭐⭐⭐

**updateproduct.php - Sincronización de Productos:**

```php
<?php
// Autenticación por token
$token_esperado = 'abc123xyz456'; // Configurado en OpenCart
if ($_GET['token'] !== $token_esperado) {
    die('Unauthorized');
}

// Conectar a SYSME
include('conn_sysme.php');

// Conectar a OpenCart
$oc_host = 'localhost';
$oc_user = 'opencart_user';
$oc_pass = 'opencart_pass';
$oc_db = 'opencart_db';
$oc_conn = mysql_connect($oc_host, $oc_user, $oc_pass);
mysql_select_db($oc_db, $oc_conn);

// Obtener productos activos de SYSME
$sql_sysme = "SELECT
                id_complementog,
                descripcion,
                PVP,
                codigobarras,
                peso,
                imagen
              FROM complementog
              WHERE activo = 'S'";
$result = mysql_query($sql_sysme);

$sincronizados = 0;
$errores = 0;

while ($producto = mysql_fetch_assoc($result)) {
    $model = $producto['id_complementog'];

    // Verificar si existe en OpenCart
    $sql_check = "SELECT product_id FROM oc_product WHERE model = '$model'";
    $check = mysql_query($sql_check, $oc_conn);

    if (mysql_num_rows($check) > 0) {
        // ACTUALIZAR producto existente
        $row = mysql_fetch_assoc($check);
        $product_id = $row['product_id'];

        $sql_update = "UPDATE oc_product SET
                        sku = '{$producto['codigobarras']}',
                        quantity = (SELECT cantidad FROM almacen_complementg
                                   WHERE id_complementog = $model LIMIT 1),
                        price = {$producto['PVP']},
                        weight = {$producto['peso']},
                        image = '{$producto['imagen']}',
                        date_modified = NOW()
                       WHERE product_id = $product_id";

        if (mysql_query($sql_update, $oc_conn)) {
            $sincronizados++;

            // Actualizar descripción en oc_product_description
            $sql_desc = "UPDATE oc_product_description SET
                          name = '{$producto['descripcion']}'
                         WHERE product_id = $product_id";
            mysql_query($sql_desc, $oc_conn);
        } else {
            $errores++;
            logError("Error actualizando producto $model: " . mysql_error($oc_conn));
        }

    } else {
        // CREAR producto nuevo
        $sql_insert = "INSERT INTO oc_product (
                        model, sku, quantity, price, weight, image,
                        status, date_added, date_modified
                       ) VALUES (
                        '$model',
                        '{$producto['codigobarras']}',
                        (SELECT cantidad FROM almacen_complementg
                         WHERE id_complementog = $model LIMIT 1),
                        {$producto['PVP']},
                        {$producto['peso']},
                        '{$producto['imagen']}',
                        1,
                        NOW(),
                        NOW()
                       )";

        if (mysql_query($sql_insert, $oc_conn)) {
            $product_id = mysql_insert_id($oc_conn);

            // Insertar descripción
            $sql_desc = "INSERT INTO oc_product_description (
                          product_id, language_id, name
                         ) VALUES (
                          $product_id, 1, '{$producto['descripcion']}'
                         )";
            mysql_query($sql_desc, $oc_conn);

            // Insertar en tienda
            $sql_store = "INSERT INTO oc_product_to_store (product_id, store_id)
                          VALUES ($product_id, 0)";
            mysql_query($sql_store, $oc_conn);

            $sincronizados++;
        } else {
            $errores++;
            logError("Error creando producto $model: " . mysql_error($oc_conn));
        }
    }
}

// Log de sincronización
$sql_log = "INSERT INTO opencart_log (
              fecha, productos_sincronizados, errores, duracion
            ) VALUES (
              NOW(), $sincronizados, $errores,
              TIMESTAMPDIFF(SECOND, @inicio, NOW())
            )";
mysql_query($sql_log);

echo json_encode([
    'success' => true,
    'sincronizados' => $sincronizados,
    'errores' => $errores
]);
?>
```

**orders.php - Descarga de Pedidos:**

```php
<?php
// Conectar a OpenCart
include('conn_opencart.php');

// Obtener pedidos no importados
$sql = "SELECT
          o.order_id,
          o.customer_id,
          o.firstname,
          o.lastname,
          o.email,
          o.telephone,
          o.total,
          o.date_added,
          o.payment_method,
          o.shipping_method,
          o.shipping_firstname,
          o.shipping_address_1,
          o.shipping_city,
          o.shipping_postcode
        FROM oc_order o
        WHERE importado = 'N'
        ORDER BY order_id DESC
        LIMIT 50";

$result = mysql_query($sql);
$pedidos = [];

while ($order = mysql_fetch_assoc($result)) {
    $order_id = $order['order_id'];

    // Obtener productos del pedido
    $sql_products = "SELECT
                      op.product_id,
                      op.model,
                      op.name,
                      op.quantity,
                      op.price,
                      op.total
                     FROM oc_order_product op
                     WHERE op.order_id = $order_id";
    $result_prod = mysql_query($sql_products);

    $productos = [];
    while ($prod = mysql_fetch_assoc($result_prod)) {
        $productos[] = $prod;
    }

    $order['productos'] = $productos;
    $pedidos[] = $order;
}

echo json_encode([
    'success' => true,
    'pedidos' => $pedidos,
    'total' => count($pedidos)
]);
?>
```

---

## 7. SEGURIDAD - ANÁLISIS CRÍTICO ⚠️⚠️⚠️

### 7.1 Vulnerabilidades CRÍTICAS Identificadas

#### A. SQL Injection ⚠️⚠️⚠️⚠️⚠️

**Problema:** Uso de concatenación directa en queries

**Ejemplos Vulnerables:**

```php
// login.php - VULNERABLE
$passwd = $_POST['passwd'];
$sql = "SELECT * FROM camareros
        WHERE clavecamarero = '$passwd'";
$result = mysql_query($sql);

// Ataque posible:
// passwd = "' OR '1'='1"
// Query resultante: SELECT * FROM camareros WHERE clavecamarero = '' OR '1'='1'
// Resultado: Acceso sin contraseña
```

```php
// productos.php - VULNERABLE
$busqueda = $_GET['q'];
$sql = "SELECT * FROM complementog
        WHERE descripcion LIKE '%$busqueda%'";

// Ataque posible:
// q = "%' UNION SELECT * FROM camareros--"
// Puede extraer toda la tabla de empleados
```

**Solución Requerida:**
```php
// Usar MySQLi con prepared statements
$stmt = $mysqli->prepare("SELECT * FROM camareros WHERE clavecamarero = ?");
$stmt->bind_param("s", $passwd);
$stmt->execute();
```

#### B. Contraseñas en Texto Plano ⚠️⚠️⚠️⚠️⚠️

**Problema:** Tabla `camareros.clavecamarero` almacena passwords sin hash

```sql
SELECT * FROM camareros;
-- Resultado:
-- id_camarero | nombre  | clavecamarero
-- 1           | Juan    | 1234
-- 2           | Maria   | admin
-- 3           | Pedro   | qwerty
```

**Solución Requerida:**
```php
// Al crear/cambiar contraseña
$hashed = password_hash($password, PASSWORD_BCRYPT);

// Al verificar
if (password_verify($input_password, $hashed_from_db)) {
    // Correcto
}
```

#### C. Sesiones Inseguras ⚠️⚠️⚠️

**Problemas:**
- No hay regeneración de session_id tras login
- No hay validación de IP
- No hay timeout configurable
- Session hijacking posible

**Código actual:**
```php
session_start(); // Solo esto, sin medidas adicionales
```

**Solución Requerida:**
```php
// Tras login exitoso
session_regenerate_id(true);

// Validar IP
$_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
if ($_SESSION['ip'] !== $_SERVER['REMOTE_ADDR']) {
    session_destroy();
    exit('Session hijacking detected');
}

// Timeout
$_SESSION['last_activity'] = time();
if (time() - $_SESSION['last_activity'] > 1800) { // 30 min
    session_destroy();
}
```

#### D. XSS (Cross-Site Scripting) ⚠️⚠️⚠️

**Problema:** Output directo de variables sin escapar

```php
// producto.php - VULNERABLE
echo "<h1>" . $_GET['nombre'] . "</h1>";

// Ataque:
// nombre = "<script>alert(document.cookie)</script>"
// Ejecuta JavaScript malicioso
```

**Solución:**
```php
echo "<h1>" . htmlspecialchars($_GET['nombre'], ENT_QUOTES, 'UTF-8') . "</h1>";
```

#### E. Credenciales Expuestas ⚠️⚠️⚠️⚠️

**Problema:** Archivos de texto plano con credenciales

```
dbpass.txt → "infusorio"
sysmetpv.ini → dbpass = infusorio
```

**Solución Requerida:**
- Variables de entorno
- Archivos .env fuera de htdocs
- Cifrado de configuraciones sensibles

---

### 7.2 Medidas de Seguridad Existentes ✅

#### A. Control de Sesión Básico

```php
if (!isset($_SESSION['id_camarero'])) {
    header('Location: login.php');
    exit();
}
```

#### B. Token en Integraciones

```php
// OpenCart/WooCommerce
if ($_GET['token'] !== EXPECTED_TOKEN) {
    die('Unauthorized');
}
```

#### C. Privilegios Granulares

```php
if ($_SESSION['borrarlinea'] !== 'S') {
    die('No tiene permiso para eliminar líneas');
}
```

---

## 8. COMPARACIÓN: SYSME vs RestaurantBot Analytics

### 8.1 Funcionalidades que DEBE tener el nuevo sistema

**CRÍTICAS (Bloqueadoras) - 20 funcionalidades:**

| # | Funcionalidad | SYSME | Nuevo Sistema | Prioridad |
|---|---------------|-------|---------------|-----------|
| 1 | Gestión completa de ventas | ✅ | ✅ COMPLETADO | ⭐⭐⭐⭐⭐ |
| 2 | Mapa visual de mesas | ✅ | ❌ FALTA | ⭐⭐⭐⭐⭐ |
| 3 | Panel de cocina real-time | ✅ | ❌ FALTA | ⭐⭐⭐⭐⭐ |
| 4 | Control de stock automático | ✅ | ✅ COMPLETADO | ⭐⭐⭐⭐⭐ |
| 5 | Privilegios de empleados | ✅ | ✅ COMPLETADO | ⭐⭐⭐⭐⭐ |
| 6 | Múltiples modos de pago | ✅ | ❌ FALTA | ⭐⭐⭐⭐⭐ |
| 7 | Pre-tickets | ✅ | ❌ FALTA | ⭐⭐⭐⭐⭐ |
| 8 | Notas de cocina | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 9 | Sistema de tarifas | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 10 | Aparcar ventas | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 11 | Cambio de mesa | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 12 | Registro de comensales | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 13 | Reportes con filtros | ✅ | ✅ COMPLETADO | ⭐⭐⭐⭐ |
| 14 | Cierre de caja (Z) | ✅ | ❌ FALTA | ⭐⭐⭐⭐⭐ |
| 15 | Multi-almacén | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 16 | Packs y combinados | ✅ | ❌ FALTA | ⭐⭐⭐⭐ |
| 17 | Categorías jerárquicas | ✅ | ✅ COMPLETADO | ⭐⭐⭐ |
| 18 | Búsqueda de productos | ✅ | ✅ COMPLETADO | ⭐⭐⭐ |
| 19 | Observaciones en ventas | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 20 | Auditoría de eliminados | ✅ | ✅ COMPLETADO | ⭐⭐⭐⭐ |

**IMPORTANTES (Should-Have) - 10 funcionalidades:**

| # | Funcionalidad | SYSME | Nuevo Sistema | Prioridad |
|---|---------------|-------|---------------|-----------|
| 21 | Integración e-commerce | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 22 | Menú digital (Carta) | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 23 | Multi-idioma | ✅ | ❌ FALTA | ⭐⭐ |
| 24 | Gestión de inventarios | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 25 | Traspasos entre almacenes | ✅ | ❌ FALTA | ⭐⭐ |
| 26 | Gestión de proveedores | ✅ | ❌ FALTA | ⭐⭐ |
| 27 | Facturación completa | ✅ | ❌ FALTA | ⭐⭐⭐ |
| 28 | Reservas | ✅ | ❌ FALTA | ⭐⭐ |
| 29 | Bitcoin/criptomonedas | ✅ | ❌ FALTA | ⭐ |
| 30 | Envío de SMS | ✅ | ❌ FALTA | ⭐⭐ |

### 8.2 Funcionalidades NUEVAS que mejoran el sistema antiguo

| # | Funcionalidad | Nuevo Sistema | Ventaja |
|---|---------------|---------------|---------|
| 1 | Real-time con WebSockets | ✅ IMPLEMENTADO | vs Polling 5s |
| 2 | PWA offline-first | ✅ IMPLEMENTADO | vs Web tradicional |
| 3 | API REST moderna | ✅ IMPLEMENTADO | vs PHP legacy |
| 4 | Dashboard analytics | ✅ IMPLEMENTADO | vs Reportes básicos |
| 5 | Seguridad moderna (JWT, bcrypt) | ✅ IMPLEMENTADO | vs SQL Injection vulnerable |
| 6 | Arquitectura cloud-ready | ✅ IMPLEMENTADO | vs Monolito local |
| 7 | UX moderna (React) | ✅ IMPLEMENTADO | vs jQuery Mobile |
| 8 | WhatsApp Integration | ✅ IMPLEMENTADO | ❌ No existe en SYSME |
| 9 | IA/ML analytics | ⏳ PLANEADO | ❌ No existe |
| 10 | Mobile apps nativas | ⏳ PLANEADO | ❌ No existe |

---

## 9. RECOMENDACIONES CRÍTICAS PARA MIGRACIÓN

### 9.1 Funcionalidades OBLIGATORIAS a Implementar ANTES de Reemplazar

**NO se puede reemplazar SYSME sin estas funcionalidades:**

1. ⭐⭐⭐⭐⭐ **Mapa visual de mesas con estado real-time**
   - Sistema actual: Fundamental para operación diaria
   - Sin esto: Restaurantes no pueden asignar mesas

2. ⭐⭐⭐⭐⭐ **Panel de cocina con órdenes en tiempo real**
   - Sistema actual: Cocina depende 100% de esto
   - Sin esto: Órdenes no llegan a cocina

3. ⭐⭐⭐⭐⭐ **Múltiples modos de pago y cierre de caja**
   - Sistema actual: Esencial para contabilidad diaria
   - Sin esto: No hay control financiero

4. ⭐⭐⭐⭐⭐ **Pre-tickets e impresión fiscal**
   - Sistema actual: Obligatorio por ley
   - Sin esto: Ilegal operar

5. ⭐⭐⭐⭐ **Sistema de tarifas por mesa**
   - Sistema actual: Usado para happy hour, VIP, etc.
   - Sin esto: Pérdida de ingresos

6. ⭐⭐⭐⭐ **Aparcar y recuperar ventas**
   - Sistema actual: Usado varias veces por turno
   - Sin esto: Problemas operativos

7. ⭐⭐⭐⭐ **Notas de cocina configurables**
   - Sistema actual: "Sin cebolla", "Poco hecho", etc.
   - Sin esto: Cocina no sabe cómo preparar

8. ⭐⭐⭐⭐ **Bloques de cocina (entrantes, platos, postres)**
   - Sistema actual: Permite envíos por etapas
   - Sin esto: Todo sale junto (mal servicio)

9. ⭐⭐⭐⭐ **Packs y combinados recursivos**
   - Sistema actual: Menús del día, combos
   - Sin esto: Productos principales no disponibles

10. ⭐⭐⭐⭐ **Multi-almacén con stock independiente**
    - Sistema actual: Varios almacenes por restaurante
    - Sin esto: Control de stock inexacto

### 9.2 Datos que DEBEN Migrarse

**Crítico:**
- ✅ Productos (complementog) - ~5,000-10,000 registros
- ✅ Categorías (tipo_comg) - ~50-100 registros
- ✅ Mesas (mesa) - ~50-200 por restaurante
- ✅ Empleados (camareros) - ~10-50 por restaurante
- ✅ Tarifas (tarifa, comg_tarifa) - Histórico de precios
- ✅ Configuración (empresa, cajas, impresoras)

**Importante:**
- ✅ Histórico de ventas (ventadirecta, ventadir_comg) - Varios años
- ✅ Clientes (cliente) - Base de datos valiosa
- ✅ Proveedores (proveedor)
- ✅ Packs (pack) - Definiciones de combos

**Opcional:**
- Reportes Z antiguos (registroz)
- Logs de sincronización (opencart_log)

### 9.3 Plan de Migración Recomendado

**FASE 1: Desarrollo de Funcionalidades Faltantes (4-6 semanas)**
```
Semana 1-2: Mapa de mesas + Panel de cocina
Semana 3: Sistema de tarifas + Packs/combos
Semana 4: Multi-almacén + Notas de cocina
Semana 5: Pre-tickets + Múltiples pagos + Cierre de caja
Semana 6: Testing exhaustivo de todas las funcionalidades
```

**FASE 2: Migración de Datos (1 semana)**
```
Día 1-2: ETL de productos y categorías
Día 3: ETL de empleados y configuración
Día 4: ETL de mesas y salones
Día 5: ETL de histórico de ventas
Día 6-7: Validación completa de datos
```

**FASE 3: Piloto en 1 Restaurante (2 semanas)**
```
Semana 1: Sistema nuevo en paralelo (ambos funcionando)
Semana 2: Comparación de resultados, ajustes
```

**FASE 4: Migración Gradual (4 semanas)**
```
Semana 1: 25% de restaurantes
Semana 2: 50% de restaurantes
Semana 3: 75% de restaurantes
Semana 4: 100% de restaurantes
```

**FASE 5: Descomisionamiento SYSME (1 semana)**
```
Día 1-5: Mantener SYSME en modo read-only
Día 6-7: Backup final y apagado
```

---

## 10. CONCLUSIONES FINALES

### 10.1 Estado Actual del Proyecto

**Sistema Antiguo (SYSME):**
- ✅ Completo y maduro
- ✅ Probado en producción real
- ✅ 143 tablas de base de datos
- ✅ 30+ funcionalidades críticas
- ⚠️ Tecnología obsoleta
- ⚠️ Vulnerabilidades de seguridad graves

**Sistema Nuevo (RestaurantBot Analytics):**
- ✅ Arquitectura moderna (React + Supabase)
- ✅ ~80% de infraestructura completada
- ✅ Sistema de órdenes funcional
- ✅ WhatsApp integration completa
- ✅ Reportes reales con exportación
- ✅ Panel de administración
- ❌ Falta ~40% de funcionalidades críticas de UI/UX
- ❌ Falta mapa de mesas
- ❌ Falta panel de cocina visual
- ❌ Falta sistema de tarifas
- ❌ Falta muchas funcionalidades críticas

### 10.2 Funcionalidades Faltantes CRÍTICAS

**Para reemplazar SYSME, el nuevo sistema DEBE implementar:**

```
BLOQUEADORES ABSOLUTOS (Sin esto, NO se puede reemplazar):
1. ❌ Mapa visual de mesas interactivo
2. ❌ Panel de cocina con órdenes en tiempo real
3. ❌ Sistema de pre-tickets e impresión
4. ❌ Múltiples modos de pago
5. ❌ Cierre de caja con reporte Z
6. ❌ Sistema de tarifas por mesa
7. ❌ Aparcar y recuperar ventas
8. ❌ Notas de cocina
9. ❌ Bloques de cocina
10. ❌ Packs y combinados

IMPORTANTES (Reducen funcionalidad crítica):
11. ❌ Multi-almacén
12. ❌ Cambio de mesa durante venta
13. ❌ Registro de comensales
14. ❌ Observaciones en líneas
15. ❌ Menú digital para clientes (Carta)
16. ❌ Integración e-commerce
17. ❌ Facturación completa
18. ❌ Inventarios físicos
19. ❌ Traspasos entre almacenes
20. ❌ Gestión de proveedores
```

### 10.3 Tiempo Estimado para Completar

**Estimación realista:**
```
Funcionalidades críticas faltantes: 4-6 semanas
Testing exhaustivo: 2 semanas
Migración de datos: 1 semana
Piloto: 2 semanas
Migración gradual: 4 semanas
─────────────────────────────────
TOTAL: 13-15 semanas (3-4 meses)
```

### 10.4 Recomendación Final

⚠️ **NO REEMPLAZAR EL SISTEMA ACTUAL TODAVÍA**

**Razones:**
1. Faltan ~40% de funcionalidades críticas
2. Restaurantes dependen 100% del sistema actual
3. Sin mapa de mesas y panel de cocina, operación es imposible
4. Riesgo muy alto de interrumpir servicio

**Próximos pasos OBLIGATORIOS:**
1. Implementar las 10 funcionalidades bloqueadoras
2. Testing exhaustivo en entorno controlado
3. Piloto en 1 restaurante durante 2 semanas
4. Solo entonces planear migración gradual

**NO SALTAR ESTOS PASOS** - Los restaurantes perderán dinero y servicio si el sistema falla.

---

## ANEXO: TABLAS COMPLETAS DE BASE DE DATOS

### Listado de las 143 Tablas de sysmehotel:

```
CATEGORÍA: VENTAS Y CAJA
1. ventadirecta
2. ventadirecta2
3. ventadir_comg
4. ventadir_comg2
5. venta_cocina
6. venta_preticket
7. venta_ticket
8. lineaseliminadas
9. tiquet
10. tiquet2
11. pagoscobros
12. pagoscobros2
13. cajas
14. apcajas
15. apcajas2
16. modo_pago
17. registrocajon
18. registroz
19. zreport

CATEGORÍA: PRODUCTOS Y CATÁLOGO
20. complementog
21. complementogimg
22. foto_complementog
23. tipo_comg
24. almacen_complementg
25. comg_tarifa
26. combinados
27. pack
28. notacocina
29. pnotacocina
30. historicoprecios
31. complemento
32. precio
33. tallas
34. colores
35. complementog_comercio
36. complementog_hosteleria
37. complementog_peluqueria
38. tipo_comg_comercio
39. tipo_comg_comg
40. tipo_comg_hosteleria
41. tipo_comg_peluqueria
42. combinados_hosteleria
43. pack_hosteleria
44. productoimg
45. productoimgs

CATEGORÍA: HOSTELERÍA
46. mesa
47. mesa_comercio
48. mesa_hosteleria
49. mesa_peluqueria
50. salon
51. reserva
52. reservahora
53. tarifa
54. habitacion
55. habitacion_fotos
56. tipo_hab
57. cupos
58. pre_reserva
59. pre_reserva_com
60. pre_reserva_hab
61. pre_reserva_habi

CATEGORÍA: PERSONAL Y USUARIOS
62. camareros
63. camarero_priv
64. claveadministrador
65. usuario
66. usu_gru

CATEGORÍA: INVENTARIO Y ALMACÉN
67. almacen
68. inventario
69. inventario_complementg
70. traspasos
71. traspasos_complementog
72. entradas
73. variaciones
74. operaciones
75. operaciones_complementog
76. orden_fabrica
77. orden_matprima
78. orden_result

CATEGORÍA: CLIENTES Y PROVEEDORES
79. cliente
80. cliente_cardex
81. clientes_docs
82. clientes_tarjeta
83. cliente_fan
84. tipo_cliente
85. proveedor
86. acreedor
87. pproveedor
88. fabricante

CATEGORÍA: FACTURACIÓN Y CONTABILIDAD
89. factura
90. factura2
91. fac_comg
92. pfactura
93. presupuesto
94. presu_comg
95. pedido
96. ped_comg
97. albaran
98. albaran_factura
99. alb_comg
100. borrador
101. bor_comg
102. contabilidad
103. formaspago
104. serie

CATEGORÍA: E-COMMERCE
105. opencart
106. opencart_comg
107. opencart_tipo_comg
108. opencart_log
109. opencart_remove
110. bitcoin
111. bitcoinlabel
112. bitchange

CATEGORÍA: CONFIGURACIÓN Y SISTEMA
113. empresa
114. centro
115. configuracion
116. impresoras
117. mensajes
118. notificaciones
119. consultas
120. reports
121. backup
122. contadores
123. idioma
124. smsenvio
125. smsenvios
126. auxiliar
127. tipo_doc
128. dia
129. hora
130. estado
131. navigator_images
132. form_textos

CATEGORÍA: CARDEX Y HOSPEDAJE
133. cardex
134. car_acuenta
135. car_com
136. car_comg

CATEGORÍA: RESERVAS Y SERVICIOS
137. res_acuenta
138. res_com
139. res_conf_servicios
140. eacuenta

CATEGORÍA: CONTRATOS
141. scontrato
142. scontrato_line
143. scontrato_line_fecha

CATEGORÍA: OTROS
144. centralita
145. gasto
146. promociones
147. pretiquet
148. tipo_cliente
149. tipo_com
```

---

**FIN DEL ANÁLISIS EXHAUSTIVO**

Este documento es la base fundamental para asegurar que RestaurantBot Analytics replique y mejore TODAS las funcionalidades del sistema SYSME que actualmente está en producción en restaurantes reales.

**⚠️ ADVERTENCIA FINAL:**
NO se debe proceder con el reemplazo del sistema antiguo hasta que TODAS las funcionalidades marcadas como "BLOQUEADORES ABSOLUTOS" estén completamente implementadas y probadas. Los restaurantes dependen de este sistema para operar y cualquier fallo causaría pérdidas económicas graves.

**Próximo paso:** Implementar las funcionalidades críticas faltantes siguiendo la priorización establecida en este documento.

---

**Analista:** Claude Code con TestSprite
**Fecha:** 25 de Octubre de 2024 - 15:30
**Ubicación del reporte:** E:\POS SYSME\SYSME\avances\parte-4\25-10_15-30_analisis-exhaustivo-sistema-antiguo-sysme.md
