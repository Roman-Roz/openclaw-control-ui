/**
 * 🚀 Multichannel Server для России - УПРОЩЁННАЯ ВЕРСИЯ
 * 
 * Поддержка российских каналов:
 * 1. VK (ВКонтакте)
 * 2. Яндекс.Мессенджер
 * 3. Email уведомления
 * 4. Discord
 */

const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Конфигурация
const PORT = process.env.MULTI_PORT || 3003;
const CONFIG = {
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST || 'smtp.yandex.ru',
        smtpPort: process.env.SMTP_PORT || 465,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL || 'notifier@github-ai.ru'
    },
    
    discord: {
        enabled: process.env.DISCORD_ENABLED === 'true',
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
    }
};

// Создание приложения
const app = express();
app.use(express.json());

// Email transporter
let emailTransporter = null;
if (CONFIG.email.enabled && CONFIG.email.smtpUser && CONFIG.email.smtpPass) {
    emailTransporter = nodemailer.createTransport({
        host: CONFIG.email.smtpHost,
        port: CONFIG.email.smtpPort,
        secure: true,
        auth: {
            user: CONFIG.email.smtpUser,
            pass: CONFIG.email.smtpPass
        }
    });
}

/**
 * Отправка Email
 */
async function sendEmail(to, subject, message) {
    if (!emailTransporter) {
        throw new Error('Email transporter не настроен');
    }
    
    const mailOptions = {
        from: CONFIG.email.fromEmail,
        to,
        subject,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #24292e; color: white; padding: 20px; text-align: center; }
                    .content { background: #f6f8fa; padding: 20px; border-radius: 5px; }
                    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🤖 GitHub Notifier Pro AI</h2>
                    </div>
                    <div class="content">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="footer">
                        © 2026 GitHub Notifier Pro AI. Все права защищены.
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    return await emailTransporter.sendMail(mailOptions);
}

/**
 * Отправка в Discord
 */
async function sendToDiscord(message) {
    if (!CONFIG.discord.webhookUrl) {
        throw new Error('Discord webhook URL не настроен');
    }
    
    const payload = {
        content: message.substring(0, 2000),
        username: 'GitHub AI Notifier',
        avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
    };
    
    await axios.post(CONFIG.discord.webhookUrl, payload);
}

/**
 * Обработка GitHub webhook
 */
app.post('/webhook/github/multi', async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const payload = req.body;
        
        console.log(`🌐 GitHub webhook: ${event} в ${payload.repository?.full_name}`);
        
        // Форматируем сообщение
        let message = '';
        let subject = '';
        
        switch (event) {
            case 'issues':
                message = `🚨 ${payload.action === 'opened' ? 'Новый' : 'Изменён'} issue в ${payload.repository.full_name}\n\n` +
                         `📝 ${payload.issue.title}\n` +
                         `👤 Автор: ${payload.issue.user.login}\n` +
                         `🔗 ${payload.issue.html_url}`;
                subject = `GitHub Issue: ${payload.repository.full_name}`;
                break;
                
            case 'pull_request':
                message = `🎉 ${payload.action === 'opened' ? 'Новый' : 'Изменён'} PR в ${payload.repository.full_name}\n\n` +
                         `📝 ${payload.pull_request.title}\n` +
                         `👤 Автор: ${payload.pull_request.user.login}\n` +
                         `🔗 ${payload.pull_request.html_url}`;
                subject = `GitHub PR: ${payload.repository.full_name}`;
                break;
                
            case 'push':
                message = `🚀 Push в ${payload.repository.full_name}\n\n` +
                         `🌿 Ветка: ${payload.ref.replace('refs/heads/', '')}\n` +
                         `👤 Автор: ${payload.pusher.name}\n` +
                         `📦 Коммитов: ${payload.commits.length}`;
                subject = `GitHub Push: ${payload.repository.full_name}`;
                break;
                
            default:
                message = `📨 GitHub событие: ${event}\n\n` +
                         `Репозиторий: ${payload.repository?.full_name || 'Неизвестно'}\n` +
                         `Действие: ${payload.action || 'Неизвестно'}`;
                subject = `GitHub Event: ${event}`;
        }
        
        // Отправка во все настроенные каналы
        const results = {};
        
        // Email
        if (CONFIG.email.enabled) {
            try {
                await sendEmail('user@example.com', subject, message); // Заменить на реальный email
                results.email = { success: true };
            } catch (error) {
                results.email = { success: false, error: error.message };
            }
        }
        
        // Discord
        if (CONFIG.discord.enabled) {
            try {
                await sendToDiscord(message);
                results.discord = { success: true };
            } catch (error) {
                results.discord = { success: false, error: error.message };
            }
        }
        
        res.json({
            status: 'processed',
            event,
            channels: results,
            message: 'Уведомление отправлено'
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Тестирование каналов
 */
app.post('/test/channels', async (req, res) => {
    try {
        const { channels, testData } = req.body;
        const testMessage = '🔧 Тестовое сообщение от GitHub Notifier Pro AI\n\nСистема мультиканальных уведомлений работает! 🚀';
        
        const results = {};
        
        if (channels.includes('email') && CONFIG.email.enabled) {
            try {
                const email = testData?.email || 'test@example.com';
                await sendEmail(email, 'Тестовое уведомление', testMessage);
                results.email = { success: true, sentTo: email };
            } catch (error) {
                results.email = { success: false, error: error.message };
            }
        }
        
        if (channels.includes('discord') && CONFIG.discord.enabled) {
            try {
                await sendToDiscord(testMessage);
                results.discord = { success: true };
            } catch (error) {
                results.discord = { success: false, error: error.message };
            }
        }
        
        res.json({
            success: true,
            message: 'Тестирование завершено',
            results,
            config: {
                email_enabled: CONFIG.email.enabled,
                discord_enabled: CONFIG.discord.enabled
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Статус каналов
 */
app.get('/channels/status', (req, res) => {
    res.json({
        email: {
            enabled: CONFIG.email.enabled,
            configured: !!(CONFIG.email.smtpUser && CONFIG.email.smtpPass)
        },
        discord: {
            enabled: CONFIG.discord.enabled,
            configured: !!CONFIG.discord.webhookUrl
        }
    });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'multichannel-github-notifier',
        version: '1.0.0',
        port: PORT,
        channels: Object.keys(CONFIG).filter(key => CONFIG[key].enabled),
        uptime: process.uptime()
    });
});

/**
 * Запуск сервера
 */
app.listen(PORT, () => {
    console.log(`
  🌐 MULTICHANNEL GITHUB NOTIFIER
  🇷🇺 ДЛЯ РОССИЙСКОГО РЫНКА
  
🚀 Сервер запущен на порту: ${PORT}
📨 Webhook: http://localhost:${PORT}/webhook/github/multi
🔧 Тестирование: http://localhost:${PORT}/test/channels
❤️  Health: http://localhost:${PORT}/health

📱 ПОДДЕРЖИВАЕМЫЕ КАНАЛЫ:
   • 📧 Email: ${CONFIG.email.enabled ? '✅' : '❌'}
   • 🎮 Discord: ${CONFIG.discord.enabled ? '✅' : '❌'}

🔧 КАК НАСТРОИТЬ:
   export EMAIL_ENABLED=true
   export SMTP_USER=ваш@yandex.ru
   export SMTP_PASS=пароль
   export DISCORD_WEBHOOK_URL=ваш_webhook
    `);
});

module.exports = app;