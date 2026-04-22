const { createClient } = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 час по умолчанию
  }

  async connect() {
    if (this.client) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      this.client = createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
      logger.info('Redis client initialized');
      return this.client;
    } catch (error) {
      logger.warn(`Redis connection failed: ${error.message}. Running without cache.`);
      this.isConnected = false;
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const expireTime = ttl || this.defaultTTL;
      await this.client.setEx(key, expireTime, JSON.stringify(value));
      logger.debug(`Redis SET: ${key} (TTL: ${expireTime}s)`);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      logger.debug(`Redis DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async mget(keys) {
    if (!this.isConnected || !this.client) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logger.error(`Redis MGET error: ${error.message}`);
      return keys.map(() => null);
    }
  }

  async incr(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async hset(key, field, value) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis HSET error: ${error.message}`);
      return false;
    }
  }

  async hget(key, field) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error: ${error.message}`);
      return null;
    }
  }

  async hgetall(key) {
    if (!this.isConnected || !this.client) {
      return {};
    }

    try {
      const hash = await this.client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error(`Redis HGETALL error: ${error.message}`);
      return {};
    }
  }

  async lpush(key, value) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.lPush(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis LPUSH error: ${error.message}`);
      return false;
    }
  }

  async lrange(key, start, end) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const values = await this.client.lRange(key, start, end);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error(`Redis LRANGE error: ${error.message}`);
      return [];
    }
  }

  async sadd(key, member) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.sAdd(key, typeof member === 'string' ? member : JSON.stringify(member));
      return true;
    } catch (error) {
      logger.error(`Redis SADD error: ${error.message}`);
      return false;
    }
  }

  async smembers(key) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const members = await this.client.sMembers(key);
      return members.map(m => {
        try {
          return JSON.parse(m);
        } catch {
          return m;
        }
      });
    } catch (error) {
      logger.error(`Redis SMEMBERS error: ${error.message}`);
      return [];
    }
  }

  async keys(pattern) {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error: ${error.message}`);
      return [];
    }
  }

  async flushdb() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.warn('Redis database flushed');
      return true;
    } catch (error) {
      logger.error(`Redis FLUSHDB error: ${error.message}`);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    };
  }
}

module.exports = new CacheService();
