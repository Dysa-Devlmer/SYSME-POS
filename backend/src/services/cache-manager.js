/**
 * Sistema Avanzado de Gestión de Caché con Redis
 * Optimiza el rendimiento de todos los servicios de IA/ML
 */

const redis = require('redis');
const { promisify } = require('util');
const logger = require('../config/logger');
const crypto = require('crypto');

class CacheManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.defaultTTL = 3600; // 1 hora por defecto
        this.namespace = 'sysme:';

        // Configuración de TTL por tipo de dato
        this.ttlConfig = {
            'ai:forecast': 1800,        // 30 minutos
            'ai:recommendations': 900,   // 15 minutos
            'ai:trending': 300,         // 5 minutos
            'ai:alerts': 60,            // 1 minuto
            'ai:dashboard': 120,        // 2 minutos
            'products': 3600,           // 1 hora
            'customers': 1800,          // 30 minutos
            'sales:analysis': 600,      // 10 minutos
            'inventory': 300,           // 5 minutos
            'reports': 7200            // 2 horas
        };

        // Estadísticas de caché
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            deletes: 0,
            errors: 0,
            startTime: Date.now()
        };

        // Configuración de estrategias
        this.strategies = {
            'LRU': this.lruStrategy.bind(this),
            'LFU': this.lfuStrategy.bind(this),
            'FIFO': this.fifoStrategy.bind(this),
            'TTL': this.ttlStrategy.bind(this)
        };

        this.currentStrategy = 'LRU';
    }

    /**
     * Inicializa la conexión con Redis
     */
    async initialize() {
        try {
            const redisConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 0,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        logger.error('Redis connection refused');
                        return new Error('Redis server refused connection');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            };

            this.client = redis.createClient(redisConfig);

            // Promisificar métodos de Redis
            this.getAsync = promisify(this.client.get).bind(this.client);
            this.setAsync = promisify(this.client.setex).bind(this.client);
            this.delAsync = promisify(this.client.del).bind(this.client);
            this.existsAsync = promisify(this.client.exists).bind(this.client);
            this.keysAsync = promisify(this.client.keys).bind(this.client);
            this.ttlAsync = promisify(this.client.ttl).bind(this.client);
            this.incrAsync = promisify(this.client.incr).bind(this.client);
            this.expireAsync = promisify(this.client.expire).bind(this.client);
            this.hgetAsync = promisify(this.client.hget).bind(this.client);
            this.hsetAsync = promisify(this.client.hset).bind(this.client);
            this.hgetallAsync = promisify(this.client.hgetall).bind(this.client);
            this.zaddAsync = promisify(this.client.zadd).bind(this.client);
            this.zrangeAsync = promisify(this.client.zrange).bind(this.client);
            this.zremAsync = promisify(this.client.zrem).bind(this.client);

            // Event handlers
            this.client.on('connect', () => {
                this.isConnected = true;
                logger.info('🔴 Redis Cache Manager conectado exitosamente');
            });

            this.client.on('error', (error) => {
                this.stats.errors++;
                logger.error('Redis Cache Manager error:', error);
            });

            this.client.on('end', () => {
                this.isConnected = false;
                logger.warn('Redis Cache Manager desconectado');
            });

            // Inicializar índices para estrategias
            await this.initializeIndexes();

            // Programar limpieza periódica
            this.scheduleCleanup();

            return true;
        } catch (error) {
            logger.error('Error inicializando Cache Manager:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Obtiene un valor del caché
     */
    async get(key, options = {}) {
        if (!this.isConnected) return null;

        try {
            const fullKey = this.buildKey(key);
            const startTime = Date.now();

            const value = await this.getAsync(fullKey);

            const duration = Date.now() - startTime;

            if (value) {
                this.stats.hits++;

                // Actualizar acceso para LRU/LFU
                await this.updateAccessMetadata(fullKey);

                logger.debug(`Cache HIT: ${key} (${duration}ms)`);

                // Parsear JSON si es necesario
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            } else {
                this.stats.misses++;
                logger.debug(`Cache MISS: ${key}`);
                return null;
            }
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error obteniendo del caché ${key}:`, error);
            return null;
        }
    }

    /**
     * Guarda un valor en el caché
     */
    async set(key, value, ttl = null) {
        if (!this.isConnected) return false;

        try {
            const fullKey = this.buildKey(key);
            const finalTTL = ttl || this.getTTLForKey(key) || this.defaultTTL;

            // Serializar el valor
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);

            // Verificar tamaño
            if (serialized.length > 1024 * 1024 * 10) { // 10MB límite
                logger.warn(`Valor muy grande para caché: ${key} (${serialized.length} bytes)`);
                return false;
            }

            await this.setAsync(fullKey, finalTTL, serialized);
            this.stats.writes++;

            // Actualizar metadatos
            await this.updateWriteMetadata(fullKey, serialized.length);

            logger.debug(`Cache SET: ${key} (TTL: ${finalTTL}s)`);
            return true;
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error guardando en caché ${key}:`, error);
            return false;
        }
    }

    /**
     * Elimina un valor del caché
     */
    async delete(key) {
        if (!this.isConnected) return false;

        try {
            const fullKey = this.buildKey(key);
            const result = await this.delAsync(fullKey);

            if (result > 0) {
                this.stats.deletes++;

                // Limpiar metadatos
                await this.cleanupMetadata(fullKey);

                logger.debug(`Cache DELETE: ${key}`);
                return true;
            }

            return false;
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error eliminando del caché ${key}:`, error);
            return false;
        }
    }

    /**
     * Invalida múltiples claves por patrón
     */
    async invalidatePattern(pattern) {
        if (!this.isConnected) return 0;

        try {
            const fullPattern = this.buildKey(pattern);
            const keys = await this.keysAsync(fullPattern);

            if (keys.length === 0) return 0;

            const pipeline = this.client.pipeline();
            keys.forEach(key => pipeline.del(key));

            await pipeline.exec();
            this.stats.deletes += keys.length;

            logger.info(`Cache INVALIDATE: ${keys.length} claves con patrón ${pattern}`);
            return keys.length;
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error invalidando patrón ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Obtiene o genera un valor (cache-aside pattern)
     */
    async getOrSet(key, generator, ttl = null) {
        // Intentar obtener del caché
        let value = await this.get(key);

        if (value !== null) {
            return value;
        }

        // Generar el valor
        try {
            value = await generator();

            if (value !== null && value !== undefined) {
                // Guardar en caché
                await this.set(key, value, ttl);
            }

            return value;
        } catch (error) {
            logger.error(`Error en getOrSet para ${key}:`, error);
            throw error;
        }
    }

    /**
     * Implementa cache warming (pre-carga de datos)
     */
    async warmup(keys) {
        const results = {
            success: 0,
            failed: 0,
            skipped: 0
        };

        for (const keyConfig of keys) {
            try {
                const exists = await this.existsAsync(this.buildKey(keyConfig.key));

                if (exists) {
                    results.skipped++;
                    continue;
                }

                if (keyConfig.generator) {
                    const value = await keyConfig.generator();
                    await this.set(keyConfig.key, value, keyConfig.ttl);
                    results.success++;
                }
            } catch (error) {
                results.failed++;
                logger.error(`Error en warmup para ${keyConfig.key}:`, error);
            }
        }

        logger.info(`Cache warmup completado:`, results);
        return results;
    }

    /**
     * Implementa cache stampede prevention
     */
    async getWithLock(key, generator, ttl = null, lockTimeout = 5000) {
        const lockKey = `lock:${key}`;
        const lockValue = crypto.randomBytes(16).toString('hex');

        try {
            // Intentar obtener del caché
            let value = await this.get(key);
            if (value !== null) return value;

            // Intentar adquirir lock
            const lockAcquired = await this.acquireLock(lockKey, lockValue, lockTimeout);

            if (!lockAcquired) {
                // Esperar y reintentar
                await this.sleep(100);
                value = await this.get(key);

                if (value !== null) return value;

                // Si aún no hay valor, esperar más
                await this.sleep(500);
                value = await this.get(key);

                if (value !== null) return value;

                throw new Error('No se pudo obtener el valor después de esperar el lock');
            }

            // Verificar nuevamente después de adquirir el lock
            value = await this.get(key);
            if (value !== null) {
                await this.releaseLock(lockKey, lockValue);
                return value;
            }

            // Generar el valor
            value = await generator();

            if (value !== null && value !== undefined) {
                await this.set(key, value, ttl);
            }

            // Liberar lock
            await this.releaseLock(lockKey, lockValue);

            return value;
        } catch (error) {
            logger.error(`Error en getWithLock para ${key}:`, error);

            // Intentar liberar lock en caso de error
            try {
                await this.releaseLock(lockKey, lockValue);
            } catch {}

            throw error;
        }
    }

    /**
     * Estrategia LRU (Least Recently Used)
     */
    async lruStrategy(key) {
        const score = Date.now();
        await this.zaddAsync('lru:access', score, key);

        // Mantener solo los N más recientes
        const maxSize = 10000;
        const count = await this.zrangeAsync('lru:access', 0, -1);

        if (count.length > maxSize) {
            const toRemove = count.slice(0, count.length - maxSize);
            for (const removeKey of toRemove) {
                await this.delete(removeKey);
                await this.zremAsync('lru:access', removeKey);
            }
        }
    }

    /**
     * Estrategia LFU (Least Frequently Used)
     */
    async lfuStrategy(key) {
        const currentScore = await this.zscoreAsync('lfu:frequency', key) || 0;
        await this.zaddAsync('lfu:frequency', currentScore + 1, key);
    }

    /**
     * Estrategia FIFO (First In First Out)
     */
    async fifoStrategy(key) {
        const score = Date.now();
        await this.zaddAsync('fifo:order', score, key);

        const maxSize = 10000;
        const count = await this.zrangeAsync('fifo:order', 0, -1);

        if (count.length > maxSize) {
            const toRemove = count[0];
            await this.delete(toRemove);
            await this.zremAsync('fifo:order', toRemove);
        }
    }

    /**
     * Estrategia TTL
     */
    async ttlStrategy(key) {
        // TTL ya manejado por Redis nativamente
        return true;
    }

    /**
     * Actualiza metadatos de acceso
     */
    async updateAccessMetadata(key) {
        if (this.currentStrategy && this.strategies[this.currentStrategy]) {
            await this.strategies[this.currentStrategy](key);
        }

        // Actualizar contador de accesos
        await this.hincrAsync('metadata:access_count', key, 1);
        await this.hsetAsync('metadata:last_access', key, Date.now());
    }

    /**
     * Actualiza metadatos de escritura
     */
    async updateWriteMetadata(key, size) {
        await this.hsetAsync('metadata:size', key, size);
        await this.hsetAsync('metadata:created', key, Date.now());
    }

    /**
     * Limpia metadatos
     */
    async cleanupMetadata(key) {
        await this.hdelAsync('metadata:access_count', key);
        await this.hdelAsync('metadata:last_access', key);
        await this.hdelAsync('metadata:size', key);
        await this.hdelAsync('metadata:created', key);
    }

    /**
     * Obtiene estadísticas del caché
     */
    getStats() {
        const uptime = Date.now() - this.stats.startTime;
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            uptime: Math.floor(uptime / 1000), // en segundos
            hitRate: `${hitRate}%`,
            totalRequests: total,
            isConnected: this.isConnected,
            strategy: this.currentStrategy
        };
    }

    /**
     * Resetea las estadísticas
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            deletes: 0,
            errors: 0,
            startTime: Date.now()
        };
    }

    /**
     * Obtiene información de memoria
     */
    async getMemoryInfo() {
        if (!this.isConnected) return null;

        try {
            const info = await new Promise((resolve, reject) => {
                this.client.info('memory', (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            // Parsear la información
            const lines = info.split('\r\n');
            const memoryInfo = {};

            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, value] = line.split(':');
                    memoryInfo[key] = value;
                }
            });

            return memoryInfo;
        } catch (error) {
            logger.error('Error obteniendo información de memoria:', error);
            return null;
        }
    }

    /**
     * Limpieza programada de caché
     */
    scheduleCleanup() {
        // Limpieza cada hora
        setInterval(async () => {
            try {
                logger.info('Iniciando limpieza de caché...');

                // Eliminar claves expiradas
                const pattern = this.buildKey('*');
                const keys = await this.keysAsync(pattern);
                let cleaned = 0;

                for (const key of keys) {
                    const ttl = await this.ttlAsync(key);
                    if (ttl === -2) { // Clave no existe
                        await this.cleanupMetadata(key);
                        cleaned++;
                    }
                }

                logger.info(`Limpieza completada: ${cleaned} claves limpiadas`);
            } catch (error) {
                logger.error('Error en limpieza de caché:', error);
            }
        }, 3600000); // 1 hora
    }

    /**
     * Construye la clave completa con namespace
     */
    buildKey(key) {
        if (key.startsWith(this.namespace)) {
            return key;
        }
        return `${this.namespace}${key}`;
    }

    /**
     * Obtiene el TTL configurado para una clave
     */
    getTTLForKey(key) {
        for (const [pattern, ttl] of Object.entries(this.ttlConfig)) {
            if (key.includes(pattern)) {
                return ttl;
            }
        }
        return this.defaultTTL;
    }

    /**
     * Adquiere un lock distribuido
     */
    async acquireLock(key, value, timeout) {
        const result = await this.client.set(
            this.buildKey(key),
            value,
            'NX',
            'PX',
            timeout
        );
        return result === 'OK';
    }

    /**
     * Libera un lock distribuido
     */
    async releaseLock(key, value) {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        return await new Promise((resolve, reject) => {
            this.client.eval(script, 1, this.buildKey(key), value, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    /**
     * Helper para dormir
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Inicializa índices para estrategias
     */
    async initializeIndexes() {
        // Crear índices si no existen
        await this.client.zadd('lru:access', 0, 'init');
        await this.client.zadd('lfu:frequency', 0, 'init');
        await this.client.zadd('fifo:order', 0, 'init');

        // Limpiar entradas de inicialización
        await this.client.zrem('lru:access', 'init');
        await this.client.zrem('lfu:frequency', 'init');
        await this.client.zrem('fifo:order', 'init');
    }

    /**
     * Helper para incrementar en hash
     */
    async hincrAsync(key, field, increment = 1) {
        return new Promise((resolve, reject) => {
            this.client.hincrby(key, field, increment, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    /**
     * Helper para eliminar de hash
     */
    async hdelAsync(key, field) {
        return new Promise((resolve, reject) => {
            this.client.hdel(key, field, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    /**
     * Helper para obtener score de sorted set
     */
    async zscoreAsync(key, member) {
        return new Promise((resolve, reject) => {
            this.client.zscore(key, member, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    /**
     * Cierra la conexión con Redis
     */
    async close() {
        if (this.client) {
            await new Promise((resolve) => {
                this.client.quit(() => {
                    this.isConnected = false;
                    logger.info('Cache Manager cerrado correctamente');
                    resolve();
                });
            });
        }
    }
}

// Singleton
module.exports = new CacheManager();