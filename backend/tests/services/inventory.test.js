/**
 * Tests para el servicio de inventario
 * @description Tests para stock, alertas, movimientos de inventario
 */

describe('Inventory Service', () => {

  describe('Control de Stock', () => {
    const checkStock = (product, requestedQuantity) => {
      const available = product.stock - (product.reserved || 0);

      return {
        product_id: product.id,
        current_stock: product.stock,
        reserved: product.reserved || 0,
        available,
        requested: requestedQuantity,
        sufficient: available >= requestedQuantity,
        shortage: available < requestedQuantity ? requestedQuantity - available : 0
      };
    };

    test('debería confirmar stock suficiente', () => {
      const product = { id: 1, stock: 100, reserved: 10 };
      const result = checkStock(product, 50);

      expect(result.sufficient).toBe(true);
      expect(result.available).toBe(90);
      expect(result.shortage).toBe(0);
    });

    test('debería detectar stock insuficiente', () => {
      const product = { id: 1, stock: 20, reserved: 5 };
      const result = checkStock(product, 30);

      expect(result.sufficient).toBe(false);
      expect(result.available).toBe(15);
      expect(result.shortage).toBe(15);
    });

    test('debería manejar producto sin reservas', () => {
      const product = { id: 1, stock: 50 };
      const result = checkStock(product, 25);

      expect(result.reserved).toBe(0);
      expect(result.available).toBe(50);
    });
  });

  describe('Alertas de Stock Bajo', () => {
    const checkLowStock = (products, defaultMinimum = 10) => {
      const alerts = [];

      products.forEach(product => {
        const minimum = product.minimum_stock || defaultMinimum;

        if (product.stock <= 0) {
          alerts.push({
            product_id: product.id,
            product_name: product.name,
            current_stock: product.stock,
            minimum_stock: minimum,
            severity: 'critical',
            message: `${product.name} está agotado`
          });
        } else if (product.stock <= minimum) {
          alerts.push({
            product_id: product.id,
            product_name: product.name,
            current_stock: product.stock,
            minimum_stock: minimum,
            severity: product.stock <= minimum / 2 ? 'high' : 'medium',
            message: `${product.name} tiene stock bajo (${product.stock} unidades)`
          });
        }
      });

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    };

    test('debería detectar producto agotado', () => {
      const products = [
        { id: 1, name: 'Coca-Cola', stock: 0, minimum_stock: 20 }
      ];

      const alerts = checkLowStock(products);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
    });

    test('debería detectar stock bajo', () => {
      const products = [
        { id: 1, name: 'Papas Fritas', stock: 5, minimum_stock: 10 }
      ];

      const alerts = checkLowStock(products);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('high'); // 5 <= 10/2
    });

    test('debería no alertar stock normal', () => {
      const products = [
        { id: 1, name: 'Hamburguesa', stock: 50, minimum_stock: 10 }
      ];

      const alerts = checkLowStock(products);
      expect(alerts).toHaveLength(0);
    });

    test('debería ordenar por severidad', () => {
      const products = [
        { id: 1, name: 'Producto A', stock: 8, minimum_stock: 10 },
        { id: 2, name: 'Producto B', stock: 0, minimum_stock: 5 },
        { id: 3, name: 'Producto C', stock: 2, minimum_stock: 10 }
      ];

      const alerts = checkLowStock(products);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[1].severity).toBe('high');
    });
  });

  describe('Movimientos de Inventario', () => {
    const createMovement = (type, product, quantity, reason) => {
      const validTypes = ['in', 'out', 'adjustment', 'transfer'];
      const validReasons = [
        'purchase', 'sale', 'return', 'damage',
        'expired', 'theft', 'correction', 'transfer'
      ];

      if (!validTypes.includes(type)) {
        return { error: 'Tipo de movimiento inválido' };
      }

      if (!validReasons.includes(reason)) {
        return { error: 'Razón de movimiento inválida' };
      }

      if (quantity <= 0) {
        return { error: 'Cantidad debe ser mayor a 0' };
      }

      const previousStock = product.stock;
      let newStock;

      switch (type) {
        case 'in':
          newStock = previousStock + quantity;
          break;
        case 'out':
          if (previousStock < quantity) {
            return { error: 'Stock insuficiente' };
          }
          newStock = previousStock - quantity;
          break;
        case 'adjustment':
          newStock = quantity; // Ajuste establece nuevo valor
          break;
        default:
          newStock = previousStock;
      }

      return {
        success: true,
        movement: {
          type,
          product_id: product.id,
          quantity,
          reason,
          previous_stock: previousStock,
          new_stock: newStock,
          created_at: new Date().toISOString()
        }
      };
    };

    test('debería crear movimiento de entrada', () => {
      const product = { id: 1, stock: 50 };
      const result = createMovement('in', product, 20, 'purchase');

      expect(result.success).toBe(true);
      expect(result.movement.new_stock).toBe(70);
    });

    test('debería crear movimiento de salida', () => {
      const product = { id: 1, stock: 50 };
      const result = createMovement('out', product, 10, 'sale');

      expect(result.success).toBe(true);
      expect(result.movement.new_stock).toBe(40);
    });

    test('debería rechazar salida con stock insuficiente', () => {
      const product = { id: 1, stock: 5 };
      const result = createMovement('out', product, 10, 'sale');

      expect(result.error).toBe('Stock insuficiente');
    });

    test('debería permitir ajuste de inventario', () => {
      const product = { id: 1, stock: 50 };
      const result = createMovement('adjustment', product, 45, 'correction');

      expect(result.success).toBe(true);
      expect(result.movement.new_stock).toBe(45);
    });
  });

  describe('Cálculo de Costo Promedio', () => {
    const calculateWeightedAverageCost = (currentStock, currentCost, newQuantity, newCost) => {
      if (currentStock + newQuantity === 0) {
        return 0;
      }

      const totalValue = (currentStock * currentCost) + (newQuantity * newCost);
      const totalQuantity = currentStock + newQuantity;
      const averageCost = totalValue / totalQuantity;

      return {
        previous_stock: currentStock,
        previous_cost: currentCost,
        new_quantity: newQuantity,
        new_cost: newCost,
        total_stock: totalQuantity,
        average_cost: Math.round(averageCost * 100) / 100
      };
    };

    test('debería calcular costo promedio ponderado', () => {
      // Tenemos 100 unidades a $500 c/u, compramos 50 a $600
      const result = calculateWeightedAverageCost(100, 500, 50, 600);

      expect(result.total_stock).toBe(150);
      // (100 * 500 + 50 * 600) / 150 = 80000 / 150 = 533.33
      expect(result.average_cost).toBeCloseTo(533.33, 1);
    });

    test('debería manejar primera compra', () => {
      const result = calculateWeightedAverageCost(0, 0, 100, 1000);

      expect(result.average_cost).toBe(1000);
    });
  });

  describe('Productos por Vencer', () => {
    const checkExpiringProducts = (products, daysThreshold = 7) => {
      const now = new Date();
      const threshold = new Date();
      threshold.setDate(now.getDate() + daysThreshold);

      const expiring = [];
      const expired = [];

      products.forEach(product => {
        if (!product.expiry_date) return;

        const expiryDate = new Date(product.expiry_date);

        if (expiryDate < now) {
          expired.push({
            ...product,
            days_expired: Math.ceil((now - expiryDate) / (1000 * 60 * 60 * 24)),
            status: 'expired'
          });
        } else if (expiryDate <= threshold) {
          expiring.push({
            ...product,
            days_until_expiry: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)),
            status: 'expiring_soon'
          });
        }
      });

      return {
        expired,
        expiring,
        total_at_risk: expired.length + expiring.length
      };
    };

    test('debería detectar productos vencidos', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const products = [
        { id: 1, name: 'Leche', expiry_date: yesterday.toISOString() }
      ];

      const result = checkExpiringProducts(products);
      expect(result.expired).toHaveLength(1);
      expect(result.expired[0].status).toBe('expired');
    });

    test('debería detectar productos por vencer', () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      const products = [
        { id: 1, name: 'Yogurt', expiry_date: inThreeDays.toISOString() }
      ];

      const result = checkExpiringProducts(products, 7);
      expect(result.expiring).toHaveLength(1);
      expect(result.expiring[0].days_until_expiry).toBe(3);
    });

    test('debería ignorar productos sin fecha de vencimiento', () => {
      const products = [
        { id: 1, name: 'Sal' } // Sin expiry_date
      ];

      const result = checkExpiringProducts(products);
      expect(result.total_at_risk).toBe(0);
    });
  });

  describe('Valoración de Inventario', () => {
    const calculateInventoryValue = (products) => {
      let totalCost = 0;
      let totalRetail = 0;
      let totalUnits = 0;

      const breakdown = products.map(product => {
        const costValue = product.stock * (product.cost || 0);
        const retailValue = product.stock * (product.price || 0);

        totalCost += costValue;
        totalRetail += retailValue;
        totalUnits += product.stock;

        return {
          product_id: product.id,
          product_name: product.name,
          stock: product.stock,
          cost_value: costValue,
          retail_value: retailValue,
          potential_margin: retailValue - costValue
        };
      });

      return {
        total_cost_value: totalCost,
        total_retail_value: totalRetail,
        total_units: totalUnits,
        potential_margin: totalRetail - totalCost,
        margin_percentage: totalCost > 0 ? ((totalRetail - totalCost) / totalCost * 100).toFixed(2) : 0,
        breakdown
      };
    };

    test('debería calcular valor total del inventario', () => {
      const products = [
        { id: 1, name: 'Producto A', stock: 100, cost: 500, price: 990 },
        { id: 2, name: 'Producto B', stock: 50, cost: 1000, price: 1990 }
      ];

      const result = calculateInventoryValue(products);

      expect(result.total_cost_value).toBe(100000); // 100*500 + 50*1000
      expect(result.total_retail_value).toBe(198500); // 100*990 + 50*1990
      expect(result.total_units).toBe(150);
    });

    test('debería calcular margen potencial', () => {
      const products = [
        { id: 1, name: 'Test', stock: 10, cost: 100, price: 200 }
      ];

      const result = calculateInventoryValue(products);
      expect(result.potential_margin).toBe(1000); // 2000 - 1000
      expect(result.margin_percentage).toBe('100.00');
    });
  });
});
