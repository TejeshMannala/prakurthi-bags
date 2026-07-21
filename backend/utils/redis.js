const { Redis } = require('@upstash/redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

let redis = null;
let enabled = false;
let warned = false;

const hasPlaceholderCreds = (url) => {
  if (!url) return false;
  return url.includes('YOUR_') || url.includes('your_');
};

if (REDIS_URL && REDIS_TOKEN) {
  if (hasPlaceholderCreds(REDIS_URL) || hasPlaceholderCreds(REDIS_TOKEN)) {
    logger.warn('Redis URL or Token contains placeholder credentials — caching disabled');
  } else {
    try {
      redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
      enabled = true;
      logger.debug('Redis connected — caching enabled');
    } catch (err) {
      if (!warned) {
        logger.warn('Redis unavailable: ' + (err.message || err) + ' — using MongoDB fallback');
        warned = true;
      }
      redis = null;
      enabled = false;
    }
  }
} else if (!warned) {
  logger.debug('Redis disabled — set REDIS_URL and REDIS_TOKEN to enable caching');
  warned = true;
}

const cache = {
  async get(key) {
    if (!enabled || !redis) return null;
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async set(key, data, ttl = 300) {
    if (!enabled || !redis) return;
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttl });
    } catch {
      // silently fail
    }
  },

  async del(pattern) {
    if (!enabled || !redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // silently fail
    }
  },

  async invalidateProductCache() {
    await this.del('products:*');
    await this.del('product:*');
    await this.del('categories*');
    await this.del('search:*');
    await this.del('featured*');
  },

  async invalidateCouponCache() {
    await this.del('coupons:*');
  },

  async invalidateCategories() {
    await this.del('categories*');
  },

  async invalidateContentCache() {
    await this.del('page:*');
    await this.del('banners*');
    await this.del('settings*');
    await this.del('testimonials*');
    await this.del('team*');
    await this.del('faqs*');
    await this.del('contact*');
  },

  generateKey(prefix, params) {
    const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k] ?? ''}`).join('&');
    return `${prefix}:${sorted}`;
  },

  isEnabled: () => enabled,
};

module.exports = { cache, redis };
