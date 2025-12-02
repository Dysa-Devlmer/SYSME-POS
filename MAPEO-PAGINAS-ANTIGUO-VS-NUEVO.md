# 🗺️ MAPEO COMPLETO: PÁGINAS ANTIGUAS vs NUEVAS

**Sistema de Referencia:** Comparación exacta de archivos
**Fecha:** 2 de Diciembre de 2024

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Cantidad |
|---------|----------|
| **Páginas Sistema Antiguo** | 43 archivos PHP |
| **Componentes Sistema Nuevo** | ~25 componentes |
| **Páginas Equivalentes** | 15 ✅ |
| **Páginas Faltantes** | 28 ❌ |
| **Cobertura Funcional** | ~35% |

---

## 🔴 MAPEO DETALLADO: ANTIGUO → NUEVO

### ✅ IMPLEMENTADAS (15/43)

| Sistema Antiguo (PHP) | Sistema Nuevo (React) | Estado | Notas |
|----------------------|----------------------|--------|-------|
| `login.php` | `src/pages/Login.jsx` | ✅ COMPLETO | Mejorado con JWT |
| `menu.php` | `src/components/layout/Sidebar.jsx` | ✅ COMPLETO | Navegación moderna |
| `venta.php` | `src/components/pos/POSTerminal.jsx` | ✅ COMPLETO | POS principal |
| `productos.php` | `src/components/pos/ProductGrid.jsx` | ✅ COMPLETO | Grid de productos |
| `categorias.php` | `src/components/pos/CategoryFilter.jsx` | ✅ COMPLETO | Filtro categorías |
| `mapa-mesas.php` | `src/components/pos/TableMap.jsx` | ✅ PARCIAL | Falta fusionar mesas |
| `panelcocina.php` | `src/components/KitchenDisplay.jsx` | ✅ COMPLETO | Panel cocina mejorado |
| `finaliza_venta.php` | `src/components/pos/CheckoutModal.jsx` | ✅ COMPLETO | Checkout mejorado |
| `insertalinea.php` | Lógica en `POSTerminal.jsx` | ✅ COMPLETO | Añadir producto |
| `updatelinea.php` | Lógica en `POSTerminal.jsx` | ✅ COMPLETO | Modificar cantidad |
| `borralinea.php` | Lógica en `POSTerminal.jsx` | ✅ COMPLETO | Eliminar línea |
| `opciones_linea.php` | `ProductModifiersModal.tsx` | ✅ COMPLETO | Modificadores |
| `mobile.php` | PWA completa | ✅ MEJORADO | Responsive total |
| `image.php` | Servidor de imágenes | ✅ COMPLETO | API de imágenes |
| `conn.php` | `backend/config/database.js` | ✅ MEJORADO | ORM con Knex |

---

### ❌ FALTANTES CRÍTICAS (28/43)

#### 🔴 GESTIÓN DE VENTAS (8 archivos faltantes)

| Sistema Antiguo | Función | Sistema Nuevo | Estado |
|----------------|---------|---------------|--------|
| **`abiertas.php`** | Lista ventas suspendidas | ❌ NO EXISTE | 🔴 CRÍTICO |
| **`aparcarventa.php`** | Suspender venta actual | ❌ NO EXISTE | 🔴 CRÍTICO |
| **`cancelaventa.php`** | Cancelar venta | ⚠️ PARCIAL | 🟡 BÁSICO |
| **`nuevaventa.php`** | Iniciar nueva venta | ⚠️ EN POSTerminal | ✅ OK |
| **`finalizaventa.php`** | Finalizar y pagar | ⚠️ EN CheckoutModal | ✅ OK |
| **`operaciones_venta.php`** | Cálculos y totales | ⚠️ Lógica dispersa | 🟡 MEJORAR |
| **`opciones_venta.php`** | Opciones de venta | ❌ NO EXISTE | 🔴 FALTA |
| **`lineas_venta.php`** | Gestión de líneas | ⚠️ EN POSTerminal | ✅ OK |

**PÁGINAS NUEVAS NECESARIAS:**
```javascript
src/pages/OpenSales.jsx           // Reemplaza abiertas.php
src/components/pos/ParkSale.jsx   // Reemplaza aparcarventa.php
src/components/pos/SaleOptions.jsx // Reemplaza opciones_venta.php
```

---

#### 🔴 GESTIÓN DE PRODUCTOS (4 archivos faltantes)

| Sistema Antiguo | Función | Sistema Nuevo | Estado |
|----------------|---------|---------------|--------|
| **`add_producto.php`** | Agregar producto a venta | ⚠️ Lógica interna | ✅ OK |
| **`save_producto.php`** | Guardar producto nuevo | ❌ NO EXISTE | 🔴 FALTA |
| **`bproductos.php`** | Búsqueda de productos | ⚠️ Básica | 🟡 MEJORAR |
| **`catalogo.php`** | Catálogo completo | ⚠️ ProductGrid | 🟡 MEJORAR |

**PÁGINAS NUEVAS NECESARIAS:**
```javascript
src/pages/ProductManagement.jsx    // CRUD completo productos
src/components/products/ProductForm.jsx
src/components/products/AdvancedSearch.jsx
```

---

#### 🔴 GESTIÓN DE MESAS (3 archivos faltantes)

| Sistema Antiguo | Función | Sistema Nuevo | Estado |
|----------------|---------|---------------|--------|
| **`mapa.php`** | Configurar mapa mesas | ❌ NO EXISTE | 🔴 FALTA |
| **`showmap.php`** | Mostrar mapa visual | ⚠️ TableMap.jsx | ✅ PARCIAL |
| **`marcar_servido.php`** | Marcar plato servido | ⚠️ En Kitchen | ✅ OK |

**PÁGINAS NUEVAS NECESARIAS:**
```javascript
src/pages/TableConfiguration.jsx  // Configurar mesas
src/components/tables/TableEditor.jsx
src/components/tables/MergeTablesModal.jsx
src/components/tables/TransferTableModal.jsx
```

---

#### 🔴 CONFIGURACIÓN E IDIOMAS (5 archivos faltantes)

| Sistema Antiguo | Función | Sistema Nuevo | Estado |
|----------------|---------|---------------|--------|
| **`es.php`** | Traducciones español | ⚠️ i18n básico | 🟡 MEJORAR |
| **`en.php`** | Traducciones inglés | ⚠️ i18n básico | 🟡 MEJORAR |
| **`nl.php`** | Traducciones neerlandés | ❌ NO EXISTE | 🟢 OPCIONAL |
| **`panel.php`** | Panel de control | ⚠️ Dashboard | 🟡 MEJORAR |
| **`funciones.php`** (×3 copias) | Utilidades globales | ✅ utils/ | ✅ OK |

**PÁGINAS NUEVAS NECESARIAS:**
```javascript
src/pages/SystemConfiguration.jsx
src/components/config/LanguageManager.jsx
src/components/config/TranslationEditor.jsx
```

---

#### 🔴 OTROS MÓDULOS (8 archivos faltantes)

| Sistema Antiguo | Función | Sistema Nuevo | Estado |
|----------------|---------|---------------|--------|
| **`form-login.php`** | Formulario login | ✅ Login.jsx | ✅ OK |
| **`index.php`** | Entrada sistema | ✅ App.jsx | ✅ OK |
| **`imagecat.php`** | Imágenes categorías | ❌ NO EXISTE | 🟡 FALTA |
| **`imageempleado.php`** | Fotos empleados | ❌ NO EXISTE | 🟡 FALTA |
| **`sub_categorias.php`** | Subcategorías | ⚠️ En CategoryFilter | 🟡 MEJORAR |
| **`catalogo - copia.php`** | Backup | N/A | - |
| **Archivos venta/** | Operaciones venta | ⚠️ Dispersos | 🟡 CONSOLIDAR |
| **Archivos stock/** | Control stock | ❌ FALTA MUCHO | 🔴 CRÍTICO |

---

## 📁 ESTRUCTURA DE ARCHIVOS DEL SISTEMA ANTIGUO

```
E:\POS SYSME\Sysme_Principal\SYSME\SGC\xampp\htdocs\pos\pos\
│
├── 🟢 AUTENTICACIÓN
│   ├── login.php              ✅ Login.jsx
│   ├── form-login.php         ✅ Login.jsx
│   └── menu.php               ✅ Sidebar.jsx
│
├── 🔴 PUNTO DE VENTA (8 archivos)
│   ├── venta.php              ✅ POSTerminal.jsx
│   ├── nuevaventa.php         ⚠️ Dentro de POSTerminal
│   ├── abiertas.php           ❌ FALTA - CRÍTICO
│   ├── aparcarventa.php       ❌ FALTA - CRÍTICO
│   ├── finaliza_venta.php     ✅ CheckoutModal.jsx
│   ├── finalizaventa.php      ✅ CheckoutModal.jsx
│   ├── cancelaventa.php       ⚠️ Básico
│   └── operaciones_venta.php  ⚠️ Lógica dispersa
│
├── 🔴 LÍNEAS DE VENTA (4 archivos)
│   ├── insertalinea.php       ✅ Dentro de POSTerminal
│   ├── updatelinea.php        ✅ Dentro de POSTerminal
│   ├── borralinea.php         ✅ Dentro de POSTerminal
│   ├── lineas_venta.php       ✅ Dentro de POSTerminal
│   ├── opciones_linea.php     ✅ ProductModifiersModal.tsx
│   └── opciones_venta.php     ❌ FALTA
│
├── 🔴 PRODUCTOS (6 archivos)
│   ├── productos.php          ✅ ProductGrid.jsx
│   ├── add_producto.php       ✅ Lógica interna
│   ├── save_producto.php      ❌ FALTA - Gestión productos
│   ├── bproductos.php         ⚠️ Búsqueda básica
│   ├── catalogo.php           ⚠️ ProductGrid
│   └── categorias.php         ✅ CategoryFilter.jsx
│
├── 🔴 MESAS (3 archivos)
│   ├── mapa-mesas.php         ✅ TableMap.jsx (parcial)
│   ├── mapa.php               ❌ FALTA - Editor mesas
│   └── showmap.php            ✅ TableMap.jsx
│
├── 🟢 COCINA (2 archivos)
│   ├── panelcocina.php        ✅ KitchenDisplay.jsx
│   └── marcar_servido.php     ✅ Dentro de Kitchen
│
├── 🔴 IMÁGENES (3 archivos)
│   ├── image.php              ✅ API de imágenes
│   ├── imagecat.php           ❌ FALTA
│   └── imageempleado.php      ❌ FALTA
│
├── 🟢 IDIOMAS (3 archivos)
│   ├── es.php                 ⚠️ i18n básico
│   ├── en.php                 ⚠️ i18n básico
│   └── nl.php                 ❌ FALTA
│
├── 🟢 UTILIDADES (4 archivos)
│   ├── conn.php               ✅ database.js
│   ├── funciones.php (×3)     ✅ utils/
│   └── panel.php              ⚠️ Dashboard
│
└── 🔴 OTROS
    ├── mobile.php             ✅ PWA completa
    ├── index.php              ✅ App.jsx
    └── sub_categorias.php     ⚠️ En CategoryFilter
```

---

## 🎯 PÁGINAS NUEVAS QUE DEBES CREAR

### PRIORIDAD 1 - CRÍTICAS 🔴 (Semana 1-2)

```javascript
// GESTIÓN DE VENTAS
src/pages/OpenSales.jsx                    // Lista de ventas abiertas/suspendidas
src/components/pos/ParkSaleModal.jsx       // Modal para aparcar venta
src/components/pos/ResumeSaleModal.jsx     // Reanudar venta aparcada
src/components/pos/CancelSaleModal.jsx     // Cancelar venta completa
src/components/pos/SaleOptionsModal.jsx    // Opciones globales de venta

// GESTIÓN DE MESAS
src/pages/TableManagement.jsx              // CRUD de mesas
src/components/tables/TableEditor.jsx      // Editor visual de mesas
src/components/tables/MergeTablesModal.jsx // Fusionar mesas
src/components/tables/TransferTableModal.jsx // Transferir mesa
src/components/tables/ChangeMesaModal.jsx  // Cambiar mesa en venta

// GESTIÓN DE PRODUCTOS
src/pages/ProductManagement.jsx            // Gestión completa productos
src/components/products/ProductForm.jsx    // Formulario crear/editar
src/components/products/ProductImages.jsx  // Gestión de imágenes
src/components/products/BulkImport.jsx     // Importación masiva
```

### PRIORIDAD 2 - IMPORTANTES 🟡 (Semana 3-4)

```javascript
// CONFIGURACIÓN
src/pages/SystemSettings.jsx               // Configuración global
src/components/config/CompanySettings.jsx  // Datos empresa
src/components/config/LanguageManager.jsx  // Gestión idiomas
src/components/config/TranslationEditor.jsx // Editor traducciones
src/components/config/TaxSettings.jsx      // Configuración impuestos

// EMPLEADOS
src/pages/EmployeeManagement.jsx           // Gestión empleados
src/components/employees/EmployeeForm.jsx  // Crear/editar empleado
src/components/employees/EmployeePhoto.jsx // Foto de empleado
src/components/employees/Permissions.jsx   // Permisos granulares

// REPORTES
src/pages/AdvancedReports.jsx              // Reportes avanzados
src/components/reports/SalesReport.jsx     // Informe ventas
src/components/reports/ProductReport.jsx   // Informe productos
src/components/reports/CashReport.jsx      // Informe caja
```

### PRIORIDAD 3 - MEJORAS 🟢 (Semana 5)

```javascript
// UTILIDADES
src/components/ui/VirtualKeyboard.jsx      // Teclado virtual
src/components/ui/BarcodeScanner.jsx       // Lector códigos
src/components/ui/PrintManager.jsx         // Gestión impresión

// INTEGRACIÓN
src/pages/Integrations.jsx                 // Centro integraciones
src/components/integrations/OpenCart.jsx   // Integración OpenCart
src/components/integrations/WooCommerce.jsx // Integración WooCommerce
```

---

## 📊 CHECKLIST DE DESARROLLO

### ✅ YA IMPLEMENTADO

- [x] Login y autenticación
- [x] Menú de navegación
- [x] POS Terminal básico
- [x] Grid de productos
- [x] Filtro de categorías
- [x] Mapa de mesas (básico)
- [x] Panel de cocina
- [x] Checkout y pagos
- [x] Modificadores de productos
- [x] División de cuenta
- [x] Propinas
- [x] Dashboard básico

### ❌ POR IMPLEMENTAR

#### Semana 1-2 (Crítico)
- [ ] Página: OpenSales.jsx
- [ ] Componente: ParkSaleModal.jsx
- [ ] Componente: ResumeSaleModal.jsx
- [ ] Componente: CancelSaleModal.jsx
- [ ] Componente: SaleOptionsModal.jsx
- [ ] Página: TableManagement.jsx
- [ ] Componente: TableEditor.jsx
- [ ] Componente: MergeTablesModal.jsx
- [ ] Componente: TransferTableModal.jsx
- [ ] Componente: ChangeMesaModal.jsx
- [ ] Página: ProductManagement.jsx
- [ ] Componente: ProductForm.jsx

#### Semana 3-4 (Importante)
- [ ] Página: SystemSettings.jsx
- [ ] Página: EmployeeManagement.jsx
- [ ] Página: AdvancedReports.jsx
- [ ] Componente: LanguageManager.jsx
- [ ] Componente: TranslationEditor.jsx
- [ ] Componente: EmployeePhoto.jsx
- [ ] Componente: Permissions.jsx

#### Semana 5 (Mejoras)
- [ ] Página: Integrations.jsx
- [ ] Componente: VirtualKeyboard.jsx
- [ ] Componente: BarcodeScanner.jsx
- [ ] Componente: OpenCart.jsx
- [ ] Componente: WooCommerce.jsx

---

## 🔍 CÓMO VERIFICAR QUÉ FALTA

### Método 1: Comparar Archivos Directamente

```bash
# Listar páginas del sistema antiguo
find "E:\POS SYSME\Sysme_Principal\SYSME\SGC\xampp\htdocs\pos\pos" -name "*.php" | wc -l

# Listar componentes del sistema nuevo
find "C:\jarvis-standalone\Proyectos\SYSME-POS\dashboard-web\src" -name "*.jsx" -o -name "*.tsx" | wc -l
```

### Método 2: Usar este Documento

Este archivo (`MAPEO-PAGINAS-ANTIGUO-VS-NUEVO.md`) es tu **guía maestra**. Contiene:
- ✅ Todo lo que está implementado
- ❌ Todo lo que falta
- 🎯 Prioridades de desarrollo
- 📝 Nombres exactos de archivos a crear

### Método 3: Testing Funcional

Prueba cada funcionalidad del sistema antiguo y verifica si existe en el nuevo:

1. **Login** → ✅ Funciona
2. **Venta nueva** → ✅ Funciona
3. **Aparcar venta** → ❌ NO EXISTE
4. **Ventas abiertas** → ❌ NO EXISTE
5. **Cambiar mesa** → ❌ NO EXISTE
6. **Fusionar mesas** → ❌ NO EXISTE
7. etc...

---

## 📈 PROGRESO ACTUAL

```
[████████░░░░░░░░░░░░] 35% Completado

Implementado:  15/43 páginas principales
Faltante:      28/43 páginas
Estimado:      5 semanas de desarrollo (2 devs)
```

---

## 🚀 SIGUIENTE PASO RECOMENDADO

1. **Esta semana:** Implementar las 3 páginas más críticas:
   - `OpenSales.jsx` (Ventas abiertas)
   - `ParkSaleModal.jsx` (Aparcar venta)
   - `TableManagement.jsx` (Gestión mesas)

2. **Próxima semana:** Completar gestión de productos
   - `ProductManagement.jsx`
   - `ProductForm.jsx`

3. **Tercera semana:** Configuración y empleados
   - `SystemSettings.jsx`
   - `EmployeeManagement.jsx`

---

**CONCLUSIÓN:** Tienes **15 funcionalidades base** implementadas (35%) y necesitas desarrollar **28 páginas/componentes adicionales** (65%) para alcanzar paridad funcional completa con el sistema antiguo. Este documento es tu **roadmap completo** de desarrollo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>