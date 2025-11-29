# PLAN DE IMPLEMENTACIÓN: Funcionalidades Críticas Faltantes

**Fecha:** 16 de Enero, 2025
**Basado en:** Checklist de Equivalencia Funcional
**Objetivo:** Preparar SYSME 2.0 para producción en restaurantes reales

---

## 🎯 RESUMEN EJECUTIVO

**Estado Actual:**
- ✅ **Sistema de Modificadores:** 100% completo (MEJORA sobre sistema antiguo)
- ✅ **Caja y Arqueo:** 83% completo
- ✅ **Cocina:** 79% completo
- ❌ **Punto de Venta:** 24% completo - **CRÍTICO**
- ❌ **Impresión:** 0% - **BLOQUEANTE TOTAL**

**Funcionalidades Bloqueantes Identificadas:** 5
**Tiempo Estimado Total:** 3-4 semanas
**Prioridad:** ALTA - Requerido para producción

---

## 🔴 FUNCIONALIDADES BLOQUEANTES (Semana 1-2)

### 1. IMPRESIÓN DE TICKETS 🖨️

**Estado:** ❌ NO IMPLEMENTADO
**Impacto:** BLOQUEANTE LEGAL Y OPERATIVO
**Prioridad:** 🔴 CRÍTICA
**Tiempo Estimado:** 5 días

#### Requisitos Legales (Chile)

```
TICKET DE VENTA VÁLIDO DEBE INCLUIR:
┌─────────────────────────────────────┐
│        NOMBRE EMPRESA               │
│        RUT: XX.XXX.XXX-X           │
│        Dirección completa           │
│        Teléfono                     │
├─────────────────────────────────────┤
│ Ticket Nº: 00001234                │
│ Fecha: 16/01/2025 14:30           │
│ Mesa: 5                            │
│ Garzón: María García               │
├─────────────────────────────────────┤
│ Hamburguesa Clásica    1  $8.900   │
│   🔧 Término medio                  │
│   🔧 Extra queso      +$1.500      │
│                                     │
│ Coca Cola 500ml        2  $2.000   │
│                                     │
│ Papas Fritas          1  $3.500   │
├─────────────────────────────────────┤
│ SUBTOTAL:                  $15.900 │
│ IVA (19%):                  $3.021 │
│ TOTAL:                    $18.921 │
├─────────────────────────────────────┤
│ EFECTIVO:                 $20.000 │
│ CAMBIO:                    $1.079 │
├─────────────────────────────────────┤
│    ¡Gracias por su visita!         │
│      www.restaurante.cl            │
└─────────────────────────────────────┘
```

#### Implementación Técnica

**Backend:**
```javascript
// Nueva ruta en backend/src/modules/sales/routes.js
router.post('/sales/:id/print', authenticate, printTicket);

// Controller
export const printTicket = async (req, res) => {
  const { id } = req.params;
  const sale = await getSaleWithDetails(id);

  // Generar ticket en formato ESC/POS
  const ticketData = await generateTicketESCPOS(sale);

  // Enviar a impresora
  await sendToPrinter(ticketData);

  // Marcar como impreso
  await dbService.update('sales', id, { receipt_printed: true });

  res.json({ success: true });
};
```

**Frontend:**
```typescript
// dashboard-web/src/services/printerService.ts
export const printService = {
  printTicket: async (saleId: number) => {
    // Opción 1: Imprimir vía backend
    await api.post(`/sales/${saleId}/print`);

    // Opción 2: Imprimir desde navegador (fallback)
    const sale = await salesService.getById(saleId);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateTicketHTML(sale));
    printWindow.print();
  }
};
```

**Tecnologías Necesarias:**
- `node-thermal-printer` - Para impresoras térmicas ESC/POS
- `escpos` - Driver de impresoras de tickets
- `qz-tray` - Para impresión directa desde navegador (alternativa)

#### Archivos a Crear/Modificar

```
backend/src/
├── modules/sales/
│   ├── controller.js (MODIFICAR - agregar printTicket)
│   ├── routes.js (MODIFICAR - agregar ruta print)
│   └── printerService.js (CREAR - lógica de impresión)
├── utils/
│   └── ticketTemplate.js (CREAR - template ESC/POS)
└── config/
    └── printers.js (CREAR - configuración impresoras)

dashboard-web/src/
├── services/
│   └── printerService.ts (CREAR)
├── components/
│   └── TicketPreview.tsx (CREAR - vista previa)
└── pages/pos/
    └── POSVentas.tsx (MODIFICAR - botón imprimir)
```

---

### 2. IMPRESIÓN DE COCINA 👨‍🍳

**Estado:** ❌ NO IMPLEMENTADO
**Impacto:** BLOQUEANTE OPERATIVO
**Prioridad:** 🔴 CRÍTICA
**Tiempo Estimado:** 3 días

#### Formato de Ticket de Cocina

```
════════════════════════════════════
         ORDEN DE COCINA
════════════════════════════════════
 MESA: 5                 HORA: 14:30
 ORDEN: #123
 MESERO: María García
────────────────────────────────────

 >> HAMBURGUESA CLÁSICA x1

    🔧 TÉRMINO MEDIO
    🔧 EXTRA QUESO
    🔧 SIN CEBOLLA

────────────────────────────────────

 >> PAPAS FRITAS x1

    SIN MODIFICADORES

────────────────────────────────────
 NOTAS ESPECIALES:
 Cliente con alergia a mariscos
════════════════════════════════════
```

#### Implementación

**Impresión Automática:**
```javascript
// Cuando se crea orden de cocina
export const createKitchenOrder = async (req, res) => {
  // ... crear orden ...

  // Imprimir automáticamente
  if (settings.auto_print_kitchen) {
    await printKitchenTicket(kitchenOrder);
  }

  // Enviar por WebSocket también
  io.emit('new_kitchen_order', kitchenOrder);
};
```

**Template Cocina:**
```javascript
// backend/src/utils/kitchenTicketTemplate.js
export function generateKitchenTicket(order) {
  let ticket = '';
  ticket += center('ORDEN DE COCINA');
  ticket += separator();
  ticket += `MESA: ${order.table_number}`.padEnd(20) + `HORA: ${formatTime(order.created_at)}\n`;
  ticket += `ORDEN: #${order.id}\n`;
  ticket += `MESERO: ${order.waiter_name}\n`;
  ticket += separator();

  order.items.forEach(item => {
    ticket += `\n>> ${item.product_name.toUpperCase()} x${item.quantity}\n\n`;

    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        ticket += `   🔧 ${mod.modifier_name.toUpperCase()}\n`;
      });
    } else {
      ticket += `   SIN MODIFICADORES\n`;
    }

    if (item.notes) {
      ticket += `   NOTA: ${item.notes}\n`;
    }

    ticket += separator();
  });

  if (order.notes) {
    ticket += `\nNOTAS ESPECIALES:\n${order.notes}\n`;
    ticket += separator();
  }

  return ticket;
}
```

---

### 3. DIVISIÓN DE CUENTA 💰

**Estado:** ❌ NO IMPLEMENTADO
**Impacto:** FUNCIONALIDAD ESENCIAL EN RESTAURANTES
**Prioridad:** 🔴 CRÍTICA
**Tiempo Estimado:** 4 días

#### Casos de Uso

**Caso 1: División por Ítems**
```
Mesa 5 - Total: $50.000

Cliente A paga:
- Hamburguesa $8.900
- Coca Cola $2.000
Total A: $10.900

Cliente B paga:
- Pizza $12.000
- Cerveza $3.500
Total B: $15.500

Cliente C paga:
- Pasta $10.600
- Vino $13.000
Total C: $23.600
```

**Caso 2: División Equitativa**
```
Mesa 5 - Total: $50.000
4 personas

Cada uno paga: $12.500
```

**Caso 3: División Personalizada**
```
Mesa 5 - Total: $50.000

Cliente A: $20.000 (40%)
Cliente B: $15.000 (30%)
Cliente C: $15.000 (30%)
```

#### Implementación Backend

```javascript
// backend/src/modules/sales/controller.js

export const splitSale = async (req, res) => {
  const { sale_id, splits } = req.body;
  // splits = [
  //   { items: [1, 2], payment_method: 'cash', amount: 10900 },
  //   { items: [3, 4], payment_method: 'card', amount: 15500 }
  // ]

  await db.transaction(async (trx) => {
    const originalSale = await trx('sales').where('id', sale_id).first();

    // Marcar venta original como dividida
    await trx('sales').where('id', sale_id).update({
      status: 'split',
      updated_at: new Date()
    });

    // Crear ventas individuales
    for (const split of splits) {
      const newSaleId = await trx('sales').insert({
        ...originalSale,
        id: undefined,
        parent_sale_id: sale_id,
        total: split.amount,
        payment_method: split.payment_method,
        status: 'completed'
      });

      // Copiar ítems correspondientes
      for (const itemId of split.items) {
        const item = await trx('sale_items').where('id', itemId).first();
        await trx('sale_items').insert({
          ...item,
          id: undefined,
          sale_id: newSaleId
        });
      }
    }
  });

  res.json({ success: true });
};
```

#### UI en POS

```typescript
// Component: SplitBillModal.tsx
const SplitBillModal = ({ sale, onClose, onConfirm }) => {
  const [splitMethod, setSplitMethod] = useState<'items' | 'equal' | 'custom'>('items');
  const [splits, setSplits] = useState([]);

  const handleSplitByItems = () => {
    // Permitir seleccionar ítems para cada split
  };

  const handleSplitEqual = (numPeople: number) => {
    const amountPerPerson = sale.total_amount / numPeople;
    // Crear splits iguales
  };

  // ... render UI
};
```

---

### 4. PAGO MIXTO 💳💵

**Estado:** ❌ NO IMPLEMENTADO
**Impacto:** OPERACIÓN DIARIA NECESARIA
**Prioridad:** 🔴 CRÍTICA
**Tiempo Estimado:** 2 días

#### Caso de Uso

```
Total a pagar: $25.000

Cliente paga con:
- Efectivo: $15.000
- Tarjeta: $10.000

Cambio en efectivo: $0
```

#### Implementación

**Backend:**
```javascript
// Modificar tabla sales
ALTER TABLE sales ADD COLUMN payment_details JSON;

// Ejemplo de payment_details:
{
  "payments": [
    { "method": "cash", "amount": 15000 },
    { "method": "card", "amount": 10000 }
  ],
  "change": 0
}
```

**Frontend:**
```typescript
// Component: MixedPaymentModal.tsx
const MixedPaymentModal = ({ total, onConfirm }) => {
  const [payments, setPayments] = useState([
    { method: 'cash', amount: 0 }
  ]);

  const remaining = total - payments.reduce((sum, p) => sum + p.amount, 0);

  const addPaymentMethod = () => {
    setPayments([...payments, { method: 'card', amount: remaining }]);
  };

  // ... render UI con inputs para cada método
};
```

---

### 5. TRANSFERENCIA DE MESAS 🔄

**Estado:** ❌ NO IMPLEMENTADO
**Impacto:** OPERACIÓN COMÚN
**Prioridad:** 🔴 ALTA
**Tiempo Estimado:** 1 día

#### Caso de Uso

```
Cliente está en Mesa 3 (2 personas)
Llegan más amigos
Necesitan cambiar a Mesa 8 (6 personas)

Acción: Transferir venta de Mesa 3 → Mesa 8
Resultado:
- Mesa 3 queda libre
- Mesa 8 queda ocupada con la venta
- Venta mantiene todos los ítems
```

#### Implementación

**Backend:**
```javascript
export const transferTable = async (req, res) => {
  const { sale_id, new_table_id } = req.body;

  await db.transaction(async (trx) => {
    const sale = await trx('sales').where('id', sale_id).first();
    const oldTableId = sale.table_id;

    // Actualizar venta con nueva mesa
    await trx('sales').where('id', sale_id).update({
      table_id: new_table_id,
      updated_at: new Date()
    });

    // Liberar mesa anterior
    await trx('restaurant_tables').where('id', oldTableId).update({
      status: 'available'
    });

    // Ocupar nueva mesa
    await trx('restaurant_tables').where('id', new_table_id).update({
      status: 'occupied'
    });
  });

  res.json({ success: true });
};
```

**Frontend:**
```typescript
// En POSVentas.tsx
const handleTransferTable = async (newTable: Mesa) => {
  if (!currentSale) return;

  try {
    await salesService.transferTable(currentSale.id, newTable.id);
    toast.success(`Venta transferida a Mesa ${newTable.table_number}`);
    setSelectedMesa(newTable);
  } catch (error) {
    toast.error('Error al transferir mesa');
  }
};
```

---

## 🟡 FUNCIONALIDADES IMPORTANTES (Semana 3-4)

### 6. UNIR MESAS 🔗

**Tiempo:** 2 días
**Descripción:** Fusionar comandas de 2+ mesas en una sola

### 7. PACKS/COMBOS 📦

**Tiempo:** 3 días
**Descripción:** Productos agrupados con precio especial

### 8. TARIFAS MÚLTIPLES 💲

**Tiempo:** 3 días
**Descripción:** Precios diferentes por tipo de cliente/horario

---

## 📊 PLANIFICACIÓN DETALLADA

### Semana 1 (Días 1-5)

| Día | Tarea | Responsable | Horas |
|-----|-------|-------------|-------|
| 1 | Implementar base de impresión tickets | Dev | 8h |
| 2 | Template tickets + integración impresoras | Dev | 8h |
| 3 | Testing impresión tickets | Dev/QA | 6h |
| 3 | Implementar impresión cocina | Dev | 4h |
| 4 | Testing impresión cocina | Dev/QA | 4h |
| 4 | Iniciar división de cuenta (backend) | Dev | 4h |
| 5 | División de cuenta (frontend) | Dev | 8h |

### Semana 2 (Días 6-10)

| Día | Tarea | Responsable | Horas |
|-----|-------|-------------|-------|
| 6 | Testing división de cuenta | Dev/QA | 4h |
| 6 | Implementar pago mixto | Dev | 4h |
| 7 | Testing pago mixto | Dev/QA | 2h |
| 7 | Implementar transferencia mesas | Dev | 4h |
| 8 | Testing transferencia mesas | Dev/QA | 2h |
| 8-10 | Testing integración completa | QA | 16h |

### Semana 3-4 (Funcionalidades Importantes)

| Funcionalidad | Días | Horas |
|---------------|------|-------|
| Unir mesas | 2 | 16h |
| Packs/Combos | 3 | 24h |
| Tarifas múltiples | 3 | 24h |
| Testing y ajustes | 2 | 16h |

---

## ✅ CHECKLIST DE ACEPTACIÓN

Antes de declarar LISTO PARA PRODUCCIÓN, verificar:

### Funcionalidades Bloqueantes

- [ ] Impresión de tickets funciona en impresora física
- [ ] Impresión de tickets cumple requisitos legales
- [ ] Impresión cocina funciona automáticamente
- [ ] División de cuenta por ítems funciona
- [ ] División de cuenta equitativa funciona
- [ ] Pago mixto permite 2+ métodos
- [ ] Transferencia de mesas actualiza estados correctamente

### Pruebas Operativas

- [ ] Flujo completo: tomar orden → modificadores → imprimir cocina → pagar → imprimir ticket
- [ ] División de cuenta con modificadores
- [ ] Transferencia de mesa con venta activa
- [ ] Pago mixto con cambio
- [ ] Reimpresión de tickets
- [ ] Performance: imprimir ticket en <2 segundos

### Documentación

- [ ] Manual de usuario para meseros
- [ ] Manual de configuración de impresoras
- [ ] Troubleshooting común
- [ ] Video tutorial división de cuenta

---

## 🎯 MÉTRICAS DE ÉXITO

**Post-Implementación, medir:**

1. **Tiempo de cierre de cuenta:** <2 minutos
2. **Errores de impresión:** <5%
3. **Tickets reimpresos:** <10%
4. **Uso de división de cuenta:** >30% de mesas con 3+ personas
5. **Satisfacción de meseros:** >8/10

---

## 🚀 CRONOGRAMA RESUMIDO

```
Semana 1: Impresión (tickets + cocina)
Semana 2: División cuenta + Pago mixto + Transferencia mesas
Semana 3: Unir mesas + Packs/Combos
Semana 4: Tarifas múltiples + Testing final
```

**Fecha inicio:** 17 de Enero, 2025
**Fecha fin estimada:** 14 de Febrero, 2025
**Duración:** 4 semanas

**Estado después:** 🟢 LISTO PARA PRODUCCIÓN EN RESTAURANTE REAL

---

**Documento creado por:** JARVIS AI Assistant
**Fecha:** 16 de Enero, 2025
**Versión:** 1.0
**Próxima revisión:** Al completar Semana 1
