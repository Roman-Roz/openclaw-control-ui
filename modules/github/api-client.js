/**
 * 🚀 GitHub API Client
 * 
 * Универсальный клиент для работы с GitHub REST API
 */

const GITHUB_CONFIG = require('./config.js');
const fetch = require('node-fetch');

class GitHubAPIClient {
    constructor(token = null) {
        this.token = token || process.env.GITHUB_TOKEN;
        this.baseUrl = GITHUB_CONFIG.API_BASE;
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'OpenClaw-Cyberpunk-Panel/1.0.0',
            'X-GitHub-Api-Version': GITHUB_CONFIG.API_VERSION
        };
        
        if (this.token) {
            this.headers['Authorization'] = `token ${this.token}`;
        }
        
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }
    
    /**
     * Выполнение запроса к GitHub API
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
        
        // Проверка кэша
        if (GITHUB_CONFIG.CACHE.enabled && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < GITHUB_CONFIG.CACHE.ttl) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(url, {
                headers: this.headers,
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Сохранение в кэш
            if (GITHUB_CONFIG.CACHE.enabled) {
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                
                // Очистка старых записей
                if (this.cache.size > GITHUB_CONFIG.CACHE.maxSize) {
                    const oldestKey = this.cache.keys().next().value;
                    this.cache.delete(oldestKey);
                }
            }
            
            return data;
            
        } catch (error) {
            console.error(`GitHub API request failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Получение информации о пользователе
     */
    async getUser(username = null) {
        const endpoint = username ? `/users/${username}` : '/user';
        return this.request(endpoint);
    }
    
    /**
     * Получение репозиториев пользователя
     */
    async getUserRepos(username = null, options = {}) {
        const endpoint = username ? `/users/${username}/repos` : '/user/repos';
        const params = new URLSearchParams({
            sort: 'updated',
            direction: 'desc',
            per_page: options.per_page || 30,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`${endpoint}?${params}`);
    }
    
    /**
     * Получение информации о репозитории
     */
    async getRepo(owner, repo) {
        return this.request(`/repos/${owner}/${repo}`);
    }
    
    /**
     * Получение issues репозитория
     */
    async getRepoIssues(owner, repo, options = {}) {
        const params = new URLSearchParams({
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: options.per_page || 20,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/repos/${owner}/${repo}/issues?${params}`);
    }
    
    /**
     * Получение pull requests репозитория
     */
    async getRepoPRs(owner, repo, options = {}) {
        const params = new URLSearchParams({
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: options.per_page || 20,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/repos/${owner}/${repo}/pulls?${params}`);
    }
    
    /**
     * Получение workflow runs
     */
    async getWorkflowRuns(owner, repo, options = {}) {
        const params = new URLSearchParams({
            per_page: options.per_page || 10,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/repos/${owner}/${repo}/actions/runs?${params}`);
    }
    
    /**
     * Получение contributors репозитория
     */
    async getRepoContributors(owner, repo, options = {}) {
        const params = new URLSearchParams({
            per_page: options.per_page || 20,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/repos/${owner}/${repo}/contributors?${params}`);
    }
    
    /**
     * Получение языков программирования репозитория
     */
    async getRepoLanguages(owner, repo) {
        return this.request(`/repos/${owner}/${repo}/languages`);
    }
    
    /**
     * Получение rate limit
     */
    async getRateLimit() {
        return this.request('/rate_limit');
    }
    
    /**
     * Поиск репозиториев
     */
    async searchRepos(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            sort: 'stars',
            order: 'desc',
            per_page: options.per_page || 20,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/search/repositories?${params}`);
    }
    
    /**
     * Поиск issues
     */
    async searchIssues(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            sort: 'updated',
            order: 'desc',
            per_page: options.per_page || 20,
            page: options.page || 1,
            ...options
        });
        
        return this.request(`/search/issues?${params}`);
    }
    
    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        return this;
    }
    
    /**
     * Установка токена
     */
    setToken(token) {
        this.token = token;
        this.headers['Authorization'] = `token ${token}`;
        this.clearCache(); // Очищаем кэш при смене токена
        return this;
    }
}

// Экспорт клиента
module.exports = GitHubAPIClient;