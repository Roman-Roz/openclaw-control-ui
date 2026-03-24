/**
 * 🚀 GitHub Integration Client
 * 
 * Клиент для работы с GitHub API из браузера
 */

class GitHubClient {
    constructor(options = {}) {
        this.config = {
            apiBase: options.apiBase || '/api/github',
            token: options.token || null,
            autoConnect: options.autoConnect !== false,
            reconnectDelay: options.reconnectDelay || 5000,
            ...options
        };
        
        this.token = this.config.token;
        this.ws = null;
        this.connected = false;
        this.eventListeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        if (this.config.autoConnect) {
            this.connect();
        }
    }
    
    /**
     * Подключение к API
     */
    async connect() {
        try {
            // Проверка доступности API
            const health = await this.request('GET', '/health');
            console.log('🚀 GitHub client connected:', health);
            
            this.connected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', health);
            
            // Подключение WebSocket если доступен
            this.connectWebSocket();
            
            return health;
            
        } catch (error) {
            console.error('❌ GitHub client connection failed:', error);
            this.connected = false;
            this.emit('error', error);
            
            // Попытка переподключения
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), this.config.reconnectDelay);
            }
            
            throw error;
        }
    }
    
    /**
     * Подключение WebSocket
     */
    connectWebSocket() {
        try {
            const wsUrl = this.config.apiBase.replace('http', 'ws') + '/ws';
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔗 GitHub WebSocket connected');
                this.emit('ws:connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit('ws:message', data);
                    
                    // Диспетчеризация специфичных событий
                    if (data.type) {
                        this.emit(`ws:${data.type}`, data.data);
                    }
                } catch (error) {
                    console.error('WebSocket message parse error:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔗 GitHub WebSocket disconnected');
                this.emit('ws:disconnected');
                
                // Попытка переподключения
                setTimeout(() => this.connectWebSocket(), this.config.reconnectDelay);
            };
            
            this.ws.onerror = (error) => {
                console.error('🔗 GitHub WebSocket error:', error);
                this.emit('ws:error', error);
            };
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    }
    
    /**
     * Выполнение запроса к API
     */
    async request(method, endpoint, data = null) {
        const url = `${this.config.apiBase}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.token) {
            headers['X-GitHub-Token'] = this.token;
        }
        
        const options = {
            method: method,
            headers: headers
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`GitHub API error ${response.status}: ${errorText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`GitHub API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }
    
    /**
     * Установка токена
     */
    setToken(token) {
        this.token = token;
        this.emit('token:updated', token);
        return this;
    }
    
    /**
     * Получение информации о пользователе
     */
    async getUser() {
        return this.request('GET', '/user');
    }
    
    /**
     * Получение репозиториев пользователя
     */
    async getUserRepos(options = {}) {
        const params = new URLSearchParams(options).toString();
        const endpoint = params ? `/user/repos?${params}` : '/user/repos';
        return this.request('GET', endpoint);
    }
    
    /**
     * Получение статистики
     */
    async getStats() {
        return this.request('GET', '/stats');
    }
    
    /**
     * Получение информации о репозитории
     */
    async getRepo(owner, repo) {
        return this.request('GET', `/repos/${owner}/${repo}`);
    }
    
    /**
     * Получение issues репозитория
     */
    async getRepoIssues(owner, repo, options = {}) {
        const params = new URLSearchParams(options).toString();
        const endpoint = `/repos/${owner}/${repo}/issues${params ? `?${params}` : ''}`;
        return this.request('GET', endpoint);
    }
    
    /**
     * Отслеживание репозитория для issues
     */
    async watchRepo(owner, repo, config = {}) {
        return this.request('POST', `/repos/${owner}/${repo}/watch`, config);
    }
    
    /**
     * Поиск репозиториев
     */
    async searchRepos(query, options = {}) {
        const params = new URLSearchParams({ q: query, ...options }).toString();
        return this.request('GET', `/search/repos?${params}`);
    }
    
    /**
     * Обновление токена
     */
    async updateToken(token) {
        const result = await this.request('POST', '/token', { token });
        this.setToken(token);
        return result;
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
     * Отправка сообщения через WebSocket
     */
    sendWebSocketMessage(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
            return true;
        }
        return false;
    }
    
    /**
     * Отключение
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.connected = false;
        this.emit('disconnected');
    }
    
    /**
     * Проверка подключения
     */
    isConnected() {
        return this.connected;
    }
}

// Создание глобального инстанса
window.GitHubClient = GitHubClient;

// Фабричная функция для создания клиентов
window.createGitHubClient = (options) => {
    return new GitHubClient(options);
};

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubClient;
}