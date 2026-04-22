/**
 * @fileoverview Конфигурация приложения
 * Загружает переменные окружения и экспортирует настройки
 */

require('dotenv').config();

module.exports = {
  // Сервер
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Gateway
  gatewayUrl: process.env.GATEWAY_URL || 'http://127.0.0.1:18789',
  
  // API Keys
  openclawApiKey: process.env.OPENCLAW_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  
  // Логирование
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/app.log',
  
  // Безопасность
  sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000
  },
  
  // WebSocket
  wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 5000,
  
  // Звук
  soundEnabled: process.env.SOUND_ENABLED !== 'false',
  
  // Тема
  defaultTheme: process.env.DEFAULT_THEME || 'cyberpunk',
  
  // Пути
  paths: {
    public: __dirname + '/../public',
    logs: __dirname + '/../logs'
  }
};
