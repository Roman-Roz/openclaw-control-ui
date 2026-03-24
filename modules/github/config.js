/**
 * 🚀 GitHub Integration Module - Конфигурация
 * 
 * Настройки для интеграции с GitHub API
 */

const GITHUB_CONFIG = {
    // Базовые настройки API
    API_BASE: 'https://api.github.com',
    API_VERSION: '2022-11-28',
    
    // Лимиты запросов
    RATE_LIMIT: {
        requests: 60,
        perMinutes: 60
    },
    
    // Настройки кэширования
    CACHE: {
        enabled: true,
        ttl: 300000, // 5 минут в миллисекундах
        maxSize: 100
    },
    
    // Настройки WebSocket
    WEBSOCKET: {
        enabled: true,
        reconnectDelay: 5000,
        heartbeatInterval: 30000
    },
    
    // Настройки UI
    UI: {
        theme: 'cyberpunk',
        refreshInterval: 30000, // 30 секунд
        animations: true,
        soundEffects: true
    },
    
    // Модули
    MODULES: {
        stats: {
            enabled: true,
            autoRefresh: true,
            refreshInterval: 60000 // 1 минута
        },
        issues: {
            enabled: true,
            notifications: true,
            pollInterval: 30000 // 30 секунд
        },
        actions: {
            enabled: true,
            monitorWorkflows: true,
            pollInterval: 45000 // 45 секунд
        },
        explorer: {
            enabled: true,
            cacheRepos: true,
            maxRepos: 100
        },
        codeReview: {
            enabled: true,
            aiAssistance: true,
            suggestions: true
        }
    }
};

// Экспорт конфигурации
module.exports = GITHUB_CONFIG;