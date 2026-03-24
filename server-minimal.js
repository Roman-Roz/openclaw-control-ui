#!/usr/bin/env node

/**
 * 🦞 OpenClaw Cyberpunk Control Panel - Минимальный сервер
 * 
 * Просто отдаёт статические файлы без ошибок
 */

const express = require('express');
const path = require('path');

// Конфигурация
const PORT = process.env.PORT || 3000;

// Создаём Express приложение
const app = express();

// Статические файлы
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Перенаправление на упрощённую версию
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index-simple.html'));
});

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
    console.log(`📁 Статические файлы: ${publicDir}`);
    console.log('');
    console.log(`📋 Доступные эндпоинты:`);
    console.log(`   • Панель управления: http://localhost:${PORT}`);
    console.log(`   • Health check: http://localhost:${PORT}/health`);
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