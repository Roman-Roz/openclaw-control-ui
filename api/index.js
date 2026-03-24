const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Основной маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API маршруты
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    project: 'openclaw-control-ui',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Обработка всех остальных маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Экспорт для Vercel
module.exports = app;