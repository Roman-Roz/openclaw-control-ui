/**
 * @fileoverview Главный сервер приложения
 * Модульная архитектура с разделением ответственности
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');

// Конфигурация
const config = require('./config');

// Middleware
const { limiter, contentTypeCheck, sanitizeInput } = require('./middleware/security');
const { errorHandler, handleUnhandledRejection, handleUncaughtException } = require('./middleware/errorHandler');

// Сервисы
const wsManager = require('./services/websocketService');
const gatewayService = require('./services/gatewayService');
const schedulerService = require('./services/schedulerService');
const cacheService = require('./services/cacheService');
const TaskQueueService = require('./services/taskQueueService').default;
const SessionMemoryService = require('./services/sessionMemoryService').default;
const StreamingService = require('./services/streamingService').default;
const MultiAgentOrchestrator = require('./services/orchestratorService').default;

// Логгер
const logger = require('./utils/logger');

// Маршруты
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const monitoringRoutes = require('./routes/monitoring');
const tasksRoutes = require('./routes/tasks').default;
const githubRoutes = require('./routes/github').default;
const sessionsRoutes = require('./routes/sessions').default;
const orchestratorRoutes = require('./routes/orchestrator').default;

// Создаём Express приложение
const app = express();

// ===== MIDDLEWARE =====

// Безопасность заголовков
app.use(helmet({
  contentSecurityPolicy: false, // Отключаем для разработки
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true
}));

// Парсинг JSON и URL-encoded данных
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(limiter);

// Проверка Content-Type и санитизация
app.use(contentTypeCheck);
app.use(sanitizeInput);

// HTTP логирование
if (config.nodeEnv === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ===== МАРШРУТЫ =====

// Auth маршруты (публичные и защищённые)
app.use('/api/auth', authRoutes.router);

// Monitoring маршруты (защищённые)
app.use('/api/monitoring', monitoringRoutes);

// API маршруты
app.use('/api', apiRoutes);

// Task Queue маршруты
app.use('/api', tasksRoutes);

// GitHub Integration маршруты
app.use('/api/github', githubRoutes);

// Session Management маршруты
const sessionService = new SessionMemoryService();
const streamingService = new StreamingService(gatewayService, sessionService);
app.use('/api/sessions', sessionsRoutes.initializeSessionRoutes(sessionService, streamingService));

// Multi-Agent Orchestrator маршруты
const orchestrator = new MultiAgentOrchestrator();
app.use('/api/orchestrator', orchestratorRoutes.initializeOrchestratorRoutes(orchestrator));

// Сохраняем сервисы в global для доступа из других модулей
global.taskQueueService = new TaskQueueService();
global.sessionService = sessionService;
global.streamingService = streamingService;
global.orchestrator = orchestrator;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'openclaw-cyberpunk-panel',
    version: '2.0.0',
    gateway: config.gatewayUrl,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// System info
app.get('/system/info', async (req, res, next) => {
  try {
    const gatewayStatus = await gatewayService.checkStatus();
    
    res.json({
      panel: {
        version: '2.0.0',
        nodeVersion: process.version,
        environment: config.nodeEnv,
        uptime: process.uptime()
      },
      gateway: gatewayStatus,
      system: {
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        cpus: require('os').cpus().length
      },
      websocket: wsManager.getStats()
    });
  } catch (error) {
    next(error);
  }
});

// WebSocket stats
app.get('/ws/stats', (req, res) => {
  res.json(wsManager.getStats());
});

// Статические файлы
const publicDir = config.paths.public;
app.use(express.static(publicDir, {
  maxAge: config.nodeEnv === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// SPA fallback - все GET запросы на index.html
app.get('*', (req, res) => {
  const filePath = path.join(publicDir, req.path);
  
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

// ===== ОБРАБОТКА ОШИБОК =====

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ресурс ${req.path} не найден`,
    timestamp: new Date().toISOString()
  });
});

// Глобальный обработчик ошибок
app.use(errorHandler);

// ===== ЗАПУСК СЕРВЕРА =====

let server;

function startServer() {
  return new Promise((resolve, reject) => {
    server = app.listen(config.port, '0.0.0.0', async () => {
      // Инициализация кэша
      await cacheService.connect();
      
      // Инициализация WebSocket
      wsManager.init(server);
      
      // Инициализация Streaming Service (Socket.IO)
      streamingService.initialize(server);
      
      // Запуск планировщика задач
      schedulerService.start();
      
      // Обработка WebSocket upgrade
      server.on('upgrade', (request, socket, head) => {
        wsManager.wss.handleUpgrade(request, socket, head, (ws) => {
          wsManager.wss.emit('connection', ws, request);
        });
      });
      
      // Сохраняем сервер в global для graceful shutdown
      global.server = server;
      
      logger.info('Server starting...', {
        port: config.port,
        env: config.nodeEnv,
        gateway: config.gatewayUrl
      });
      
      // Проверка Gateway
      const gatewayStatus = await gatewayService.checkStatus();
      
      console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██
  ██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██
  ██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
   🦞 OPENCLAW CYBERPUNK CONTROL PANEL v2.0.0
  `);
      
      console.log(`🚀 Панель управления запущена на http://localhost:${config.port}`);
      console.log(`🔗 Подключение к Gateway: ${config.gatewayUrl}`);
      console.log(`🌍 Режим: ${config.nodeEnv}`);
      console.log(`📁 Статические файлы: ${publicDir}`);
      console.log(`✅ Gateway доступен: ${gatewayStatus.available ? 'Да' : 'Нет'}`);
      console.log('');
      console.log('📋 Доступные эндпоинты:');
      console.log(`   • Панель управления: http://localhost:${config.port}`);
      console.log(`   • Health check: http://localhost:${config.port}/health`);
      console.log(`   • Auth API: http://localhost:${config.port}/api/auth/*`);
      console.log(`   • Monitoring API: http://localhost:${config.port}/api/monitoring/*`);
      console.log(`   • System info: http://localhost:${config.port}/system/info`);
      console.log(`   • WebSocket stats: http://localhost:${config.port}/ws/stats`);
      console.log(`   • Gateway API: http://localhost:${config.port}/api/*`);
      console.log(`   • Task Queue API: http://localhost:${config.port}/api/tasks/*`);
      console.log(`   • GitHub API: http://localhost:${config.port}/api/github/*`);
      console.log(`   • Sessions API: http://localhost:${config.port}/api/sessions/*`);
      console.log(`   • Orchestrator API: http://localhost:${config.port}/api/orchestrator/*`);
      console.log(`   • Dashboard: http://localhost:${config.port}/dashboard.html`);
      console.log(`   • WebSocket Streaming: ws://localhost:${config.port}`);
      console.log('');
      console.log('🔐 Демо пользователь: admin / admin123');
      console.log('');
      console.log('🛑 Для остановки нажмите Ctrl+C');
      
      resolve(server);
    });
    
    server.on('error', (error) => {
      logger.error('Server failed to start', { error: error.message });
      reject(error);
    });
  });
}

// ===== GRACEFUL SHUTDOWN =====

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Остановка планировщика
  schedulerService.stop();
  
  // Отключение Redis
  cacheService.disconnect();
  
  // Остановка очереди задач
  if (global.taskQueueService) {
    global.taskQueueService.close().catch(err => {
      logger.error('Error closing task queue service', err);
    });
  }
  
  // Отключение WebSocket
  wsManager.cleanup();
  
  // Остановка Streaming Service
  if (global.streamingService) {
    global.streamingService.shutdown();
  }
  
  // Остановка Orchestrator
  if (global.orchestrator) {
    global.orchestrator.shutdown();
  }
  
  if (server) {
    server.close(() => {
      logger.info('Server closed. Exiting process.');
      process.exit(0);
    });
    
    // Принудительное завершение через 10 секунд
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Обработка необработанных ошибок
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

// ===== ЭКСПОРТ =====

module.exports = { app, startServer };

// Запуск если файл выполнен напрямую
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}
