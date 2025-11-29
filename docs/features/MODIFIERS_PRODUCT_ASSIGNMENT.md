# Asignación de Modificadores a Productos - SYSME POS

## 📋 Descripción General

Sistema completo para asignar grupos de modificadores a productos individuales, permitiendo personalización flexible de productos en el punto de venta.

**Fecha de implementación:** 2024-01-16
**Estado:** ✅ COMPLETADO
**Versión:** 2.0

---

## 🎯 Funcionalidad Implementada

### 1. **Modal de Asignación de Modificadores**

Componente React completo que permite a los gerentes asignar grupos de modificadores a productos específicos desde la página de gestión de productos.

#### Características principales:
- ✅ Visualización de todos los grupos de modificadores activos
- ✅ Selección múltiple de grupos mediante checkboxes
- ✅ Configuración de grupos como "Requeridos" para el producto
- ✅ Ordenamiento visual mediante botones ▲/▼
- ✅ Guardado en una sola operación con validación
- ✅ Carga automática de asignaciones existentes
- ✅ Integración completa con API backend

### 2. **Integración en ProductsPage**

Se agregó un botón 🔧 en la columna de acciones de cada producto que abre el modal de configuración de modificadores.

---

## 📁 Archivos Creados/Modificados

### **Archivos Creados:**

1. **`dashboard-web/src/components/ProductModifiersModal.tsx`** (350+ líneas)
   - Componente modal principal
   - Gestión de estado complejo para asignaciones
   - UI intuitiva con drag-like ordering
   - Validación y manejo de errores

### **Archivos Modificados:**

1. **`dashboard-web/src/pages/products/ProductsPage.tsx`**
   - Agregado import del modal
   - Nuevo estado `showModifiersModal`
   - Botón 🔧 en acciones de cada producto
   - Renderizado condicional del modal

---

## 🔌 API Endpoints Utilizados

### **GET** `/api/v1/modifiers/groups`
Obtiene todos los grupos de modificadores activos.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ingredientes a Remover",
      "type": "optional",
      "min_selections": 0,
      "max_selections": 5,
      "modifiers_count": 5,
      "is_active": true
    }
  ]
}
```

### **GET** `/api/v1/modifiers/products/:product_id/groups`
Obtiene los grupos de modificadores asignados a un producto específico.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ingredientes a Remover",
      "is_required": false,
      "modifiers": [...]
    }
  ]
}
```

### **POST** `/api/v1/modifiers/products/:product_id/groups`
Asigna grupos de modificadores a un producto.

**Request Body:**
```json
{
  "groups": [
    {
      "modifier_group_id": 1,
      "is_required": false,
      "display_order": 1
    },
    {
      "modifier_group_id": 2,
      "is_required": true,
      "display_order": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 4,
      "modifier_group_id": 1,
      "is_required": false,
      "display_order": 1
    }
  ]
}
```

---

## 💻 Uso del Sistema

### Flujo de Asignación de Modificadores:

1. **Acceder a Gestión de Productos**
   - Navegar a `/products`
   - Requiere rol: `manager` o `admin`

2. **Seleccionar Producto**
   - Hacer clic en el botón 🔧 en la fila del producto deseado

3. **Configurar Modificadores**
   - Se abre el modal con todos los grupos disponibles
   - Los grupos ya asignados aparecen marcados y en azul
   - Marcar/desmarcar checkboxes para asignar/desasignar grupos
   - Para grupos asignados:
     - ✓ Marcar como "Requerido" si el cliente debe elegir de ese grupo
     - Usar ▲/▼ para cambiar el orden de presentación

4. **Guardar Cambios**
   - Clic en "Guardar Asignaciones"
   - Confirmación con toast notification
   - Las asignaciones se guardan en `product_modifier_groups`

---

## 🗄️ Estructura de Base de Datos

### Tabla: `product_modifier_groups`

```sql
CREATE TABLE product_modifier_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    modifier_group_id INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id)
);
```

### Relaciones:
- **product_id**: FK a `products.id` - El producto al que se asigna
- **modifier_group_id**: FK a `modifier_groups.id` - El grupo asignado
- **is_required**: Si el grupo es obligatorio para este producto
- **display_order**: Orden de presentación en el POS

---

## 🧪 Testing Manual

### Test Case 1: Asignar grupos a Hamburguesa Clásica
```
1. Ir a /products
2. Buscar "Hamburguesa Clásica" (ID: 4)
3. Clic en 🔧
4. Asignar:
   - ✓ Ingredientes a Remover (opcional)
   - ✓ Extras (opcional)
   - ✓ Nivel de Cocción (requerido)
5. Guardar
6. Verificar toast de éxito
7. Reabrir modal - verificar que se mantengan las asignaciones
```

### Test Case 2: Reordenar grupos
```
1. Abrir modal de un producto con 3+ grupos
2. Mover grupo del medio hacia arriba con ▲
3. Guardar
4. Reabrir y verificar nuevo orden
```

### Test Case 3: Cambiar required flag
```
1. Asignar grupo como opcional
2. Guardar
3. Reabrir y marcar como requerido
4. Guardar
5. Verificar cambio en BD
```

---

## 📊 Ejemplo de Configuración Real

### Producto: Hamburguesa Clásica

| Grupo | Tipo Original | Requerido | Orden | Descripción |
|-------|--------------|-----------|-------|-------------|
| Nivel de Cocción | required | ✓ SÍ | 1 | Cliente debe elegir cocción |
| Extras | optional | ✗ NO | 2 | Ingredientes adicionales opcionales |
| Ingredientes a Remover | optional | ✗ NO | 3 | Sin cebolla, sin tomate, etc. |

### Producto: Pizza Margarita

| Grupo | Tipo Original | Requerido | Orden |
|-------|--------------|-----------|-------|
| Tamaño | optional | ✓ SÍ | 1 |
| Extras | optional | ✗ NO | 2 |

---

## 🎨 Componente UI - Detalles de Diseño

### Estados Visuales:

**Grupo No Asignado:**
```
┌─────────────────────────────────────┐
│ ☐ Extras                    optional│
│   Ingredientes adicionales          │
│   Selecciones: 0 - 10               │
└─────────────────────────────────────┘
```

**Grupo Asignado:**
```
┌─────────────────────────────────────┐ 🔵 Fondo azul
│ ☑ Nivel de Cocción         required │
│   ¿Cómo prefieres tu carne?         │
│   Selecciones: 1 - 1                │
│   ☑ Requerido para este producto    │ ▲
│                                     │ #1
│                                     │ ▼
└─────────────────────────────────────┘
```

### Colores y Estilos:
- **No asignado**: Borde gris, fondo blanco
- **Asignado**: Borde azul, fondo azul claro
- **Badge "required"**: Rojo
- **Badge "optional"**: Verde
- **Botones orden**: Gris con hover

---

## 🔄 Próximos Pasos

Una vez completada esta funcionalidad, los siguientes pasos son:

1. ✅ **[COMPLETADO]** Asignación de modificadores a productos
2. 🔄 **[SIGUIENTE]** Integración en POS para selección de modificadores
3. ⏳ **[PENDIENTE]** Actualizar sistema de ventas para incluir modificadores
4. ⏳ **[PENDIENTE]** Mostrar modificadores en tickets de cocina
5. ⏳ **[PENDIENTE]** Reportes con desglose de modificadores

---

## 🐛 Troubleshooting

### Error: "No hay grupos de modificadores disponibles"
**Solución:** Primero crea grupos en la sección `/modifiers`

### Error al guardar asignaciones
**Verificar:**
1. Que el producto existe en la BD
2. Que los grupos seleccionados existen y están activos
3. Permisos del usuario (debe ser manager o admin)
4. Console del navegador para errores de API

### Los cambios no se reflejan
**Solución:** Recargar la página de productos después de guardar

---

## 📝 Notas Técnicas

### Performance:
- El modal carga todos los grupos activos en una sola petición
- Las asignaciones existentes se cargan al abrir el modal
- El guardado es transaccional: elimina todas las asignaciones anteriores y crea las nuevas

### Validaciones:
- Solo se pueden asignar grupos activos
- El producto debe existir antes de asignar grupos
- El array de grupos puede estar vacío (elimina todas las asignaciones)
- Los grupos se ordenan automáticamente según `display_order`

### Estado del Componente:
```typescript
interface GroupAssignmentState extends ModifierGroup {
  isAssigned: boolean;      // Si está asignado al producto
  isRequired: boolean;      // Si es requerido para este producto
  displayOrder: number;     // Orden de presentación
}
```

---

## ✅ Checklist de Implementación

- [x] Crear componente `ProductModifiersModal.tsx`
- [x] Integrar modal en `ProductsPage.tsx`
- [x] Agregar botón 🔧 en tabla de productos
- [x] Implementar lógica de carga de grupos
- [x] Implementar lógica de carga de asignaciones existentes
- [x] Implementar toggle de asignación (checkbox)
- [x] Implementar toggle de "requerido"
- [x] Implementar ordenamiento con ▲/▼
- [x] Implementar guardado con API
- [x] Manejo de errores y loading states
- [x] Toast notifications
- [x] Validación de backend endpoints
- [x] Documentación completa
- [x] Testing manual

---

**Implementado por:** JARVIS AI Assistant
**Fecha:** 16 de Enero, 2024
**Sprint:** Modificadores y Personalización v2.0
