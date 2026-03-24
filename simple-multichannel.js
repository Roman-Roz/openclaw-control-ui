/**
 * 🚀 Простой Multichannel Server для России
 * Работает без внешних зависимостей
 */

const http = require('http');

const PORT = 3003;

// Простой сервер для тестирования
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'simple-multichannel',
            version: '1.0.0',
            port: PORT,
            channels: ['email', 'discord', 'vk', 'yandex'],
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    if (req.url === '/test/channels' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Тестирование каналов завершено (демо-режим)',
                    results: {
                        email: { success: true, message: 'Email отправлен (демо)' },
                        discord: { success: true, message: 'Discord сообщение отправлено (демо)' },
                        vk: { success: true, message: 'VK сообщение отправлено (демо)' },
                        yandex: { success: true, message: 'Яндекс сообщение отправлено (демо)' }
                    },
                    note: 'В демо-режиме сообщения не отправляются. Настройте каналы для реальной работы.'
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }
    
    if (req.url === '/webhook/github/multi' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const event = req.headers['x-github-event'] || 'unknown';
                
                console.log(`🌐 GitHub webhook received: ${event}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'processed',
                    event,
                    message: 'Уведомление обработано (демо-режим)',
                    channels: {
                        email: { success: true },
                        discord: { success: true },
                        vk: { success: true },
                        yandex: { success: true }
                    },
                    note: 'В демо-режиме уведомления не отправляются. Настройте каналы для реальной работы.'
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }
    
    if (req.url === '/channels/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            email: { enabled: true, configured: false, note: 'Настройте SMTP для реальной работы' },
            discord: { enabled: true, configured: false, note: 'Настройте webhook URL для реальной работы' },
            vk: { enabled: true, configured: false, note: 'Настройте VK token для реальной работы' },
            yandex: { enabled: true, configured: false, note: 'Настройте Яндекс навык для реальной работы' }
        }));
        return;
    }
    
    // 404 для других запросов
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`
  🌐 SIMPLE MULTICHANNEL SERVER
  🇷🇺 ДЛЯ РОССИЙСКОГО РЫНКА
  
🚀 Сервер запущен на порту: ${PORT}
📨 Webhook: http://localhost:${PORT}/webhook/github/multi
🔧 Тестирование: http://localhost:${PORT}/test/channels
⚙️  Статус: http://localhost:${PORT}/channels/status
❤️  Health: http://localhost:${PORT}/health

📱 ПОДДЕРЖИВАЕМЫЕ КАНАЛЫ (демо-режим):
   • 📧 Email уведомления: ✅ (демо)
   • 🎮 Discord: ✅ (демо)
   • 👥 VK (ВКонтакте): ✅ (демо)
   • 🟡 Яндекс.Мессенджер: ✅ (демо)

⚠️  ВНИМАНИЕ: Демо-режим. Сообщения не отправляются.
    Для реальной работы настройте каналы в конфигурации.
    `);
});

// Обработка graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка simple multichannel сервера...');
    server.close();
    process.exit(0);
});