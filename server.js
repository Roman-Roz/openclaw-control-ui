#!/usr/bin/env node

/**
 * 🦞 OpenClaw Cyberpunk Control Panel - Сервер
 * 
 * Лёгкий Express-сервер с прокси к OpenClaw Gateway
 * и статическим хостингом киберпанк-интерфейса
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Конфигурация
const PORT = process.env.PORT || 3000;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:18789';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Создаём Express приложение
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов (только в development)
if (NODE_ENV === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Проверка доступности Gateway
async function checkGateway() {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${GATEWAY_URL}/status`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    console.warn(`⚠️  Gateway недоступен по адресу: ${GATEWAY_URL}`);
    console.warn(`   Ошибка: ${error.message}`);
    return false;
  }
}

// Эмуляция API Gateway через CLI команды
app.get('/api/status', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Получаем статус Gateway через CLI
    const { stdout } = await execAsync('openclaw gateway status --json 2>/dev/null || openclaw gateway status');
    
    // Парсим вывод
    const status = {
      running: stdout.includes('Runtime: running'),
      pid: stdout.match(/pid (\d+)/)?.[1] || null,
      port: 18789,
      url: 'http://127.0.0.1:18789',
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get gateway status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    // Эмуляция списка агентов
    res.json([
      { id: 'main', status: 'active', model: 'openrouter/auto' },
      { id: 'coding', status: 'inactive', model: 'deepseek-coder' }
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    // Эмуляция списка моделей
    res.json({
      providers: {
        openrouter: {
          models: [
            { id: 'openrouter/auto', name: 'OpenRouter Auto', cost: 0 }
          ]
        },
        deepseek: {
          models: [
            { id: 'deepseek-coder', name: 'DeepSeek Coder', cost: 0.0001 },
            { id: 'deepseek-chat', name: 'DeepSeek Chat', cost: 0.0001 }
          ]
        },
        google: {
          models: [
            { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash', cost: 0 }
          ]
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket эмуляция
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Отправляем фиктивные обновления
  const interval = setInterval(() => {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      data: { timestamp: new Date().toISOString() }
    }));
  }, 5000);
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
});


// Статические файлы
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
  maxAge: NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'openclaw-cyberpunk-panel',
    version: '1.0.0',
    gateway: GATEWAY_URL,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Информация о системе
app.get('/system/info', async (req, res) => {
  const gatewayAvailable = await checkGateway();
  
  res.json({
    panel: {
      version: '1.0.0',
      nodeVersion: process.version,
      environment: NODE_ENV,
      uptime: process.uptime()
    },
    gateway: {
      url: GATEWAY_URL,
      available: gatewayAvailable,
      lastCheck: new Date().toISOString()
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpus: require('os').cpus().length
    }
  });
});

// Все остальные GET запросы → index.html (SPA)
app.get('*', (req, res) => {
  // Проверяем, есть ли файл
  const filePath = path.join(publicDir, req.path);
  
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    // Если файл существует, отдаём его
    res.sendFile(filePath);
  } else {
    // Иначе отдаём index.html
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('🔥 Ошибка сервера:', err.stack);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Произошла внутренняя ошибка',
    timestamp: new Date().toISOString(),
    requestId: req.id || Date.now().toString(36)
  });
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ресурс ${req.path} не найден`,
    timestamp: new Date().toISOString()
  });
});

// WebSocket эмуляция

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Отправляем фиктивные обновления
  const interval = setInterval(() => {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      data: { timestamp: new Date().toISOString() }
    }));
  }, 5000);
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', async () => {
  // WebSocket upgrade handling
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
  // Поднимаем WebSocket сервер
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
  
  console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██
  ██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██
  ██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
   🦞 OPENCLAW CYBERPUNK CONTROL PANEL v1.0.0
  `);
  
  console.log(`🚀 Панель управления запущена на http://localhost:${PORT}`);
  console.log(`🔗 Подключение к Gateway: ${GATEWAY_URL}`);
  console.log(`🌍 Режим: ${NODE_ENV}`);
  console.log(`📁 Статические файлы: ${publicDir}`);
  console.log('');
  
  // Проверка Gateway
  const gatewayAvailable = await checkGateway();
  if (gatewayAvailable) {
    console.log('✅ Gateway доступен и готов к работе');
  } else {
    console.log('⚠️  Gateway недоступен. Убедитесь, что OpenClaw Gateway запущен.');
    console.log('   Команда для запуска: openclaw gateway start');
  }
  
  console.log('');
  console.log('📋 Доступные эндпоинты:');
  console.log(`   • Панель управления: http://localhost:${PORT}`);
  console.log(`   • Health check: http://localhost:${PORT}/health`);
  console.log(`   • System info: http://localhost:${PORT}/system/info`);
  console.log(`   • Gateway API: http://localhost:${PORT}/api/*`);
  console.log('');
  console.log('🛑 Для остановки нажмите Ctrl+C');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Получен SIGINT. Останавливаем сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен SIGTERM. Останавливаем сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('💥 Необработанная ошибка:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Необработанный rejection:', reason);
});

module.exports = app;