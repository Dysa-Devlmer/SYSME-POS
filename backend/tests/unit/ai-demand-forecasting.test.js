/**
 * Pruebas unitarias para el Servicio de Predicción de Demanda
 */

const assert = require('assert');
const sinon = require('sinon');

// Mock del servicio
const DemandForecastingService = require('../../src/services/ai-demand-forecasting');

describe('AI Demand Forecasting Service', () => {
  let forecastingService;
  let dbStub;

  beforeEach(() => {
    // Crear stubs para la base de datos
    dbStub = {
      raw: sinon.stub(),
      findById: sinon.stub()
    };

    // Mock del servicio con inyección de dependencias
    forecastingService = Object.create(DemandForecastingService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('calculateMovingAverage', () => {
    it('debe calcular el promedio móvil correctamente', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 },
        { quantity_sold: 20 },
        { quantity_sold: 25 },
        { quantity_sold: 30 },
        { quantity_sold: 35 },
        { quantity_sold: 40 }
      ];

      const result = forecastingService.calculateMovingAverage(data, 3);

      assert.strictEqual(typeof result.value, 'number');
      assert.strictEqual(result.value, 35); // (30+35+40)/3
      assert(Array.isArray(result.series));
      assert.strictEqual(result.series.length, 5); // 7 datos - 3 ventana + 1
    });

    it('debe retornar 0 si no hay suficientes datos', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 }
      ];

      const result = forecastingService.calculateMovingAverage(data, 7);

      assert.strictEqual(result.value, 0);
      assert.deepStrictEqual(result.series, []);
    });

    it('debe manejar datos con valores null', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: null },
        { quantity_sold: 20 },
        { quantity_sold: 25 }
      ];

      const result = forecastingService.calculateMovingAverage(data, 3);

      assert.strictEqual(typeof result.value, 'number');
      assert(!isNaN(result.value));
    });
  });

  describe('calculateExponentialSmoothing', () => {
    it('debe calcular EMA correctamente', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 },
        { quantity_sold: 20 },
        { quantity_sold: 25 }
      ];

      const result = forecastingService.calculateExponentialSmoothing(data, 0.3);

      assert.strictEqual(typeof result.value, 'number');
      assert(result.value > 0);
      assert(Array.isArray(result.series));
      assert.strictEqual(result.series.length, data.length);
    });

    it('debe manejar alpha = 1 (sin suavizado)', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 },
        { quantity_sold: 20 },
        { quantity_sold: 25 }
      ];

      const result = forecastingService.calculateExponentialSmoothing(data, 1);

      assert.strictEqual(result.value, 25); // Último valor
    });

    it('debe manejar array vacío', () => {
      const data = [];

      const result = forecastingService.calculateExponentialSmoothing(data, 0.3);

      assert.strictEqual(result.value, 0);
      assert.deepStrictEqual(result.series, []);
    });
  });

  describe('calculateLinearRegression', () => {
    it('debe calcular regresión lineal correctamente', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 },
        { quantity_sold: 20 },
        { quantity_sold: 25 },
        { quantity_sold: 30 }
      ];

      const result = forecastingService.calculateLinearRegression(data);

      assert.strictEqual(typeof result.slope, 'number');
      assert.strictEqual(result.slope, 5); // Incremento constante de 5
      assert.strictEqual(typeof result.intercept, 'number');
      assert.strictEqual(typeof result.r2, 'number');
      assert.strictEqual(result.r2, 1); // Correlación perfecta
      assert.strictEqual(typeof result.predict, 'function');
    });

    it('debe predecir valores futuros correctamente', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 20 },
        { quantity_sold: 30 },
        { quantity_sold: 40 }
      ];

      const result = forecastingService.calculateLinearRegression(data);
      const prediction = result.predict(4); // Siguiente punto

      assert.strictEqual(prediction, 50);
    });

    it('debe manejar datos con variabilidad', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 12 },
        { quantity_sold: 18 },
        { quantity_sold: 22 },
        { quantity_sold: 25 }
      ];

      const result = forecastingService.calculateLinearRegression(data);

      assert(result.slope > 0); // Tendencia positiva
      assert(result.r2 > 0.8); // Buena correlación pero no perfecta
      assert(result.r2 < 1);
    });

    it('debe manejar datos insuficientes', () => {
      const data = [{ quantity_sold: 10 }];

      const result = forecastingService.calculateLinearRegression(data);

      assert.strictEqual(result.slope, 0);
      assert.strictEqual(result.intercept, 0);
      assert.strictEqual(result.r2, 0);
    });
  });

  describe('detectSeasonality', () => {
    it('debe detectar estacionalidad semanal', () => {
      // Datos con patrón semanal claro (más ventas viernes y sábado)
      const data = [];
      for (let i = 0; i < 28; i++) { // 4 semanas
        const dayOfWeek = i % 7;
        const baseQuantity = dayOfWeek === 5 || dayOfWeek === 6 ? 50 : 20; // Viernes y sábado más altos
        data.push({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          quantity_sold: baseQuantity + Math.random() * 5
        });
      }

      const result = forecastingService.detectSeasonality(data);

      assert.strictEqual(result.hasSeasonality, true);
      assert.strictEqual(result.pattern, 'weekly');
      assert(result.peakDays.includes(5)); // Viernes
      assert(result.peakDays.includes(6)); // Sábado
      assert(result.coefficientOfVariation > 0.2);
    });

    it('debe detectar ausencia de estacionalidad', () => {
      // Datos sin patrón claro
      const data = [];
      for (let i = 0; i < 21; i++) {
        data.push({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          quantity_sold: 20 + Math.random() * 2 // Variación mínima
        });
      }

      const result = forecastingService.detectSeasonality(data);

      assert.strictEqual(result.hasSeasonality, false);
      assert(result.coefficientOfVariation < 0.2);
    });

    it('debe manejar datos insuficientes', () => {
      const data = [
        { date: '2024-01-01', quantity_sold: 10 },
        { date: '2024-01-02', quantity_sold: 15 }
      ];

      const result = forecastingService.detectSeasonality(data);

      assert.strictEqual(result.hasSeasonality, false);
      assert.strictEqual(result.pattern, null);
    });
  });

  describe('detectTrend', () => {
    it('debe detectar tendencia creciente', () => {
      const data = [
        { quantity_sold: 10 },
        { quantity_sold: 15 },
        { quantity_sold: 20 },
        { quantity_sold: 25 },
        { quantity_sold: 30 }
      ];

      const result = forecastingService.detectTrend(data);

      assert.strictEqual(result.direction, 'increasing');
      assert(result.slope > 0);
      assert.strictEqual(result.percentage, 200); // 300% incremento
    });

    it('debe detectar tendencia decreciente', () => {
      const data = [
        { quantity_sold: 30 },
        { quantity_sold: 25 },
        { quantity_sold: 20 },
        { quantity_sold: 15 },
        { quantity_sold: 10 }
      ];

      const result = forecastingService.detectTrend(data);

      assert.strictEqual(result.direction, 'decreasing');
      assert(result.slope < 0);
      assert(result.percentage < 0);
    });

    it('debe detectar tendencia estable', () => {
      const data = [
        { quantity_sold: 20 },
        { quantity_sold: 19 },
        { quantity_sold: 21 },
        { quantity_sold: 20 },
        { quantity_sold: 20 }
      ];

      const result = forecastingService.detectTrend(data);

      assert.strictEqual(result.direction, 'stable');
      assert(Math.abs(result.slope) < 0.1);
    });
  });

  describe('calculateConfidence', () => {
    it('debe calcular alta confianza con muchos datos y baja varianza', () => {
      const historicalData = [];
      for (let i = 0; i < 30; i++) {
        historicalData.push({ quantity_sold: 20 + Math.random() * 2 });
      }

      const predictions = [
        { predicted_quantity: 20 },
        { predicted_quantity: 21 },
        { predicted_quantity: 20 }
      ];

      const result = forecastingService.calculateConfidence(historicalData, predictions);

      assert.strictEqual(result.level, 'high');
      assert(result.score >= 0.85);
    });

    it('debe calcular confianza media con datos moderados', () => {
      const historicalData = [];
      for (let i = 0; i < 14; i++) {
        historicalData.push({ quantity_sold: 20 + Math.random() * 10 });
      }

      const predictions = [
        { predicted_quantity: 25 },
        { predicted_quantity: 22 },
        { predicted_quantity: 24 }
      ];

      const result = forecastingService.calculateConfidence(historicalData, predictions);

      assert(['medium', 'high'].includes(result.level));
      assert(result.score >= 0.5);
      assert(result.score < 1);
    });

    it('debe calcular baja confianza con pocos datos', () => {
      const historicalData = [
        { quantity_sold: 10 },
        { quantity_sold: 50 },
        { quantity_sold: 15 },
        { quantity_sold: 80 },
        { quantity_sold: 5 }
      ];

      const predictions = [
        { predicted_quantity: 30 }
      ];

      const result = forecastingService.calculateConfidence(historicalData, predictions);

      assert.strictEqual(result.level, 'low');
      assert(result.score < 0.7);
    });
  });

  describe('fillMissingDates', () => {
    it('debe rellenar fechas faltantes con ceros', () => {
      const data = [
        { date: '2024-01-01', quantity_sold: 10 },
        { date: '2024-01-03', quantity_sold: 20 },
        { date: '2024-01-05', quantity_sold: 30 }
      ];

      const filled = forecastingService.fillMissingDates(data, 7);

      assert.strictEqual(filled.length, 7);
      assert.strictEqual(filled[1].quantity_sold, 0); // 2024-01-02 faltante
      assert.strictEqual(filled[3].quantity_sold, 0); // 2024-01-04 faltante
    });
  });

  describe('calculateStandardDeviation', () => {
    it('debe calcular desviación estándar correctamente', () => {
      const values = [10, 20, 30, 40, 50];

      const result = forecastingService.calculateStandardDeviation(values);

      assert.strictEqual(Math.round(result * 100) / 100, 14.14);
    });

    it('debe manejar array con un solo valor', () => {
      const values = [25];

      const result = forecastingService.calculateStandardDeviation(values);

      assert.strictEqual(result, 0);
    });
  });

  describe('Integration Tests', () => {
    it('debe generar predicciones combinando múltiples algoritmos', async () => {
      const historicalData = [];
      for (let i = 0; i < 30; i++) {
        historicalData.push({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          quantity_sold: 20 + i * 0.5 + Math.random() * 5,
          num_transactions: 5 + Math.floor(Math.random() * 3),
          avg_price: 10 + Math.random()
        });
      }

      const movingAverage = forecastingService.calculateMovingAverage(historicalData, 7);
      const exponentialSmoothing = forecastingService.calculateExponentialSmoothing(historicalData);
      const linearRegression = forecastingService.calculateLinearRegression(historicalData);
      const seasonalPattern = forecastingService.detectSeasonality(historicalData);

      const predictions = forecastingService.generatePredictions({
        historicalData,
        movingAverage,
        exponentialSmoothing,
        linearRegression,
        seasonalPattern,
        daysAhead: 7
      });

      assert(Array.isArray(predictions));
      assert.strictEqual(predictions.length, 7);

      predictions.forEach(prediction => {
        assert(prediction.date);
        assert(prediction.dayOfWeek);
        assert(typeof prediction.predicted_quantity === 'number');
        assert(prediction.predicted_quantity >= 0);
        assert(prediction.confidence_interval);
        assert(prediction.confidence_interval.lower <= prediction.predicted_quantity);
        assert(prediction.confidence_interval.upper >= prediction.predicted_quantity);
      });
    });
  });

  describe('Performance Tests', () => {
    it('debe procesar grandes datasets eficientemente', () => {
      const largeDataset = [];
      for (let i = 0; i < 365; i++) { // Un año de datos
        largeDataset.push({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          quantity_sold: Math.floor(Math.random() * 100)
        });
      }

      const startTime = Date.now();

      forecastingService.calculateMovingAverage(largeDataset, 30);
      forecastingService.calculateExponentialSmoothing(largeDataset);
      forecastingService.calculateLinearRegression(largeDataset);
      forecastingService.detectSeasonality(largeDataset.slice(-90)); // Últimos 3 meses

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      assert(executionTime < 100, `Procesamiento tomó ${executionTime}ms, debería ser menor a 100ms`);
    });
  });
});

// Exportar para uso en otros tests
module.exports = { DemandForecastingService };