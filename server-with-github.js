#!/usr/bin/env node

/**
 * 🚀 OpenClaw Cyberpunk Control Panel with GitHub Integration
 * 
 * Полная версия с интеграцией GitHub API
 */

const express = require('express');
const path = require('path');
const { createGitHubServerAPI } = require('./modules/github/server-api.js');

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

// GitHub API интеграция
const githubAPI = createGitHubServerAPI({
    MODULES: {
        stats: { enabled: true },
        issues: { enabled: true },
        actions: { enabled: false },
        explorer: { enabled: false },
        codeReview: { enabled: false }
    }
});

app.use('/api/github', githubAPI.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'openclaw-cyberpunk-panel',
        version: '2.0.0',
        features: ['github-integration', 'cyberpunk-ui', 'real-time-updates'],
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// System info endpoint
app.get('/system/info', (req, res) => {
    const os = require('os');
    
    res.json({
        panel: {
            version: '2.0.0',
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
        github: {
            integrated: true,
            modules: ['stats', 'issues']
        },
        timestamp: new Date().toISOString()
    });
});

// Главная страница с GitHub интеграцией
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index-github.html'));
});

// Альтернативная страница без GitHub
app.get('/simple', (req, res) => {
    res.sendFile(path.join(publicDir, 'index-simple.html'));
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
   🦞 OPENCLAW CYBERPUNK CONTROL PANEL v2.0.0
   🚀 WITH GITHUB INTEGRATION
  `);
  
    console.log(`🚀 Панель управления запущена на http://localhost:${PORT}`);
    console.log(`🌍 Режим: ${NODE_ENV}`);
    console.log(`📁 Статические файлы: ${publicDir}`);
    console.log('');
    console.log(`📋 Доступные эндпоинты:`);
    console.log(`   • Панель управления: http://localhost:${PORT}`);
    console.log(`   • GitHub API: http://localhost:${PORT}/api/github`);
    console.log(`   • Health check: http://localhost:${PORT}/health`);
    console.log(`   • System info: http://localhost:${PORT}/system/info`);
    console.log(`   • Simple version: http://localhost:${PORT}/simple`);
    console.log('');
    console.log(`🔗 GitHub Integration:`);
    console.log(`   • Stats module: ${githubAPI.gitHub?.modules.stats ? '✅' : '❌'}`);
    console.log(`   • Issues module: ${githubAPI.gitHub?.modules.issues ? '✅' : '❌'}`);
    console.log('');
    console.log(`🛑 Для остановки нажмите Ctrl+C`);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка сервера...');
    
    // Очистка GitHub интеграции
    githubAPI.destroy();
    
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал завершения...');
    
    // Очистка GitHub интеграции
    githubAPI.destroy();
    
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

// WebSocket сервер для реального времени
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    
    // Отправка heartbeat
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'heartbeat',
                data: { timestamp: new Date().toISOString() }
            }));
        }
    }, 30000);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message:', data.type);
            
            // Обработка сообщений
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', data: { timestamp: new Date().toISOString() } }));
                    break;
                    
                case 'github:subscribe':
                    // Подписка на GitHub события
                    ws.send(JSON.stringify({
                        type: 'github:subscribed',
                        data: { channels: data.channels || ['stats', 'issues'] }
                    }));
                    break;
            }
            
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔗 WebSocket client disconnected');
        clearInterval(heartbeatInterval);
    });
    
    ws.on('error', (error) => {
        console.error('🔗 WebSocket error:', error);
    });
});

// Поднятие WebSocket сервера
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Экспорт для тестирования
module.exports = { app, server, githubAPI };