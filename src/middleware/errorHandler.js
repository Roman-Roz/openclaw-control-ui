/**
 * @fileoverview Middleware для обработки ошибок
 * Централизованная обработка ошибок с логированием
 */

const logger = require('../utils/logger');

/**
 * Класс ошибки API
 */
class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware для обработки ошибок
 * Должен быть последним в цепочке middleware
 */
const errorHandler = (err, req, res, next) => {
  // Логирование ошибки
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Определение статуса
  const status = err.status || err.statusCode || 500;

  // Формирование ответа
  const response = {
    error: {
      status,
      message: err.isOperational ? err.message : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      requestId: req.id || Date.now().toString(36),
      path: req.originalUrl
    }
  };

  // Добавление деталей только в development
  if (process.env.NODE_ENV === 'development' && err.details) {
    response.error.details = err.details;
  }

  if (process.env.NODE_ENV === 'development' && !err.isOperational) {
    response.error.stack = err.stack;
  }

  res.status(status).json(response);
};

/**
 * Обработчик необработанных обещаний
 */
const handleUnhandledRejection = (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
};

/**
 * Обработчик необработанных исключений
 * Не вызывает process.exit для graceful shutdown
 */
const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack
  });
  
  // Попытка закрыть сервер корректно
  if (global.server) {
    global.server.close(() => {
      logger.info('Server closed after uncaught exception');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

module.exports = {
  errorHandler,
  ApiError,
  handleUnhandledRejection,
  handleUncaughtException
};
