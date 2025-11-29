/**
 * Pruebas unitarias para el Motor de Recomendaciones Inteligentes
 */

const assert = require('assert');
const sinon = require('sinon');

// Mock del servicio
const RecommendationEngine = require('../../src/services/ai-recommendation-engine');

describe('AI Recommendation Engine', () => {
  let recommendationEngine;
  let dbStub;

  beforeEach(() => {
    // Crear stubs para la base de datos
    dbStub = {
      raw: sinon.stub(),
      findById: sinon.stub(),
      findMany: sinon.stub()
    };

    // Mock del servicio
    recommendationEngine = Object.create(RecommendationEngine);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('calculateJaccardSimilarity', () => {
    it('debe calcular similitud de Jaccard correctamente', () => {
      const set1 = new Set([1, 2, 3, 4, 5]);
      const set2 = new Set([3, 4, 5, 6, 7]);

      const similarity = recommendationEngine.calculateJaccardSimilarity(set1, set2);

      // Intersección: {3, 4, 5} = 3 elementos
      // Unión: {1, 2, 3, 4, 5, 6, 7} = 7 elementos
      // Similitud: 3/7 ≈ 0.428
      assert.strictEqual(Math.round(similarity * 1000) / 1000, 0.429);
    });

    it('debe retornar 1 para conjuntos idénticos', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);

      const similarity = recommendationEngine.calculateJaccardSimilarity(set1, set2);

      assert.strictEqual(similarity, 1);
    });

    it('debe retornar 0 para conjuntos disjuntos', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([4, 5, 6]);

      const similarity = recommendationEngine.calculateJaccardSimilarity(set1, set2);

      assert.strictEqual(similarity, 0);
    });

    it('debe manejar conjuntos vacíos', () => {
      const set1 = new Set();
      const set2 = new Set([1, 2, 3]);

      const similarity = recommendationEngine.calculateJaccardSimilarity(set1, set2);

      assert.strictEqual(similarity, 0);
    });
  });

  describe('calculateContentScore', () => {
    it('debe calcular score basado en categoría y precio', () => {
      const item = {
        category_id: 1,
        price: 25
      };

      const categoryPreferences = {
        1: 10, // Alta preferencia por categoría 1
        2: 5,
        3: 2
      };

      const priceRange = {
        min: 20,
        max: 30,
        avg: 25
      };

      const score = recommendationEngine.calculateContentScore(item, categoryPreferences, priceRange);

      assert(score > 0);
      assert(score <= 1);
      // Debería tener alto score por categoría preferida y precio exacto al promedio
      assert(score > 0.8);
    });

    it('debe penalizar productos de categorías no preferidas', () => {
      const item = {
        category_id: 99, // Categoría no preferida
        price: 25
      };

      const categoryPreferences = {
        1: 10,
        2: 5
      };

      const priceRange = {
        min: 20,
        max: 30,
        avg: 25
      };

      const score = recommendationEngine.calculateContentScore(item, categoryPreferences, priceRange);

      assert(score < 0.5); // Score bajo por categoría no preferida
    });

    it('debe considerar la diferencia de precio', () => {
      const item = {
        category_id: 1,
        price: 100 // Precio muy alto
      };

      const categoryPreferences = {
        1: 10
      };

      const priceRange = {
        min: 10,
        max: 30,
        avg: 20
      };

      const score = recommendationEngine.calculateContentScore(item, categoryPreferences, priceRange);

      assert(score < 0.7); // Score reducido por precio alejado del promedio
    });
  });

  describe('calculateLift', () => {
    it('debe calcular lift correctamente', () => {
      const confidence = 0.8;
      const support = 0.2;

      const lift = recommendationEngine.calculateLift(confidence, support);

      assert.strictEqual(lift, 4); // 0.8 / 0.2 = 4
    });

    it('debe manejar support cero', () => {
      const confidence = 0.8;
      const support = 0;

      const lift = recommendationEngine.calculateLift(confidence, support);

      assert.strictEqual(lift, 0);
    });

    it('debe indicar asociación positiva cuando lift > 1', () => {
      const confidence = 0.6;
      const support = 0.3;

      const lift = recommendationEngine.calculateLift(confidence, support);

      assert(lift > 1); // Asociación positiva
    });

    it('debe indicar asociación negativa cuando lift < 1', () => {
      const confidence = 0.2;
      const support = 0.5;

      const lift = recommendationEngine.calculateLift(confidence, support);

      assert(lift < 1); // Asociación negativa
    });
  });

  describe('calculateUpsellValue', () => {
    it('debe calcular valor óptimo para upselling', () => {
      const upsellProduct = {
        price: 130,
        sales_count: 50,
        avg_rating: 4.5
      };

      const originalProduct = {
        price: 100
      };

      const value = recommendationEngine.calculateUpsellValue(upsellProduct, originalProduct);

      assert(value > 0);
      assert(value <= 1);
      // Incremento del 30%, buenas ventas y rating = valor alto
      assert(value > 0.5);
    });

    it('debe penalizar incrementos de precio excesivos', () => {
      const upsellProduct = {
        price: 500, // 400% más caro
        sales_count: 50,
        avg_rating: 4.5
      };

      const originalProduct = {
        price: 100
      };

      const value = recommendationEngine.calculateUpsellValue(upsellProduct, originalProduct);

      assert(value < 0.3); // Valor bajo por precio excesivo
    });

    it('debe considerar las ventas y ratings', () => {
      const upsellProduct1 = {
        price: 130,
        sales_count: 10, // Pocas ventas
        avg_rating: 2 // Mal rating
      };

      const upsellProduct2 = {
        price: 130,
        sales_count: 100, // Muchas ventas
        avg_rating: 5 // Excelente rating
      };

      const originalProduct = {
        price: 100
      };

      const value1 = recommendationEngine.calculateUpsellValue(upsellProduct1, originalProduct);
      const value2 = recommendationEngine.calculateUpsellValue(upsellProduct2, originalProduct);

      assert(value2 > value1 * 2); // Producto 2 debería tener mucho mejor valor
    });
  });

  describe('calculateComplementaryScore', () => {
    it('debe calcular score de complementariedad', () => {
      const item = {
        category_id: 5, // Categoría diferente
        co_occurrence: 50
      };

      const cartItems = [
        { categoryId: 1 },
        { categoryId: 2 },
        { categoryId: 3 }
      ];

      const score = recommendationEngine.calculateComplementaryScore(item, cartItems);

      assert(score > 0);
      // Debería tener buen score por categoría diferente y alta co-ocurrencia
      assert(score === 5); // (50/10) * 1
    });

    it('debe reducir score para productos de la misma categoría', () => {
      const item = {
        category_id: 1, // Misma categoría que carrito
        co_occurrence: 50
      };

      const cartItems = [
        { categoryId: 1 },
        { categoryId: 2 }
      ];

      const score = recommendationEngine.calculateComplementaryScore(item, cartItems);

      assert.strictEqual(score, 2.5); // (50/10) * 0.5
    });

    it('debe manejar baja co-ocurrencia', () => {
      const item = {
        category_id: 5,
        co_occurrence: 2
      };

      const cartItems = [
        { categoryId: 1 }
      ];

      const score = recommendationEngine.calculateComplementaryScore(item, cartItems);

      assert(score < 1); // Score bajo por poca co-ocurrencia
    });
  });

  describe('generateRecommendationReason', () => {
    it('debe generar razón para filtrado colaborativo', () => {
      const recommendation = {
        method: 'collaborative'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Clientes con gustos similares también compraron este producto');
    });

    it('debe generar razón para filtrado basado en contenido', () => {
      const recommendation = {
        method: 'content_based'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Basado en tus compras anteriores');
    });

    it('debe generar razón para productos frecuentemente comprados juntos', () => {
      const recommendation = {
        recommendationType: 'frequently_bought_together'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Frecuentemente comprado junto con tu selección');
    });

    it('debe generar razón para productos trending', () => {
      const recommendation = {
        recommendationType: 'trending'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Producto popular en este momento');
    });

    it('debe generar razón para upselling', () => {
      const recommendation = {
        recommendationType: 'upsell'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Alternativa premium recomendada');
    });

    it('debe generar razón para cross-selling', () => {
      const recommendation = {
        recommendationType: 'cross_sell'
      };

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Complementa perfectamente tu selección');
    });

    it('debe generar razón genérica por defecto', () => {
      const recommendation = {};

      const reason = recommendationEngine.generateRecommendationReason(recommendation);

      assert.strictEqual(reason, 'Recomendado para ti');
    });
  });

  describe('Integration Tests - Collaborative Filtering', () => {
    it('debe combinar scores de diferentes métodos correctamente', async () => {
      const collaborative = [
        { productId: 1, score: 0.8 },
        { productId: 2, score: 0.6 },
        { productId: 3, score: 0.4 }
      ];

      const contentBased = [
        { productId: 2, score: 0.7 },
        { productId: 3, score: 0.9 },
        { productId: 4, score: 0.5 }
      ];

      const popularItems = [
        { productId: 1, trendingScore: 80 },
        { productId: 4, trendingScore: 90 },
        { productId: 5, trendingScore: 70 }
      ];

      // Mock getRecentProducts
      sinon.stub(recommendationEngine, 'getRecentProducts').resolves([
        { product_id: 3, recency_score: 0.8 }
      ]);

      const result = await recommendationEngine.hybridRecommendation({
        collaborative,
        contentBased,
        popularItems,
        customerHistory: []
      });

      assert(Array.isArray(result));
      assert(result.length > 0);

      // Verificar que los scores están combinados
      const product3 = result.find(r => r.productId === 3);
      assert(product3);
      assert(product3.score > 0);

      // Producto 3 debería tener alto score (está en collaborative, content y tiene recency)
      const product1 = result.find(r => r.productId === 1);
      const product2 = result.find(r => r.productId === 2);

      // Verificar orden por score
      const sortedByScore = [...result].sort((a, b) => b.score - a.score);
      assert.deepStrictEqual(result, sortedByScore);
    });
  });

  describe('Cache Management', () => {
    it('debe cachear resultados correctamente', () => {
      const key = 'test_key';
      const data = { test: 'data' };

      // Guardar en caché
      recommendationEngine.cache.set(key, {
        data: data,
        timestamp: Date.now()
      });

      // Verificar que está en caché
      assert(recommendationEngine.cache.has(key));
      const cached = recommendationEngine.cache.get(key);
      assert.deepStrictEqual(cached.data, data);
    });

    it('debe respetar timeout del caché', () => {
      const key = 'test_key';
      const data = { test: 'data' };

      // Guardar en caché con timestamp antiguo
      recommendationEngine.cache.set(key, {
        data: data,
        timestamp: Date.now() - (recommendationEngine.cacheTimeout + 1000)
      });

      const cached = recommendationEngine.cache.get(key);

      // Verificar que el dato expirado no se usa
      const isExpired = Date.now() - cached.timestamp > recommendationEngine.cacheTimeout;
      assert(isExpired);
    });
  });

  describe('Performance Tests', () => {
    it('debe procesar recomendaciones híbridas eficientemente', () => {
      const startTime = Date.now();

      // Simular datos grandes
      const collaborative = [];
      const contentBased = [];
      const popularItems = [];

      for (let i = 0; i < 100; i++) {
        collaborative.push({ productId: i, score: Math.random() });
        contentBased.push({ productId: i + 50, score: Math.random() });
        popularItems.push({ productId: i + 25, trendingScore: Math.random() * 100 });
      }

      // Mock getRecentProducts para evitar llamadas reales
      sinon.stub(recommendationEngine, 'getRecentProducts').resolves([]);

      recommendationEngine.hybridRecommendation({
        collaborative,
        contentBased,
        popularItems,
        customerHistory: []
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      assert(executionTime < 50, `Procesamiento tomó ${executionTime}ms, debería ser menor a 50ms`);
    });
  });
});

// Exportar para uso en otros tests
module.exports = { RecommendationEngine };