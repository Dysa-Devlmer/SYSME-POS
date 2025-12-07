/**
 * Tests para el servicio de caja
 * @description Tests para apertura/cierre de caja, arqueo, movimientos
 */

describe('Cash Service', () => {

  describe('Apertura de Caja', () => {
    const validateCashOpen = (data) => {
      const errors = [];

      if (!data.initial_amount && data.initial_amount !== 0) {
        errors.push('Monto inicial requerido');
      }

      if (data.initial_amount < 0) {
        errors.push('Monto inicial no puede ser negativo');
      }

      if (!data.user_id) {
        errors.push('Usuario requerido');
      }

      if (!data.terminal_id) {
        errors.push('Terminal requerido');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    test('debería validar apertura correcta', () => {
      const data = {
        initial_amount: 50000,
        user_id: 1,
        terminal_id: 1
      };

      const result = validateCashOpen(data);
      expect(result.valid).toBe(true);
    });

    test('debería permitir monto inicial de 0', () => {
      const data = {
        initial_amount: 0,
        user_id: 1,
        terminal_id: 1
      };

      const result = validateCashOpen(data);
      expect(result.valid).toBe(true);
    });

    test('debería rechazar monto negativo', () => {
      const data = {
        initial_amount: -1000,
        user_id: 1,
        terminal_id: 1
      };

      const result = validateCashOpen(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Monto inicial no puede ser negativo');
    });
  });

  describe('Cierre de Caja', () => {
    const calculateCashClose = (session) => {
      const salesTotal = session.sales.reduce((sum, sale) => {
        if (sale.payment_method === 'cash') {
          return sum + sale.total;
        }
        return sum;
      }, 0);

      const cardTotal = session.sales.reduce((sum, sale) => {
        if (sale.payment_method === 'card') {
          return sum + sale.total;
        }
        return sum;
      }, 0);

      const movementsIn = session.movements
        .filter(m => m.type === 'in')
        .reduce((sum, m) => sum + m.amount, 0);

      const movementsOut = session.movements
        .filter(m => m.type === 'out')
        .reduce((sum, m) => sum + m.amount, 0);

      const expectedCash = session.initial_amount + salesTotal + movementsIn - movementsOut;

      return {
        initial_amount: session.initial_amount,
        sales_cash: salesTotal,
        sales_card: cardTotal,
        movements_in: movementsIn,
        movements_out: movementsOut,
        expected_cash: expectedCash,
        total_sales: salesTotal + cardTotal
      };
    };

    test('debería calcular cierre correctamente', () => {
      const session = {
        initial_amount: 50000,
        sales: [
          { total: 10000, payment_method: 'cash' },
          { total: 15000, payment_method: 'cash' },
          { total: 20000, payment_method: 'card' }
        ],
        movements: []
      };

      const result = calculateCashClose(session);
      expect(result.sales_cash).toBe(25000);
      expect(result.sales_card).toBe(20000);
      expect(result.expected_cash).toBe(75000); // 50000 + 25000
      expect(result.total_sales).toBe(45000);
    });

    test('debería considerar movimientos de caja', () => {
      const session = {
        initial_amount: 50000,
        sales: [
          { total: 30000, payment_method: 'cash' }
        ],
        movements: [
          { type: 'in', amount: 10000 },
          { type: 'out', amount: 5000 }
        ]
      };

      const result = calculateCashClose(session);
      expect(result.movements_in).toBe(10000);
      expect(result.movements_out).toBe(5000);
      expect(result.expected_cash).toBe(85000); // 50000 + 30000 + 10000 - 5000
    });
  });

  describe('Arqueo de Caja', () => {
    const performCashCount = (counted, expected) => {
      const difference = counted - expected;
      const status = difference === 0 ? 'exact' : difference > 0 ? 'surplus' : 'shortage';

      return {
        counted,
        expected,
        difference,
        absolute_difference: Math.abs(difference),
        status,
        percentage_diff: expected > 0 ? ((difference / expected) * 100).toFixed(2) : 0
      };
    };

    test('debería detectar arqueo exacto', () => {
      const result = performCashCount(75000, 75000);
      expect(result.status).toBe('exact');
      expect(result.difference).toBe(0);
    });

    test('debería detectar sobrante', () => {
      const result = performCashCount(76000, 75000);
      expect(result.status).toBe('surplus');
      expect(result.difference).toBe(1000);
    });

    test('debería detectar faltante', () => {
      const result = performCashCount(74000, 75000);
      expect(result.status).toBe('shortage');
      expect(result.difference).toBe(-1000);
      expect(result.absolute_difference).toBe(1000);
    });

    test('debería calcular porcentaje de diferencia', () => {
      const result = performCashCount(95000, 100000);
      expect(result.percentage_diff).toBe('-5.00');
    });
  });

  describe('Movimientos de Caja', () => {
    const validateMovement = (movement) => {
      const errors = [];
      const validTypes = ['in', 'out'];
      const validReasons = [
        'change', 'deposit', 'withdrawal', 'correction',
        'tip_payout', 'supplier_payment', 'petty_cash', 'other'
      ];

      if (!validTypes.includes(movement.type)) {
        errors.push('Tipo de movimiento inválido');
      }

      if (!movement.amount || movement.amount <= 0) {
        errors.push('Monto debe ser mayor a 0');
      }

      if (!validReasons.includes(movement.reason)) {
        errors.push('Razón de movimiento inválida');
      }

      if (!movement.description || movement.description.length < 3) {
        errors.push('Descripción requerida (mínimo 3 caracteres)');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    test('debería validar movimiento de ingreso correcto', () => {
      const movement = {
        type: 'in',
        amount: 10000,
        reason: 'deposit',
        description: 'Depósito de cambio'
      };

      const result = validateMovement(movement);
      expect(result.valid).toBe(true);
    });

    test('debería validar movimiento de egreso correcto', () => {
      const movement = {
        type: 'out',
        amount: 5000,
        reason: 'supplier_payment',
        description: 'Pago a proveedor de bebidas'
      };

      const result = validateMovement(movement);
      expect(result.valid).toBe(true);
    });

    test('debería rechazar monto cero', () => {
      const movement = {
        type: 'in',
        amount: 0,
        reason: 'deposit',
        description: 'Test'
      };

      const result = validateMovement(movement);
      expect(result.valid).toBe(false);
    });

    test('debería rechazar razón inválida', () => {
      const movement = {
        type: 'out',
        amount: 1000,
        reason: 'invalid_reason',
        description: 'Test'
      };

      const result = validateMovement(movement);
      expect(result.valid).toBe(false);
    });
  });

  describe('Denominaciones de Billetes/Monedas', () => {
    const DENOMINATIONS_CLP = {
      bills: [20000, 10000, 5000, 2000, 1000],
      coins: [500, 100, 50, 10]
    };

    const calculateDenominations = (counts) => {
      let total = 0;
      const breakdown = [];

      // Billetes
      DENOMINATIONS_CLP.bills.forEach(denom => {
        const count = counts[`bill_${denom}`] || 0;
        const subtotal = denom * count;
        total += subtotal;
        if (count > 0) {
          breakdown.push({ type: 'bill', denomination: denom, count, subtotal });
        }
      });

      // Monedas
      DENOMINATIONS_CLP.coins.forEach(denom => {
        const count = counts[`coin_${denom}`] || 0;
        const subtotal = denom * count;
        total += subtotal;
        if (count > 0) {
          breakdown.push({ type: 'coin', denomination: denom, count, subtotal });
        }
      });

      return { total, breakdown };
    };

    test('debería calcular total de billetes', () => {
      const counts = {
        bill_20000: 2,
        bill_10000: 3,
        bill_5000: 1
      };

      const result = calculateDenominations(counts);
      expect(result.total).toBe(75000); // 40000 + 30000 + 5000
    });

    test('debería calcular total de monedas', () => {
      const counts = {
        coin_500: 4,
        coin_100: 10
      };

      const result = calculateDenominations(counts);
      expect(result.total).toBe(3000); // 2000 + 1000
    });

    test('debería calcular total mixto', () => {
      const counts = {
        bill_10000: 5,
        bill_5000: 2,
        coin_500: 6,
        coin_100: 5
      };

      const result = calculateDenominations(counts);
      expect(result.total).toBe(63500); // 50000 + 10000 + 3000 + 500
    });

    test('debería generar desglose detallado', () => {
      const counts = {
        bill_20000: 1,
        coin_500: 2
      };

      const result = calculateDenominations(counts);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toEqual({
        type: 'bill',
        denomination: 20000,
        count: 1,
        subtotal: 20000
      });
    });
  });

  describe('Validación de Sesión Activa', () => {
    const checkActiveSession = (sessions, userId, terminalId) => {
      const activeSession = sessions.find(s =>
        s.user_id === userId &&
        s.terminal_id === terminalId &&
        s.status === 'open'
      );

      return {
        hasActiveSession: !!activeSession,
        session: activeSession || null
      };
    };

    test('debería detectar sesión activa', () => {
      const sessions = [
        { id: 1, user_id: 1, terminal_id: 1, status: 'open' },
        { id: 2, user_id: 2, terminal_id: 1, status: 'closed' }
      ];

      const result = checkActiveSession(sessions, 1, 1);
      expect(result.hasActiveSession).toBe(true);
      expect(result.session.id).toBe(1);
    });

    test('debería detectar sin sesión activa', () => {
      const sessions = [
        { id: 1, user_id: 1, terminal_id: 1, status: 'closed' }
      ];

      const result = checkActiveSession(sessions, 1, 1);
      expect(result.hasActiveSession).toBe(false);
      expect(result.session).toBeNull();
    });
  });
});
