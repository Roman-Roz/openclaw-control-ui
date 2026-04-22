/**
 * @fileoverview Настройка логгера Winston
 * Логирование с ротацией файлов и разными уровнями
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Создаём директорию для логов если не существует
const logDir = path.dirname(config.paths.logs);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Формат сообщений
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Создание logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Консоль
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Файл для всех логов
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Файл для ошибок
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Stream для Morgan (HTTP логи)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
