/**
 * Simple In-Memory Cache for Local Development
 * Replaces Redis for local-only deployment
 */

import { logger } from './logger.js';

// Simple in-memory cache implementation
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.isConnected = true;
  }

  async ping() {
    return 'PONG';
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  set(key, value, ttl = null) {
    this.cache.set(key, value);

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    if (ttl) {
      const timer = setTimeout(() => {
        this.del(key);
      }, ttl * 1000);
      this.timers.set(key, timer);
    }

    return true;
  }

  setEx(key, seconds, value) {
    return this.set(key, value, seconds);
  }

  del(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return 1;
  }

  exists(key) {
    return this.cache.has(key) ? 1 : 0;
  }

  expire(key, seconds) {
    if (this.cache.has(key)) {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      const timer = setTimeout(() => {
        this.del(key);
      }, seconds * 1000);
      this.timers.set(key, timer);
      return 1;
    }
    return 0;
  }

  ttl(key) {
    return this.timers.has(key) ? 300 : -1;
  }

  keys(pattern) {
    const allKeys = Array.from(this.cache.keys());
    if (pattern === '*') return allKeys;
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  incr(key) {
    const current = parseInt(this.get(key) || '0');
    this.set(key, (current + 1).toString());
    return current + 1;
  }

  // Hash operations
  hGet(hash, field) {
    const hashData = this.cache.get(hash) || {};
    return hashData[field] || null;
  }

  hSet(hash, field, value) {
    const hashData = this.cache.get(hash) || {};
    hashData[field] = value;
    this.cache.set(hash, hashData);
    return 1;
  }

  hGetAll(hash) {
    return this.cache.get(hash) || {};
  }

  // List operations
  lPush(key, value) {
    const list = this.cache.get(key) || [];
    list.unshift(value);
    this.cache.set(key, list);
    return list.length;
  }

  rPop(key) {
    const list = this.cache.get(key) || [];
    const value = list.pop();
    this.cache.set(key, list);
    return value || null;
  }

  flushAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
    return 'OK';
  }
}

const cacheInstance = new SimpleCache();

export const connectRedis = async () => {
  try {
    logger.info('Using in-memory cache (Redis replacement for local deployment)');
    return cacheInstance;
  } catch (error) {
    logger.error('Cache initialization failed:', error);
    throw error;
  }
};

export const getRedisClient = () => {
  return cacheInstance;
};

export const closeRedis = async () => {
  cacheInstance.flushAll();
  logger.info('Cache closed');
};

// Redis service class with helper methods
export class RedisService {
  constructor() {
    this.client = getRedisClient();
  }

  async isAvailable() {
    return this.client && this.client.isConnected;
  }

  // Basic operations
  async get(key) {
    if (!await this.isAvailable()) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = null) {
    if (!await this.isAvailable()) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!await this.isAvailable()) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!await this.isAvailable()) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async expire(key, seconds) {
    if (!await this.isAvailable()) return false;
    
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  // Hash operations
  async hget(hash, field) {
    if (!await this.isAvailable()) return null;
    
    try {
      const value = await this.client.hGet(hash, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis HGET error:', error);
      return null;
    }
  }

  async hset(hash, field, value) {
    if (!await this.isAvailable()) return false;
    
    try {
      await this.client.hSet(hash, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', error);
      return false;
    }
  }

  async hgetall(hash) {
    if (!await this.isAvailable()) return {};
    
    try {
      const data = await this.client.hGetAll(hash);
      const result = {};
      
      for (const [key, value] of Object.entries(data)) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      return {};
    }
  }

  // List operations
  async lpush(key, value) {
    if (!await this.isAvailable()) return false;
    
    try {
      await this.client.lPush(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      return false;
    }
  }

  async rpop(key) {
    if (!await this.isAvailable()) return null;
    
    try {
      const value = await this.client.rPop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis RPOP error:', error);
      return null;
    }
  }

  // Cache helper methods
  async cache(key, fetchFunction, expireInSeconds = 3600) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached) {
      return cached;
    }
    
    // If not in cache, fetch data
    try {
      const data = await fetchFunction();
      await this.set(key, data, expireInSeconds);
      return data;
    } catch (error) {
      logger.error('Cache fetch error:', error);
      throw error;
    }
  }

  async invalidatePattern(pattern) {
    if (!await this.isAvailable()) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis INVALIDATE PATTERN error:', error);
      return false;
    }
  }

  // Session management
  async setSession(sessionId, userData, expireInSeconds = 86400) {
    return await this.set(`session:${sessionId}`, userData, expireInSeconds);
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async rateLimitCheck(key, maxRequests = 100, windowInSeconds = 3600) {
    if (!await this.isAvailable()) return { allowed: true, remaining: maxRequests };
    
    try {
      const current = await this.client.get(key);
      const requests = current ? parseInt(current) : 0;
      
      if (requests >= maxRequests) {
        const ttl = await this.client.ttl(key);
        return { 
          allowed: false, 
          remaining: 0, 
          resetIn: ttl > 0 ? ttl : windowInSeconds 
        };
      }
      
      // Increment counter
      if (requests === 0) {
        await this.client.setEx(key, windowInSeconds, '1');
      } else {
        await this.client.incr(key);
      }
      
      return { 
        allowed: true, 
        remaining: maxRequests - requests - 1 
      };
      
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      return { allowed: true, remaining: maxRequests };
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

export default { connectRedis, getRedisClient, closeRedis, RedisService, redisService };