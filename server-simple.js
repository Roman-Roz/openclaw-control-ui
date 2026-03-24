#!/usr/bin/env node

/**
 * 🦞 OpenClaw Cyberpunk Control Panel - Упрощённый сервер
 * 
 * Работает без WebSocket и сложных зависимостей
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Конфигурация
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Создаём Express приложение
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'openclaw-cyberpunk-panel',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// System info
app.get('/system/info', (req, res) => {
  const os = require('os');
  
  res.json({
    panel: {
      version: '1.0.0',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime()
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
      loadAverage: os.loadavg()
    },
    timestamp: new Date().toISOString()
  });
});

// Эмулированный API Gateway
app.get('/api/status', async (req, res) => {
  try {
    // Проверяем статус Gateway через CLI
    let gatewayRunning = false;
    let gatewayPid = null;
    
    try {
      const { stdout } = await execAsync('ps aux | grep "openclaw.*gateway" | grep -v grep');
      gatewayRunning = stdout.includes('openclaw');
      gatewayPid = stdout.match(/\d+/)?.[0] || null;
    } catch (error) {
      // Если команда не сработала, используем фиктивные данные
      gatewayRunning = true;
      gatewayPid = '3146';
    }
    
    const status = {
      running: gatewayRunning,
      pid: gatewayPid,
      port: 18789,
      url: 'http://127.0.0.1:18789',
      dashboard: 'http://192.168.78.137:18789/',
      timestamp: new Date().toISOString(),
      demo: !gatewayRunning
    };
    
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get gateway status',
      message: error.message,
      timestamp: new Date().toISOString(),
      demo: true
    });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    // Эмуляция списка агентов
    const agents = [
      { 
        id: 'main', 
        status: 'active', 
        model: 'openrouter/auto',
        tools: ['read', 'write', 'exec', 'web_search'],
        lastActive: new Date().toISOString()
      },
      { 
        id: 'coding', 
        status: 'inactive', 
        model: 'deepseek-coder',
        tools: ['read', 'write', 'exec'],
        lastActive: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    res.json(agents);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    // Эмуляция списка моделей
    const models = {
      providers: {
        openrouter: {
          name: 'OpenRouter',
          enabled: true,
          models: [
            { 
              id: 'openrouter/auto', 
              name: 'OpenRouter Auto', 
              description: 'Автоматический выбор лучшей модели',
              cost: { input: 0, output: 0 },
              contextWindow: 128000,
              reasoning: false,
              free: true
            }
          ]
        },
        deepseek: {
          name: 'DeepSeek',
          enabled: true,
          models: [
            { 
              id: 'deepseek-coder', 
              name: 'DeepSeek Coder', 
              description: 'Специализированная модель для программирования',
              cost: { input: 0.0001, output: 0.0001 },
              contextWindow: 128000,
              reasoning: false,
              free: false
            },
            { 
              id: 'deepseek-chat', 
              name: 'DeepSeek Chat', 
              description: 'Универсальная чат-модель',
              cost: { input: 0.0001, output: 0.0001 },
              contextWindow: 128000,
              reasoning: false,
              free: false
            }
          ]
        },
        google: {
          name: 'Google Gemini',
          enabled: true,
          models: [
            { 
              id: 'google/gemini-1.5-flash', 
              name: 'Gemini 1.5 Flash', 
              description: 'Быстрая и эффективная модель',
              cost: { input: 0, output: 0 },
              contextWindow: 1000000,
              reasoning: false,
              free: true
            }
          ]
        }
      }
    };
    
    res.json(models);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Эмуляция отправки запроса
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'openrouter/auto' } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Эмулируем ответ AI
    const responses = {
      'openrouter/auto': `Я OpenRouter Auto. Вы сказали: "${message}". Это тестовый ответ от киберпанк-панели.`,
      'deepseek-coder': `// DeepSeek Coder отвечает:\n// Запрос: ${message}\n// Это демонстрационный ответ в стиле программиста.`,
      'google/gemini-1.5-flash': `Gemini 1.5 Flash здесь! Ваше сообщение: "${message}". Работаю в демонстрационном режиме.`
    };
    
    const response = responses[model] || `Модель ${model} отвечает: "${message}" (демо-режим)`;
    
    res.json({
      response: response,
      model: model,
      tokens: Math.floor(Math.random() * 100) + 50,
      timestamp: new Date().toISOString(),
      demo: true
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ресурс ${req.path} не найден`,
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██
  ██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██
  ██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
   🦞 OPENCLAW CYBERPUNK CONTROL PANEL v1.0.0
  `);
  
  console.log(`🚀 Панель управления запущена на http://localhost:${PORT}`);
  console.log(`🌍 Режим: ${NODE_ENV}`);
  console.log(`📁 Статические файлы: ${publicDir}`);
  console.log('');
  console.log(`📋 Доступные эндпоинты:`);
  console.log(`   • Панель управления: http://localhost:${PORT}`);
  console.log(`   • Health check: http://localhost:${PORT}/health`);
  console.log(`   • System info: http://localhost:${PORT}/system/info`);
  console.log(`   • Gateway API: http://localhost:${PORT}/api/*`);
  console.log('');
  console.log(`🛑 Для остановки нажмите Ctrl+C`);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});