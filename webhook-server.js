/**
 * 🚀 Webhook Server для GitHub + OpenClaw интеграции
 * 
 * Принимает webhook от GitHub и отправляет уведомления через OpenClaw
 */

const express = require('express');
const { OpenClawIntegration } = require('../openclaw-integration');

// Конфигурация
const PORT = process.env.WEBHOOK_PORT || 3001;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Создание приложения
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация OpenClaw интеграции
const openclaw = new OpenClawIntegration({
    gatewayUrl: 'http://localhost:18789',
    token: process.env.OPENCLAW_TOKEN
});

/**
 * Верификация подписи GitHub webhook
 */
function verifyGitHubSignature(req, secret) {
    if (!secret) return true; // Пропускаем если секрет не настроен
    
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;
    
    // В реальном приложении нужно реализовать проверку подписи
    // Для демо просто возвращаем true
    return true;
}

/**
 * Обработка GitHub webhook
 */
app.post('/webhook/github', async (req, res) => {
    try {
        // Проверка подписи
        if (!verifyGitHubSignature(req, GITHUB_SECRET)) {
            console.warn('⚠️ Неверная подпись GitHub webhook');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const event = req.headers['x-github-event'];
        const payload = req.body;
        
        console.log(`📨 GitHub webhook received: ${event}`);
        
        // Обработка разных типов событий
        switch (event) {
            case 'issues':
                await handleIssueEvent(payload);
                break;
                
            case 'push':
                await handlePushEvent(payload);
                break;
                
            case 'pull_request':
                await handlePullRequestEvent(payload);
                break;
                
            case 'star':
                await handleStarEvent(payload);
                break;
                
            case 'fork':
                await handleForkEvent(payload);
                break;
                
            default:
                console.log(`ℹ️ Необработанное событие: ${event}`);
        }
        
        res.json({ status: 'processed', event });
        
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Обработка события issue
 */
async function handleIssueEvent(payload) {
    const { action, issue, repository } = payload;
    
    let emoji = '📝';
    let actionText = 'изменён';
    
    switch (action) {
        case 'opened':
            emoji = '🚨';
            actionText = 'открыт';
            break;
        case 'closed':
            emoji = '✅';
            actionText = 'закрыт';
            break;
        case 'reopened':
            emoji = '🔄';
            actionText = 'переоткрыт';
            break;
        case 'labeled':
            emoji = '🏷️';
            actionText = 'получил метку';
            break;
    }
    
    const message = `${emoji} ISSUE ${actionText.toUpperCase()} В ${repository.full_name}\n\n` +
                   `📝 ${issue.title}\n` +
                   `👤 Автор: ${issue.user.login}\n` +
                   `🔗 ${issue.html_url}\n` +
                   `📊 #${issue.number} | ${issue.state.toUpperCase()}`;
    
    await openclaw.sendMessage('telegram', '@username', message);
    
    console.log(`✅ Уведомление об issue отправлено: ${issue.title}`);
}

/**
 * Обработка события push
 */
async function handlePushEvent(payload) {
    const { ref, commits, repository, pusher } = payload;
    const branch = ref.replace('refs/heads/', '');
    
    const message = `🚀 PUSH В ${repository.full_name}\n\n` +
                   `🌿 Ветка: ${branch}\n` +
                   `👤 Автор: ${pusher.name}\n` +
                   `📦 Коммитов: ${commits.length}\n` +
                   `📝 Последний: ${commits[0]?.message || 'Нет сообщения'}`;
    
    await openclaw.sendMessage('telegram', '@username', message);
    
    console.log(`✅ Уведомление о push отправлено: ${branch}`);
}

/**
 * Обработка события pull request
 */
async function handlePullRequestEvent(payload) {
    const { action, pull_request, repository } = payload;
    
    let emoji = '📋';
    let actionText = 'изменён';
    
    switch (action) {
        case 'opened':
            emoji = '🎉';
            actionText = 'открыт';
            break;
        case 'closed':
            emoji = pull_request.merged ? '🎊' : '❌';
            actionText = pull_request.merged ? 'мержжен' : 'закрыт';
            break;
        case 'reopened':
            emoji = '🔄';
            actionText = 'переоткрыт';
            break;
    }
    
    const message = `${emoji} PULL REQUEST ${actionText.toUpperCase()} В ${repository.full_name}\n\n` +
                   `📝 ${pull_request.title}\n` +
                   `👤 Автор: ${pull_request.user.login}\n` +
                   `🔗 ${pull_request.html_url}\n` +
                   `📊 #${pull_request.number} | ${pull_request.state.toUpperCase()}`;
    
    await openclaw.sendMessage('telegram', '@username', message);
    
    console.log(`✅ Уведомление о PR отправлено: ${pull_request.title}`);
}

/**
 * Обработка события star
 */
async function handleStarEvent(payload) {
    const { action, repository } = payload;
    
    const message = action === 'created' 
        ? `⭐ НОВАЯ ЗВЕЗДА ДЛЯ ${repository.full_name}\n\n` +
          `🎉 Репозиторий получил звезду!\n` +
          `🔗 ${repository.html_url}`
        : `💔 ЗВЕЗДА УДАЛЕНА ИЗ ${repository.full_name}\n\n` +
          `😢 Кто-то убрал звезду\n` +
          `🔗 ${repository.html_url}`;
    
    await openclaw.sendMessage('telegram', '@username', message);
    
    console.log(`✅ Уведомление о star отправлено: ${repository.full_name}`);
}

/**
 * Обработка события fork
 */
async function handleForkEvent(payload) {
    const { forkee, repository } = payload;
    
    const message = `🍴 НОВЫЙ FORK ${repository.full_name}\n\n` +
                   `👤 Автор форка: ${forkee.owner.login}\n` +
                   `📁 Новый репозиторий: ${forkee.full_name}\n` +
                   `🔗 ${forkee.html_url}`;
    
    await openclaw.sendMessage('telegram', '@username', message);
    
    console.log(`✅ Уведомление о fork отправлено: ${forkee.full_name}`);
}

/**
 * Endpoint для ручной отправки тестового уведомления
 */
app.post('/test/notification', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        let message = '🔧 ТЕСТОВОЕ УВЕДОМЛЕНИЕ\n\n';
        
        switch (type) {
            case 'issue':
                message += `📝 Новый issue: ${data.title || 'Test Issue'}\n` +
                          `👤 Автор: ${data.author || 'test-user'}\n` +
                          `🔗 Ссылка: ${data.url || 'https://github.com/test'}`;
                break;
                
            case 'stats':
                message += `📊 GitHub статистика:\n` +
                          `📁 Репозитории: ${data.repos || 42}\n` +
                          `⭐ Звёзды: ${data.stars || 1250}\n` +
                          `🍴 Форки: ${data.forks || 320}`;
                break;
                
            default:
                message += `Тип: ${type}\n` +
                          `Данные: ${JSON.stringify(data, null, 2)}`;
        }
        
        await openclaw.sendMessage('telegram', '@username', message);
        
        res.json({
            success: true,
            message: 'Тестовое уведомление отправлено',
            data: { type, message }
        });
        
    } catch (error) {
        console.error('❌ Ошибка отправки тестового уведомления:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint для проверки здоровья
 */
app.get('/health', async (req, res) => {
    try {
        const gatewayHealth = await openclaw.checkHealth();
        
        res.json({
            status: 'ok',
            service: 'github-webhook-server',
            port: PORT,
            gateway: gatewayHealth,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * Запуск сервера
 */
app.listen(PORT, () => {
    console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██
  ██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██
  ██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
   🚀 GITHUB WEBHOOK SERVER
   🔗 ИНТЕГРАЦИЯ С OPENCLAW
  
🌐 Сервер запущен на порту: ${PORT}
📨 Webhook endpoint: http://localhost:${PORT}/webhook/github
🔧 Тестовый endpoint: http://localhost:${PORT}/test/notification
❤️  Health check: http://localhost:${PORT}/health

📋 Поддерживаемые события GitHub:
   • issues (открытие, закрытие, изменение)
   • push (коммиты в репозиторий)
   • pull_request (открытие, мерж, закрытие)
   • star (добавление/удаление звезды)
   • fork (создание форка)

🛑 Для остановки нажмите Ctrl+C
    `);
});

// Обработка graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка webhook сервера...');
    process.exit(0);
});

// Экспорт для тестирования
module.exports = {
    app,
    openclaw,
    handleIssueEvent,
    handlePushEvent,
    handlePullRequestEvent
};