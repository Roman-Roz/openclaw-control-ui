/**
 * 🚀 GitHub Integration Main Module
 * 
 * Основной модуль для интеграции с GitHub API
 */

const GITHUB_CONFIG = require('./config.js');
const GitHubAPIClient = require('./api-client.js');
const GitHubStatsModule = require('./stats-module.js');
const GitHubIssuesModule = require('./issues-module.js');

class GitHubIntegration {
    constructor(options = {}) {
        this.config = { ...GITHUB_CONFIG, ...options };
        this.apiClient = null;
        this.modules = {
            stats: null,
            issues: null,
            actions: null,
            explorer: null,
            codeReview: null
        };
        this.initialized = false;
        this.eventListeners = new Map();
    }
    
    /**
     * Инициализация интеграции
     */
    async initialize(token = null) {
        try {
            console.log('🚀 Initializing GitHub integration...');
            
            // Инициализация API клиента
            this.apiClient = new GitHubAPIClient(token);
            
            // Проверка подключения
            await this.testConnection();
            
            // Инициализация модулей
            await this.initializeModules();
            
            this.initialized = true;
            console.log('✅ GitHub integration initialized successfully');
            
            return this;
            
        } catch (error) {
            console.error('❌ Failed to initialize GitHub integration:', error);
            throw error;
        }
    }
    
    /**
     * Проверка подключения к GitHub API
     */
    async testConnection() {
        try {
            const rateLimit = await this.apiClient.getRateLimit();
            const user = await this.apiClient.getUser();
            
            console.log(`🔗 Connected to GitHub as: ${user.login}`);
            console.log(`📊 Rate limit: ${rateLimit.resources.core.remaining}/${rateLimit.resources.core.limit}`);
            
            return {
                authenticated: !!user.login,
                user: user,
                rateLimit: rateLimit.resources.core
            };
            
        } catch (error) {
            console.error('❌ GitHub connection test failed:', error);
            throw new Error(`GitHub connection failed: ${error.message}`);
        }
    }
    
    /**
     * Инициализация модулей
     */
    async initializeModules() {
        // Stats module
        if (this.config.MODULES.stats.enabled) {
            this.modules.stats = new GitHubStatsModule(this.apiClient);
            await this.modules.stats.initialize();
            console.log('📊 Stats module initialized');
        }
        
        // Issues module
        if (this.config.MODULES.issues.enabled) {
            this.modules.issues = new GitHubIssuesModule(this.apiClient);
            await this.modules.issues.initialize();
            console.log('🔔 Issues module initialized');
        }
        
        // Actions module (будет реализован позже)
        if (this.config.MODULES.actions.enabled) {
            console.log('⚡ Actions module placeholder');
            // this.modules.actions = new GitHubActionsModule(this.apiClient);
        }
        
        // Explorer module (будет реализован позже)
        if (this.config.MODULES.explorer.enabled) {
            console.log('🔍 Explorer module placeholder');
            // this.modules.explorer = new GitHubExplorerModule(this.apiClient);
        }
        
        // Code Review module (будет реализован позже)
        if (this.config.MODULES.codeReview.enabled) {
            console.log('🤖 Code Review module placeholder');
            // this.modules.codeReview = new GitHubCodeReviewModule(this.apiClient);
        }
    }
    
    /**
     * Получение модуля по имени
     */
    getModule(moduleName) {
        if (!this.modules[moduleName]) {
            throw new Error(`Module "${moduleName}" is not enabled or not initialized`);
        }
        return this.modules[moduleName];
    }
    
    /**
     * Получение статистики
     */
    async getStats(username = null) {
        if (!this.modules.stats) {
            throw new Error('Stats module is not enabled');
        }
        
        return this.modules.stats.getStats();
    }
    
    /**
     * Отслеживание репозитория для issues
     */
    watchRepoForIssues(owner, repo, config = {}) {
        if (!this.modules.issues) {
            throw new Error('Issues module is not enabled');
        }
        
        return this.modules.issues.watchRepo(owner, repo, config);
    }
    
    /**
     * Подписка на события
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
        
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }
    
    /**
     * Генерация события
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            }
        }
    }
    
    /**
     * Получение информации о пользователе
     */
    async getUserInfo(username = null) {
        return this.apiClient.getUser(username);
    }
    
    /**
     * Поиск репозиториев
     */
    async searchRepos(query, options = {}) {
        return this.apiClient.searchRepos(query, options);
    }
    
    /**
     * Получение репозиториев пользователя
     */
    async getUserRepos(username = null, options = {}) {
        return this.apiClient.getUserRepos(username, options);
    }
    
    /**
     * Получение информации о репозитории
     */
    async getRepoInfo(owner, repo) {
        return this.apiClient.getRepo(owner, repo);
    }
    
    /**
     * Обновление токена
     */
    updateToken(token) {
        if (this.apiClient) {
            this.apiClient.setToken(token);
            
            // Переинициализация модулей с новым токеном
            this.reinitializeModules();
        }
        
        return this;
    }
    
    /**
     * Переинициализация модулей
     */
    async reinitializeModules() {
        // Остановка и очистка текущих модулей
        for (const [name, module] of Object.entries(this.modules)) {
            if (module && module.destroy) {
                module.destroy();
            }
            this.modules[name] = null;
        }
        
        // Инициализация модулей заново
        await this.initializeModules();
    }
    
    /**
     * Проверка, инициализирована ли интеграция
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Получение конфигурации
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Обновление конфигурации
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        // Остановка всех модулей
        for (const [name, module] of Object.entries(this.modules)) {
            if (module && module.destroy) {
                module.destroy();
            }
        }
        
        // Очистка слушателей событий
        this.eventListeners.clear();
        
        this.initialized = false;
        console.log('🛑 GitHub integration destroyed');
    }
    
    /**
     * Генерация отчёта о состоянии
     */
    async getStatusReport() {
        const report = {
            initialized: this.initialized,
            timestamp: new Date().toISOString(),
            modules: {},
            rateLimit: null,
            user: null
        };
        
        try {
            // Информация о пользователе
            if (this.apiClient) {
                const user = await this.apiClient.getUser();
                report.user = {
                    login: user.login,
                    name: user.name,
                    avatar: user.avatar_url
                };
                
                const rateLimit = await this.apiClient.getRateLimit();
                report.rateLimit = rateLimit.resources.core;
            }
            
            // Состояние модулей
            for (const [name, module] of Object.entries(this.modules)) {
                report.modules[name] = {
                    enabled: this.config.MODULES[name]?.enabled || false,
                    initialized: !!module,
                    status: module ? 'active' : 'inactive'
                };
            }
            
        } catch (error) {
            report.error = error.message;
        }
        
        return report;
    }
}

// Экспорт фабричной функции для создания инстансов
function createGitHubIntegration(options = {}) {
    return new GitHubIntegration(options);
}

// Экспорт классов для прямого использования
module.exports = {
    GitHubIntegration,
    createGitHubIntegration,
    GitHubAPIClient,
    GitHubStatsModule,
    GitHubIssuesModule,
    GITHUB_CONFIG
};