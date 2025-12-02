# 📋 FUNCIONALIDADES FALTANTES - LISTA DEFINITIVA

**Identificadas mediante pruebas en sistema antiguo**
**Fecha:** 2 de Diciembre de 2024
**Estado:** Listo para implementación

---

## 🔴 PRIORIDAD ALTA (Uso Diario en Restaurante) - 6 Funcionalidades

### 1. ⌨️ **Teclado Virtual Táctil** - 2h
**Descripción:** Teclado en pantalla para tablets sin teclado físico
**Impacto:** CRÍTICO - Sin esto no funciona en tablets
**Ubicación:** Sistema antiguo tiene teclado numérico integrado

**Componente a crear:**
```javascript
src/components/ui/VirtualKeyboard.jsx
- Teclado numérico (0-9)
- Operadores (+, -, *, /)
- Enter y Backspace
- Teclas especiales (F1-F4)
- Responsive para tablets
```

**Archivos afectados:**
- `dashboard-web/src/components/ui/VirtualKeyboard.jsx` (NUEVO)
- `dashboard-web/src/components/pos/POSTerminal.jsx` (MODIFICAR)
- `dashboard-web/src/components/cash/CashSession.jsx` (MODIFICAR)

---

### 2. 📝 **Notas Rápidas Cocina** - 1h
**Descripción:** Botones preconfigurados: "TERMINO MEDIO", "PAPAS", etc.
**Impacto:** ALTO - Agiliza comunicación con cocina
**Ubicación:** Sistema antiguo en opciones_linea.php

**Componente a crear:**
```javascript
src/components/kitchen/QuickNotes.jsx
- Botones predefinidos comunes
- Agregar nota custom
- Historial de notas usadas
- Configuración de botones
```

**Notas Comunes:**
- "SIN SAL"
- "EXTRA PICANTE"
- "TERMINO MEDIO"
- "TERMINO 3/4"
- "BIEN COCIDO"
- "PAPAS EN VEZ DE ARROZ"
- "SIN CEBOLLA"
- "SIN AJO"
- "PARA LLEVAR"
- "URGENTE"

---

### 3. 💳 **Red Compra (Método de Pago)** - 30min
**Descripción:** Agregar "Red Compra" como método de pago en Chile
**Impacto:** ALTO - Método común en Chile
**Ubicación:** Sistema antiguo en modo_pago tabla

**Modificaciones:**
```javascript
backend/migrations/004_add_payment_methods.sql
- Agregar 'red_compra' a payment_methods

dashboard-web/src/components/pos/PaymentMethods.jsx
- Añadir icono y botón Red Compra
- Validaciones específicas
```

**Métodos de pago completos necesarios:**
- Efectivo
- Tarjeta Débito
- Tarjeta Crédito
- Red Compra ⭐ FALTA
- Transferencia
- Cheque (Prioridad Media)

---

### 4. ⭐ **Productos Favoritos** - 1h
**Descripción:** Categoría especial con productos más vendidos
**Impacto:** ALTO - Acceso rápido a productos frecuentes
**Ubicación:** Sistema antiguo tiene filtro de favoritos

**Componente a crear:**
```javascript
src/components/pos/FavoritesFilter.jsx
- Toggle ver solo favoritos
- Marcar/desmarcar favorito
- Top 20 productos automático (IA)
- Favoritos por empleado
```

**Backend necesario:**
```javascript
backend/services/favoritesService.js
- getFavoritesByUser()
- toggleFavorite()
- getTopProducts() // Basado en ventas
```

---

### 5. 🔔 **Badge Ventas Pendientes** - 30min
**Descripción:** Contador visual de ventas abiertas en botón
**Impacto:** MEDIO - Ayuda visual para camareros
**Ubicación:** Sistema antiguo muestra número en botón "Abiertas"

**Modificaciones:**
```javascript
dashboard-web/src/components/layout/Sidebar.jsx
- Badge con número de ventas abiertas
- Actualización en tiempo real (WebSocket)
- Color según urgencia (rojo > 10, amarillo > 5)
```

---

### 6. 🖨️ **Imprimir Último Ticket (F4)** - 30min
**Descripción:** Tecla F4 para reimprimir último ticket
**Impacto:** ALTO - Funcionalidad muy usada
**Ubicación:** Sistema antiguo tiene shortcut F4

**Implementación:**
```javascript
src/hooks/useKeyboardShortcuts.js
- F1: Nueva venta
- F2: Finalizar venta
- F3: Cancelar
- F4: Reimprimir último ticket ⭐ NUEVO
- F5: Ventas abiertas
- F6: Panel cocina

backend/routes/printRoutes.js
- POST /api/print/last-ticket
- GET /api/sales/last/:userId
```

---

## 🟡 PRIORIDAD MEDIA (Operaciones Completas) - 6 Funcionalidades

### 7. 💰 **Cambio de Precio en Venta** - 1h
**Descripción:** Modificar precio de línea individual
**Impacto:** MEDIO - Necesario para descuentos especiales
**Ubicación:** Sistema antiguo permite precio manual

**Componente:**
```javascript
src/components/pos/PriceOverrideModal.jsx
- Input nuevo precio
- Validación permisos (solo gerente/admin)
- Motivo del cambio
- Log de auditoría
```

**Backend:**
```javascript
backend/middleware/permissions.js
- checkPermission('price_override')

backend/services/saleService.js
- overrideLinePrice(lineId, newPrice, reason, userId)
```

---

### 8. 📄 **Pre-Boleta** - 1h
**Descripción:** Imprimir ticket sin cerrar venta
**Impacto:** MEDIO - Cliente quiere ver cuenta antes de pagar
**Ubicación:** Sistema antiguo tiene "Pre-ticket"

**Componente:**
```javascript
src/components/pos/PreTicketModal.jsx
- Preview del ticket
- Imprimir sin cerrar
- No afecta stock
- No genera número fiscal
```

---

### 9. 📑 **Exportar PDF** - 1h
**Descripción:** Guardar documentos como PDF
**Impacto:** MEDIO - Para enviar por email/WhatsApp
**Ubicación:** Sistema antiguo exporta facturas

**Implementación:**
```javascript
backend/utils/pdfGenerator.js
- Usar librería 'pdfkit'
- Templates: Ticket, Factura, Reporte

src/components/common/ExportButton.jsx
- Botón exportar PDF
- Enviar por email
- Descargar directamente
```

---

### 10. 📦 **Albaranes** - 2h
**Descripción:** Notas de entrega sin valor fiscal
**Impacto:** MEDIO - Para deliveries y transferencias
**Ubicación:** Sistema antiguo: tabla albaran

**Páginas nuevas:**
```javascript
src/pages/Albaranes.jsx
src/components/documents/AlbaranForm.jsx
src/components/documents/AlbaranList.jsx

backend/services/albaranService.js
backend/routes/albaranRoutes.js
```

---

### 11. 📝 **Cheque como Método de Pago** - 30min
**Descripción:** Agregar opción de pago con cheque
**Impacto:** BAJO - Poco usado pero necesario B2B
**Ubicación:** Sistema antiguo en modo_pago

**Implementación:**
```javascript
dashboard-web/src/components/pos/PaymentMethods.jsx
- Botón Cheque
- Modal: Número cheque, Banco, Fecha
- Validación datos

backend/migrations/004_add_payment_methods.sql
- Agregar 'cheque' a payment_methods
```

---

### 12. 🖥️ **Selector Terminal (TPV1, TPV2)** - 2h
**Descripción:** Selección de punto de venta activo
**Impacto:** MEDIO - Para múltiples terminales
**Ubicación:** Sistema antiguo: tabla Tpv

**Componente:**
```javascript
src/components/config/TerminalSelector.jsx
- Dropdown TPV activo
- Guardar en localStorage
- Mostrar en header
- Configuración por terminal

backend/models/Terminal.js
- terminal_id, name, printer, cash_drawer
```

---

## 🟢 PRIORIDAD BAJA (Mejoras Opcionales) - 6 Funcionalidades

### 13. 👨‍🍳 **Selector Multi-Cocina (1-4)** - 1h
**Descripción:** Enviar órdenes a cocinas específicas
**Impacto:** BAJO - Solo para restaurantes grandes
**Ubicación:** Sistema antiguo permite múltiples cocinas

---

### 14. 🏨 **Pasar Cargo a Habitación** - 3h
**Descripción:** Integración con sistema de hotel
**Impacto:** BAJO - Solo para hoteles
**Ubicación:** Sistema antiguo: tabla habitacion

---

### 15. 📊 **Exportar Excel/CSV** - 1h
**Descripción:** Exportar reportes a Excel
**Impacto:** MEDIO - Para análisis externo

---

### 16. 👔 **Filtros Retail (Talla, Color)** - 1h
**Descripción:** Para tiendas de ropa
**Impacto:** BAJO - No aplica a restaurantes

---

### 17. 🔍 **Lector Código Barras Dedicado** - 1h
**Descripción:** Soporte para scanner USB
**Impacto:** MEDIO - Agiliza búsqueda productos

---

### 18. 💵 **Multi-Moneda** - 2h
**Descripción:** Soporte USD, EUR, etc.
**Impacto:** BAJO - Solo para zonas turísticas

---

## 📊 RESUMEN Y ESTIMACIONES

| Prioridad | Funcionalidades | Tiempo Total | Desarrolladores | Semanas |
|-----------|----------------|--------------|-----------------|---------|
| 🔴 Alta | 6 | 6 horas | 1 dev | 1 día |
| 🟡 Media | 6 | 8.5 horas | 1 dev | 1.5 días |
| 🟢 Baja | 6 | 10 horas | 1 dev | 1.5 días |
| **TOTAL** | **18** | **24.5h** | **1 dev** | **4 días** |

Con **2 desarrolladores en paralelo:** **2 días** para completar todo.

---

## 🎯 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### DÍA 1 (Prioridad Alta - 6h)
**Developer 1:**
- ✅ Teclado Virtual (2h)
- ✅ Notas Rápidas Cocina (1h)
- ✅ Productos Favoritos (1h)

**Developer 2:**
- ✅ Red Compra (30min)
- ✅ Badge Ventas Pendientes (30min)
- ✅ Imprimir Último Ticket F4 (30min)
- ✅ Ayudar con Teclado Virtual (2h)

### DÍA 2 (Prioridad Media - 8.5h)
**Developer 1:**
- ✅ Cambio Precio en Venta (1h)
- ✅ Pre-Boleta (1h)
- ✅ Exportar PDF (1h)
- ✅ Albaranes (2h)

**Developer 2:**
- ✅ Cheque Método Pago (30min)
- ✅ Selector Terminal (2h)
- ✅ Testing de funcionalidades Día 1

### DÍA 3 (Prioridad Baja - 10h)
**Developer 1:**
- ✅ Selector Multi-Cocina (1h)
- ✅ Exportar Excel/CSV (1h)
- ✅ Lector Código Barras (1h)

**Developer 2:**
- ✅ Pasar Cargo Habitación (3h)
- ✅ Filtros Retail (1h)
- ✅ Multi-Moneda (2h)

### DÍA 4 (Testing y Ajustes)
**Ambos Developers:**
- ✅ Testing integral
- ✅ Bug fixes
- ✅ Optimización
- ✅ Documentación

---

## 🔧 ARCHIVOS A CREAR/MODIFICAR

### Nuevos Componentes (18 archivos)
```
dashboard-web/src/components/
├── ui/
│   └── VirtualKeyboard.jsx ⭐ NUEVO
├── kitchen/
│   └── QuickNotes.jsx ⭐ NUEVO
├── pos/
│   ├── FavoritesFilter.jsx ⭐ NUEVO
│   ├── PriceOverrideModal.jsx ⭐ NUEVO
│   ├── PreTicketModal.jsx ⭐ NUEVO
│   └── PaymentMethods.jsx (MODIFICAR)
├── documents/
│   ├── AlbaranForm.jsx ⭐ NUEVO
│   ├── AlbaranList.jsx ⭐ NUEVO
│   └── ExportButton.jsx ⭐ NUEVO
├── config/
│   └── TerminalSelector.jsx ⭐ NUEVO
└── common/
    └── BarcodeScanner.jsx ⭐ NUEVO
```

### Nuevas Páginas (2 archivos)
```
dashboard-web/src/pages/
└── Albaranes.jsx ⭐ NUEVO
```

### Backend (10 archivos)
```
backend/
├── services/
│   ├── favoritesService.js ⭐ NUEVO
│   ├── albaranService.js ⭐ NUEVO
│   └── printService.js ⭐ NUEVO
├── routes/
│   ├── printRoutes.js ⭐ NUEVO
│   └── albaranRoutes.js ⭐ NUEVO
├── utils/
│   └── pdfGenerator.js ⭐ NUEVO
├── middleware/
│   └── permissions.js (MODIFICAR)
└── migrations/
    └── 004_add_payment_methods.sql ⭐ NUEVO
```

### Hooks (1 archivo)
```
dashboard-web/src/hooks/
└── useKeyboardShortcuts.js ⭐ NUEVO
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### 🔴 Prioridad Alta
- [ ] 1. Teclado Virtual Táctil (2h)
- [ ] 2. Notas Rápidas Cocina (1h)
- [ ] 3. Red Compra Método Pago (30min)
- [ ] 4. Productos Favoritos (1h)
- [ ] 5. Badge Ventas Pendientes (30min)
- [ ] 6. Imprimir Último Ticket F4 (30min)

### 🟡 Prioridad Media
- [ ] 7. Cambio Precio en Venta (1h)
- [ ] 8. Pre-Boleta (1h)
- [ ] 9. Exportar PDF (1h)
- [ ] 10. Albaranes (2h)
- [ ] 11. Cheque Método Pago (30min)
- [ ] 12. Selector Terminal (2h)

### 🟢 Prioridad Baja
- [ ] 13. Selector Multi-Cocina (1h)
- [ ] 14. Pasar Cargo Habitación (3h)
- [ ] 15. Exportar Excel/CSV (1h)
- [ ] 16. Filtros Retail (1h)
- [ ] 17. Lector Código Barras (1h)
- [ ] 18. Multi-Moneda (2h)

---

## 🎉 IMPACTO ESPERADO

Una vez implementadas estas **18 funcionalidades**:

✅ **Sistema 100% funcional** para operación diaria
✅ **Paridad completa** con sistema antiguo
✅ **Mejoras adicionales** con JARVIS IA
✅ **Listo para producción** en restaurante real
✅ **Training mínimo** para empleados (UI familiar)

**Tiempo total:** 4 días con 2 developers = **Sistema completo funcional**

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>