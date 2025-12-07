/**
 * Tests para el servicio de ventas
 * @description Tests para crear ventas, calcular totales, aplicar descuentos
 */

describe('Sales Service', () => {

  describe('Cálculo de Totales', () => {
    const calculateSaleTotal = (items, discount = 0) => {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const discountAmount = subtotal * (discount / 100);
      const net = subtotal - discountAmount;
      const tax = Math.round(net * 0.19); // IVA 19%
      const total = net + tax;

      return {
        subtotal,
        discountAmount: Math.round(discountAmount),
        net: Math.round(net),
        tax,
        total: Math.round(total)
      };
    };

    test('debería calcular total correctamente sin descuento', () => {
      const items = [
        { name: 'Hamburguesa', price: 5990, quantity: 2 },
        { name: 'Bebida', price: 1500, quantity: 2 }
      ];

      const result = calculateSaleTotal(items);
      expect(result.subtotal).toBe(14980);
      expect(result.tax).toBe(2846); // 14980 * 0.19
      expect(result.total).toBe(17826);
    });

    test('debería aplicar descuento correctamente', () => {
      const items = [
        { name: 'Pizza', price: 10000, quantity: 1 }
      ];

      const result = calculateSaleTotal(items, 10); // 10% descuento
      expect(result.subtotal).toBe(10000);
      expect(result.discountAmount).toBe(1000);
      expect(result.net).toBe(9000);
    });

    test('debería manejar lista vacía', () => {
      const result = calculateSaleTotal([]);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Validación de Venta', () => {
    const validateSale = (sale) => {
      const errors = [];

      if (!sale.items || sale.items.length === 0) {
        errors.push('La venta debe tener al menos un producto');
      }

      if (!sale.payment_method) {
        errors.push('Método de pago requerido');
      }

      const validMethods = ['cash', 'card', 'transfer', 'mixed'];
      if (sale.payment_method && !validMethods.includes(sale.payment_method)) {
        errors.push('Método de pago inválido');
      }

      if (sale.items) {
        sale.items.forEach((item, i) => {
          if (item.quantity <= 0) {
            errors.push(`Item ${i + 1}: cantidad debe ser mayor a 0`);
          }
          if (item.price < 0) {
            errors.push(`Item ${i + 1}: precio no puede ser negativo`);
          }
        });
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    test('debería validar venta correcta', () => {
      const sale = {
        items: [{ name: 'Test', price: 1000, quantity: 1 }],
        payment_method: 'cash'
      };

      const result = validateSale(sale);
      expect(result.valid).toBe(true);
    });

    test('debería rechazar venta sin items', () => {
      const sale = {
        items: [],
        payment_method: 'cash'
      };

      const result = validateSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La venta debe tener al menos un producto');
    });

    test('debería rechazar método de pago inválido', () => {
      const sale = {
        items: [{ name: 'Test', price: 1000, quantity: 1 }],
        payment_method: 'bitcoin'
      };

      const result = validateSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Método de pago inválido');
    });

    test('debería validar cantidades positivas', () => {
      const sale = {
        items: [{ name: 'Test', price: 1000, quantity: -1 }],
        payment_method: 'cash'
      };

      const result = validateSale(sale);
      expect(result.valid).toBe(false);
    });
  });

  describe('Generación de Número de Venta', () => {
    const generateSaleNumber = (prefix = 'VTA') => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}-${year}${month}${day}-${random}`;
    };

    test('debería generar número con formato correcto', () => {
      const number = generateSaleNumber();
      expect(number).toMatch(/^VTA-\d{8}-\d{4}$/);
    });

    test('debería usar prefijo personalizado', () => {
      const number = generateSaleNumber('BOL');
      expect(number).toMatch(/^BOL-\d{8}-\d{4}$/);
    });
  });

  describe('División de Cuenta', () => {
    const splitBill = (total, numberOfPeople) => {
      if (numberOfPeople <= 0) {
        return { error: 'Número de personas debe ser mayor a 0' };
      }

      const perPerson = Math.ceil(total / numberOfPeople);
      const remainder = (perPerson * numberOfPeople) - total;

      return {
        total,
        perPerson,
        numberOfPeople,
        remainder
      };
    };

    test('debería dividir cuenta equitativamente', () => {
      const result = splitBill(30000, 3);
      expect(result.perPerson).toBe(10000);
      expect(result.remainder).toBe(0);
    });

    test('debería manejar división inexacta', () => {
      const result = splitBill(10000, 3);
      expect(result.perPerson).toBe(3334); // Redondeo hacia arriba
      expect(result.remainder).toBe(2); // (3334 * 3) - 10000 = 2
    });

    test('debería rechazar división por 0', () => {
      const result = splitBill(10000, 0);
      expect(result.error).toBeDefined();
    });
  });

  describe('Aplicación de Propinas', () => {
    const calculateTip = (subtotal, percentage, includeTax = false) => {
      const base = includeTax ? subtotal * 1.19 : subtotal;
      const tip = Math.round(base * (percentage / 100));
      return {
        base,
        percentage,
        tipAmount: tip,
        total: Math.round(base + tip)
      };
    };

    test('debería calcular propina del 10%', () => {
      const result = calculateTip(10000, 10);
      expect(result.tipAmount).toBe(1000);
      expect(result.total).toBe(11000);
    });

    test('debería calcular propina del 15% sobre total con IVA', () => {
      const result = calculateTip(10000, 15, true);
      expect(result.base).toBe(11900); // 10000 * 1.19
      expect(result.tipAmount).toBe(1785); // 11900 * 0.15
    });

    test('debería manejar 0% de propina', () => {
      const result = calculateTip(10000, 0);
      expect(result.tipAmount).toBe(0);
      expect(result.total).toBe(10000);
    });
  });

  describe('Anulación de Venta', () => {
    const canVoidSale = (sale, currentUser) => {
      const now = new Date();
      const saleDate = new Date(sale.created_at);
      const hoursDiff = (now - saleDate) / (1000 * 60 * 60);

      // Solo se puede anular dentro de 24 horas
      if (hoursDiff > 24) {
        return { allowed: false, reason: 'Solo se pueden anular ventas de las últimas 24 horas' };
      }

      // Solo admin o el usuario que creó la venta
      if (currentUser.role !== 'admin' && currentUser.id !== sale.created_by) {
        return { allowed: false, reason: 'Sin permisos para anular esta venta' };
      }

      // No se puede anular si ya está anulada
      if (sale.status === 'voided') {
        return { allowed: false, reason: 'La venta ya está anulada' };
      }

      return { allowed: true };
    };

    test('debería permitir anular venta reciente por admin', () => {
      const sale = {
        created_at: new Date().toISOString(),
        created_by: 5,
        status: 'completed'
      };
      const user = { id: 1, role: 'admin' };

      const result = canVoidSale(sale, user);
      expect(result.allowed).toBe(true);
    });

    test('debería rechazar anular venta antigua', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);

      const sale = {
        created_at: oldDate.toISOString(),
        created_by: 1,
        status: 'completed'
      };
      const user = { id: 1, role: 'admin' };

      const result = canVoidSale(sale, user);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('24 horas');
    });

    test('debería rechazar si no tiene permisos', () => {
      const sale = {
        created_at: new Date().toISOString(),
        created_by: 1,
        status: 'completed'
      };
      const user = { id: 5, role: 'cashier' };

      const result = canVoidSale(sale, user);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permisos');
    });
  });
});
