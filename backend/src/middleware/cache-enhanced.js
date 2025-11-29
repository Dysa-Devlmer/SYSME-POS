/**
 * Sistema de Cache Avanzado para Máximo Rendimiento
 * Cache multi-nivel con estrategias inteligentes y métricas
 */

import { redisService } from '../config/redis.js';
import { enhancedLogger } from '../config/logger-enhanced.js';

class EnhancedCacheMiddleware {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryEntries = 1000;
    this.defaultTTL = 300; // 5 minutos
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // Configuración de cache por tipo de recurso
    this.cacheConfig = {
      products: { ttl: 600, memory: true, redis: true },
      categories: { ttl: 1800, memory: true, redis: true },
      users: { ttl: 300, memory: false, redis: true },
      reports: { ttl: 60, memory: false, redis: true },
      metrics: { ttl: 30, memory: true, redis: false }
    };
  }

  /**
   * Middleware de cache inteligente
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      const startTime = Date.now();

      try {
        const cacheKey = this.generateCacheKey(req, options);
        const resourceType = this.detectResourceType(req.path);
        const config = this.cacheConfig[resourceType] || { ttl: this.defaultTTL, memory: true, redis: true };

        // Intentar obtener desde cache
        const cachedData = await this.get(cacheKey, config);

        if (cachedData) {
          this.cacheStats.hits++;
          const responseTime = Date.now() - startTime;

          enhancedLogger.logPerformance('Cache HIT', responseTime, {
            key: cacheKey,
            resourceType,
            source: cachedData.source || 'unknown'
          });

          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Source', cachedData.source || 'memory');

          return res.json(cachedData.data);
        }

        // Cache miss - continuar con la petición
        this.cacheStats.misses++;

        // Interceptar la respuesta para cachearla
        const originalJson = res.json;
        res.json = (data) => {
          const responseTime = Date.now() - startTime;

          // Cachear la respuesta si es exitosa
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(cacheKey, data, config.ttl, config)
              .catch(error => {
                enhancedLogger.error('Error caching response:', error);
                this.cacheStats.errors++;
              });
          }

          enhancedLogger.logPerformance('Cache MISS', responseTime, {
            key: cacheKey,
            resourceType,
            statusCode: res.statusCode
          });

          res.set('X-Cache', 'MISS');
          return originalJson.call(res, data);
        };

        next();

      } catch (error) {
        enhancedLogger.error('Cache middleware error:', error);
        this.cacheStats.errors++;
        next();
      }
    };
  }

  /**
   * Genera clave de cache única
   */
  generateCacheKey(req, options = {}) {
    const { prefix = 'api', includeQuery = true, includeAuth = false } = options;

    let key = `${prefix}:${req.method}:${req.path}`;

    if (includeQuery && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(k => `${k}=${req.query[k]}`)
        .join('&');
      key += `?${sortedQuery}`;
    }

    if (includeAuth && req.user) {
      key += `:user:${req.user.id}`;
    }

    return key;
  }

  /**
   * Detecta el tipo de recurso basado en la URL
   */
  detectResourceType(path) {
    if (path.includes('/products')) return 'products';
    if (path.includes('/categories')) return 'categories';
    if (path.includes('/users')) return 'users';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/metrics')) return 'metrics';
    return 'default';
  }

  /**
   * Obtiene valor del cache (multi-nivel)
   */
  async get(key, config = {}) {
    try {
      // Intentar memoria primero si está habilitado
      if (config.memory !== false) {
        const memoryData = this.memoryCache.get(key);
        if (memoryData && !this.isExpired(memoryData)) {
          return {
            data: memoryData.data,
            source: 'memory'
          };
        }
      }

      // Intentar Redis si está habilitado
      if (config.redis !== false) {
        const redisData = await redisService.get(key);
        if (redisData) {
          const parsedData = typeof redisData === 'string' ? JSON.parse(redisData) : redisData;

          // Copiar a memoria para próximas consultas
          if (config.memory !== false) {
            this.setMemoryCache(key, parsedData, config.ttl);
          }

          return {
            data: parsedData,
            source: 'redis'
          };
        }
      }

      return null;
    } catch (error) {
      enhancedLogger.error('Cache get error:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Establece valor en cache (multi-nivel)
   */
  async set(key, data, ttl = this.defaultTTL, config = {}) {
    try {
      this.cacheStats.sets++;

      // Guardar en memoria si está habilitado
      if (config.memory !== false) {
        this.setMemoryCache(key, data, ttl);
      }

      // Guardar en Redis si está habilitado
      if (config.redis !== false) {
        await redisService.set(key, JSON.stringify(data), ttl);
      }

    } catch (error) {
      enhancedLogger.error('Cache set error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Establece valor en cache de memoria
   */
  setMemoryCache(key, data, ttl) {
    // Limpiar cache si está lleno
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      this.cleanOldEntries();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000 // Convertir a ms
    });
  }

  /**
   * Verifica si una entrada ha expirado
   */
  isExpired(entry) {
    return (Date.now() - entry.timestamp) > entry.ttl;
  }

  /**
   * Limpia entradas antiguas del cache de memoria
   */
  cleanOldEntries() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Si aún está lleno, eliminar las más antiguas
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(0, Math.floor(this.maxMemoryEntries * 0.2));
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
      cleaned += toDelete.length;
    }

    if (cleaned > 0) {
      enhancedLogger.info(`Cache cleanup: ${cleaned} entries removed`);
    }
  }

  /**
   * Invalida cache por patrón
   */
  async invalidate(pattern) {
    try {
      this.cacheStats.deletes++;

      // Limpiar memoria
      const memoryKeys = Array.from(this.memoryCache.keys())
        .filter(key => key.includes(pattern));

      memoryKeys.forEach(key => this.memoryCache.delete(key));

      // Limpiar Redis (patrón básico)
      const redisKeys = await redisService.getKeysByPattern(pattern);
      if (redisKeys && redisKeys.length > 0) {
        await Promise.all(redisKeys.map(key => redisService.delete(key)));
      }

      enhancedLogger.info(`Cache invalidated: ${pattern} (${memoryKeys.length + (redisKeys?.length || 0)} keys)`);

    } catch (error) {
      enhancedLogger.error('Cache invalidation error:', error);
      this.cacheStats.errors++;
    }
  }

  /**
   * Invalida cache de un recurso específico
   */
  async invalidateResource(resourceType) {
    await this.invalidate(resourceType);
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryEntries: this.memoryCache.size,
      maxMemoryEntries: this.maxMemoryEntries,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Middleware para invalidación automática en modificaciones
   */
  invalidationMiddleware() {
    return (req, res, next) => {
      // Interceptar respuestas de modificación exitosas
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const originalJson = res.json;

        res.json = (data) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const resourceType = this.detectResourceType(req.path);
            this.invalidateResource(resourceType)
              .catch(error => enhancedLogger.error('Auto-invalidation error:', error));
          }
          return originalJson.call(res, data);
        };
      }

      next();
    };
  }

  /**
   * Warming del cache con datos críticos
   */
  async warmCache() {
    try {
      enhancedLogger.info('🔥 Iniciando cache warming...');

      // Aquí podrían cargarse datos críticos como categorías, productos principales, etc.
      // Por ahora solo loggeamos la intención

      enhancedLogger.info('✅ Cache warming completado');
    } catch (error) {
      enhancedLogger.error('Cache warming error:', error);
    }
  }
}

// Instancia global del cache mejorado
const enhancedCache = new EnhancedCacheMiddleware();

export { enhancedCache, EnhancedCacheMiddleware };
export default enhancedCache;