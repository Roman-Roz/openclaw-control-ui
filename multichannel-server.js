/**
 * 🚀 Multichannel Server для России
 * 
 * Поддержка российских и международных каналов:
 * 1. VK (ВКонтакте)
 * 2. Яндекс.Мессенджер
 * 3. Email уведомления
 * 4. Discord
 * 5. WhatsApp (опционально)
 */

const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Конфигурация
const PORT = process.env.MULTI_PORT || 3003;
const CONFIG = {
    // VK API настройки
    vk: {
        enabled: process.env.VK_ENABLED === 'true',
        token: process.env.VK_TOKEN,
        groupId: process.env.VK_GROUP_ID,
        apiVersion: '5.199'
    },
    
    // Яндекс.Мессенджер (через Яндекс.Диалоги)
    yandex: {
        enabled: process.env.YANDEX_ENABLED === 'true',
        skillId: process.env.YANDEX_SKILL_ID,
        oauthToken: process.env.YANDEX_OAUTH_TOKEN
    },
    
    // Email настройки
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST || 'smtp.yandex.ru',
        smtpPort: process.env.SMTP_PORT || 465,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL || 'notifier@github-ai.ru'
    },
    
    // Discord настройки
    discord: {
        enabled: process.env.DISCORD_ENABLED === 'true',
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
    },
    
    // WhatsApp (через Green API или аналоги)
    whatsapp: {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        apiUrl: process.env.WHATSAPP_API_URL,
        apiToken: process.env.WHATSAPP_API_TOKEN,
        instanceId: process.env.WHATSAPP_INSTANCE_ID
    }
};

// Создание приложения
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Мультиканальный отправитель уведомлений
 */
class MultichannelNotifier {
    constructor(config) {
        this.config = config;
        
        // Инициализация email транспорта
        if (config.email.enabled && config.email.smtpUser && config.email.smtpPass) {
            this.emailTransporter = nodemailer.createTransport({
                host: config.email.smtpHost,
                port: config.email.smtpPort,
                secure: true,
                auth: {
                    user: config.email.smtpUser,
                    pass: config.email.smtpPass
                }
            });
        }
    }
    
    /**
     * Отправка уведомления во все включённые каналы
     */
    async sendNotification(message, options = {}) {
        const results = {
            vk: { success: false, error: null },
            yandex: { success: false, error: null },
            email: { success: false, error: null },
            discord: { success: false, error: null },
            whatsapp: { success: false, error: null }
        };
        
        // Отправка в VK
        if (this.config.vk.enabled && options.vkRecipients) {
            try {
                await this.sendToVK(message, options.vkRecipients, options.vkAttachments);
                results.vk.success = true;
            } catch (error) {
                results.vk.error = error.message;
            }
        }
        
        // Отправка в Яндекс.Мессенджер
        if (this.config.yandex.enabled && options.yandexUserId) {
            try {
                await this.sendToYandex(message, options.yandexUserId);
                results.yandex.success = true;
            } catch (error) {
                results.yandex.error = error.message;
            }
        }
        
        // Отправка Email
        if (this.config.email.enabled && options.emailRecipients) {
            try {
                await this.sendEmail(message, options.emailRecipients, options.emailSubject);
                results.email.success = true;
            } catch (error) {
                results.email.error = error.message;
            }
        }
        
        // Отправка в Discord
        if (this.config.discord.enabled) {
            try {
                await this.sendToDiscord(message, options.discordEmbed);
                results.discord.success = true;
            } catch (error) {
                results.discord.error = error.message;
            }
        }
        
        // Отправка в WhatsApp
        if (this.config.whatsapp.enabled && options.whatsappPhone) {
            try {
                await this.sendToWhatsApp(message, options.whatsappPhone);
                results.whatsapp.success = true;
            } catch (error) {
                results.whatsapp.error = error.message;
            }
        }
        
        return results;
    }
    
    /**
     * Отправка сообщения в VK
     */
    async sendToVK(message, recipients, attachments = []) {
        if (!this.config.vk.token || !this.config.vk.groupId) {
            throw new Error('VK token или groupId не настроены');
        }
        
        const params = {
            access_token: this.config.vk.token,
            v: this.config.vk.apiVersion,
            peer_id: recipients, // Можно использовать user_id, chat_id, или group_id
            message: message,
            random_id: Math.floor(Math.random() * 1000000)
        };
        
        if (attachments.length > 0) {
            params.attachment = attachments.join(',');
        }
        
        const response = await axios.post(
            'https://api.vk.com/method/messages.send',
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        if (response.data.error) {
            throw new Error(`VK API error: ${response.data.error.error_msg}`);
        }
        
        return response.data;
    }
    
    /**
     * Отправка сообщения в Яндекс.Мессенджер
     */
    async sendToYandex(message, userId) {
        if (!this.config.yandex.skillId || !this.config.yandex.oauthToken) {
            throw new Error('Yandex skillId или oauthToken не настроены');
        }
        
        const response = await axios.post(
            `https://dialogs.yandex.net/api/v1/skills/${this.config.yandex.skillId}/messages`,
            {
                user_id: userId,
                text: message
            },
            {
                headers: {
                    'Authorization': `OAuth ${this.config.yandex.oauthToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.status !== 200) {
            throw new Error(`Yandex API error: ${response.statusText}`);
        }
        
        return response.data;
    }
    
    /**
     * Отправка Email
     */
    async sendEmail(message, recipients, subject = 'Уведомление от GitHub Notifier') {
        if (!this.emailTransporter) {
            throw new Error('Email transporter не инициализирован');
        }
        
        const mailOptions = {
            from: this.config.email.fromEmail,
            to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
            subject: subject,
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
                        .ai-badge { background: #00ff9d; color: #000; padding: 2px 8px; border-radius: 3px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>🤖 GitHub Notifier Pro AI</h2>
                        </div>
                        <div class="content">
                            ${message.replace(/\n/g, '<br>')}
                            <p style="margin-top: 20px;">
                                <span class="ai-badge">AI АНАЛИЗ</span> Это сообщение было проанализировано искусственным интеллектом.
                            </p>
                        </div>
                        <div class="footer">
                            © 2026 GitHub Notifier Pro AI. Все права защищены.<br>
                            Вы получили это письмо, потому что подписаны на уведомления.
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        const info = await this.emailTransporter.sendMail(mailOptions);
        return info;
    }
    
    /**
     * Отправка сообщения в Discord
     */
    async sendToDiscord(message, embed = null) {
        if (!this.config.discord.webhookUrl) {
            throw new Error('Discord webhook URL не настроен');
        }
        
        const payload = {
            content: message.substring(0, 2000), // Discord limit
            username: 'GitHub AI Notifier',
            avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
        };
        
        if (embed) {
            payload.embeds = [embed];
        }
        
        const response = await axios.post(this.config.discord.webhookUrl, payload);
        
        if (response.status !== 204) {
            throw new Error(`Discord API error: ${response.statusText}`);
        }
        
        return response.data;
    }
    
    /**
     * Отправка сообщения в WhatsApp (через Green API)
     */
    async sendToWhatsApp(message, phoneNumber) {
        if (!this.config.whatsapp.apiUrl || !this.config.whatsapp.apiToken || !this.config.whatsapp.instanceId) {
            throw new Error('WhatsApp API credentials не настроены');
        }
        
        const response = await axios.post(
            `${this.config.whatsapp.apiUrl}/waInstance${this.config.whatsapp.instanceId}/sendMessage/${this.config.whatsapp.apiToken}`,
            {
                chatId: `${phoneNumber}@c.us`,
                message: message
            }
        );
        
        if (!response.data.idMessage) {
            throw new Error(`WhatsApp API error: ${JSON.stringify(response.data)}`);
        }
        
        return response.data;
    }
    
    /**
     * Генерация форматированного сообщения для GitHub события
     */
    formatGitHubMessage(event, payload) {
        let message = '';
        let subject = '';
        
        switch (event) {
            case 'issues':
                const { action, issue, repository } = payload;
                subject = `🚨 ${action === 'opened' ? 'Новый' : 'Изменён'} issue в ${repository.full_name}`;
                message = `${subject}\n\n` +
                         `📝 ${issue.title}\n` +
                         `👤 Автор: ${issue.user.login}\n` +
                         `🔗 ${issue.html_url}\n` +
                         `📊 #${issue.number} | ${issue.state.toUpperCase()}`;
                break;
                
            case 'pull_request':
                const { pull_request } = payload;
                subject = `🎉 ${payload.action === 'opened' ? 'Новый' : 'Изменён'} PR в ${payload.repository.full_name}`;
                message = `${subject}\n\n` +
                         `📝 ${pull_request.title}\n` +
                         `👤 Автор: ${pull_request.user.login}\n` +
                         `🔗 ${pull_request.html_url}\n` +
                         `📊 #${pull_request.number} | ${pull_request.state.toUpperCase()}`;
                break;
                
            case 'push':
                const { ref, commits, pusher } = payload;
                const branch = ref.replace('refs/heads/', '');
                subject = `🚀 Push в ${payload.repository.full_name}`;
                message = `${subject}\n\n` +
                         `🌿 Ветка: ${branch}\n` +
                         `👤 Автор: ${pusher.name}\n` +
                         `📦 Коммитов: ${commits.length}\n` +
                         `📝 Последний: ${commits[0]?.message || 'Нет сообщения'}`;
                break;
                
            default:
                subject = `📨 GitHub событие: ${event}`;
                message = `${subject}\n\n` +
                         `Репозиторий: ${payload.repository?.full_name || 'Неизвестно'}\n` +
                         `Действие: ${payload.action || 'Неизвестно'}`;
        }
        
        return { message, subject };
    }
}

// Инициализация мультиканального нотификатора
const notifier = new MultichannelNotifier(CONFIG);

/**
 * Обработка GitHub webhook
 */
app.post('/webhook/github/multi', async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const payload = req.body;
        
        console.log(`🌐 Multichannel webhook received: ${event}`);
        
        // Форматируем сообщение
        const { message, subject } = notifier.formatGitHubMessage(event, payload);
        
        // Получаем настройки каналов из базы данных или конфига
        // Здесь можно добавить логику для получения настроек пользователя
        const channelOptions = {
            // Пример: отправлять всем зарегистрированным пользователям
            emailRecipients: ['user@example.com'], // Заменить на реальные emails
            emailSubject: subject,
            discordEmbed: {
                title: subject,
                description: message,
                color: 0x00ff9d,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'GitHub Notifier Pro AI'
                }
            }
        };
        
        // Отправка во все каналы
        const results = await notifier.sendNotification(message, channelOptions);
        
        // Логирование результатов
        console.log('📊 Результаты отправки:', {
            event,
            repository: payload.repository?.full_name,
            channels: Object.keys(results).filter(ch => results[ch].success)
        });
        
        res.json({
            status: 'processed',
            event,
            channels: results,
            message: 'Уведомление отправлено во все настроенные каналы'
        });
        
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint для тестирования каналов
 */
app.post('/test/channels', async (req, res) => {
    try {
        const { channels, message, testData } = req.body;
        
        const testMessage = message || '🔧 Тестовое сообщение от GitHub Notifier Pro AI\n\nСистема мультиканальных уведомлений работает! 🚀';
        
        const results = {};
        
        // Тестируем каждый запрошенный канал
        if (channels.includes('email') && CONFIG.email.enabled) {
            try {
                await notifier.sendEmail(
                    testMessage,
                    testData?.email || 'test@example.com',
                    'Тестовое уведомление'
                );
                results.email = { success: true };
            } catch (error) {
                results.email = { success: false, error: error.message };
            }
        }
        
        if (channels.includes('discord') && CONFIG.discord.enabled) {
            try {
                await notifier.sendToDiscord(testMessage);
                results.discord = { success: true };
            } catch (error) {
                results.discord = { success: false, error: error.message };
            }
        }
        
        if (channels.includes('vk') && CONFIG.vk.enabled) {
            try {
                // Для теста нужен реальный VK ID
                if (testData?.vkUserId) {
                    await notifier.sendToVK(testMessage, testData.vkUserId);
                    results.vk = { success: true };
                } else {
                    results.vk = { success: false, error: 'Требуется vkUserId для теста' };
                }
            } catch (error) {
                results.vk = { success: false, error: error.message };
            }
        }
        
        res.json({
            success: true,
            message: 'Тестирование каналов завершено',
            results,
            config: {
                email_enabled: CONFIG.email.enabled,
                discord_enabled: CONFIG.discord.enabled,
                vk_enabled: CONFIG.vk.enabled,
