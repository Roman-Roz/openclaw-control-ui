/**
 * @fileoverview Middleware для безопасности
 * Helmet, rate limiting, валидация
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter middleware
 * Ограничивает количество запросов с одного IP
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too Many Requests',
    message: 'Слишком много запросов. Попробуйте позже.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Строгий rate limiter для API
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 30, // 30 запросов в минуту
  message: {
    error: 'API Rate Limit Exceeded',
    message: 'Превышен лимит API запросов'
  }
});

/**
 * Лимит для WebSocket подключений
 */
const wsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 WS подключений в минуту
  message: 'Too many WebSocket connections'
});

/**
 * Middleware для проверки Content-Type
 */
const contentTypeCheck = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Invalid Content-Type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

/**
 * Middleware для очистки входных данных
 */
const sanitizeInput = (req, res, next) => {
  // Рекурсивная очистка объектов
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().slice(0, 10000); // Ограничение длины
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};

module.exports = {
  limiter,
  apiLimiter,
  wsLimiter,
  contentTypeCheck,
  sanitizeInput
};
