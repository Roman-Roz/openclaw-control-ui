/**
 * 🔔 GitHub Issues Notifier Module
 * 
 * Модуль для отслеживания и уведомлений о GitHub Issues
 */

const GITHUB_CONFIG = require('./config.js');

class GitHubIssuesModule {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.watchedRepos = new Map(); // owner/repo -> config
        this.issuesCache = new Map(); // owner/repo -> issues
        this.lastCheckTime = new Map(); // owner/repo -> timestamp
        this.subscribers = new Set();
        this.pollInterval = null;
        this.notificationHistory = new Map(); // issue_id -> last notified
    }
    
    /**
     * Инициализация модуля
     */
    async initialize() {
        // Запуск polling если включены уведомления
        if (GITHUB_CONFIG.MODULES.issues.notifications) {
            this.startPolling();
        }
        
        return this;
    }
    
    /**
     * Добавление репозитория для отслеживания
     */
    watchRepo(owner, repo, config = {}) {
        const repoKey = `${owner}/${repo}`;
        
        const defaultConfig = {
            notifyOn: {
                new: true,
                updates: true,
                comments: true,
                labels: ['bug', 'urgent', 'critical'],
                mentions: true
            },
            filters: {
                onlyAssigned: false,
                onlyParticipating: false,
                labels: [],
                states: ['open']
            },
            pollingInterval: GITHUB_CONFIG.MODULES.issues.pollInterval
        };
        
        this.watchedRepos.set(repoKey, {
            ...defaultConfig,
            ...config,
            owner,
            repo
        });
        
        console.log(`📡 Started watching repo: ${repoKey}`);
        return this;
    }
    
    /**
     * Удаление репозитория из отслеживания
     */
    unwatchRepo(owner, repo) {
        const repoKey = `${owner}/${repo}`;
        this.watchedRepos.delete(repoKey);
        this.issuesCache.delete(repoKey);
        this.lastCheckTime.delete(repoKey);
        console.log(`📡 Stopped watching repo: ${repoKey}`);
        return this;
    }
    
    /**
     * Получение issues для репозитория
     */
    async getRepoIssues(owner, repo, options = {}) {
        const repoKey = `${owner}/${repo}`;
        
        try {
            const issues = await this.apiClient.getRepoIssues(owner, repo, options);
            this.issuesCache.set(repoKey, issues);
            this.lastCheckTime.set(repoKey, Date.now());
            
            return issues;
            
        } catch (error) {
            console.error(`Failed to get issues for ${repoKey}:`, error);
            throw error;
        }
    }
    
    /**
     * Проверка новых issues
     */
    async checkForNewIssues() {
        const newIssues = [];
        const updatedIssues = [];
        
        for (const [repoKey, config] of this.watchedRepos) {
            try {
                const [owner, repo] = repoKey.split('/');
                const oldIssues = this.issuesCache.get(repoKey) || [];
                const newIssuesData = await this.getRepoIssues(owner, repo, {
                    per_page: 20,
                    state: 'all'
                });
                
                // Поиск новых issues
                for (const issue of newIssuesData) {
                    const oldIssue = oldIssues.find(i => i.id === issue.id);
                    
                    if (!oldIssue) {
                        // Новая issue
                        if (this.shouldNotify(issue, config, 'new')) {
                            newIssues.push({
                                repo: repoKey,
                                issue: issue,
                                type: 'new',
                                timestamp: new Date()
                            });
                        }
                    } else if (this.isIssueUpdated(oldIssue, issue)) {
                        // Обновлённая issue
                        if (this.shouldNotify(issue, config, 'updates')) {
                            updatedIssues.push({
                                repo: repoKey,
                                issue: issue,
                                oldIssue: oldIssue,
                                type: 'update',
                                timestamp: new Date()
                            });
                        }
                    }
                }
                
            } catch (error) {
                console.error(`Error checking issues for ${repoKey}:`, error);
            }
        }
        
        // Уведомление подписчиков
        if (newIssues.length > 0 || updatedIssues.length > 0) {
            this.notifySubscribers({
                newIssues,
                updatedIssues,
                timestamp: new Date()
            });
            
            // Сохранение в историю уведомлений
            this.updateNotificationHistory(newIssues, updatedIssues);
        }
        
        return { newIssues, updatedIssues };
    }
    
    /**
     * Проверка, нужно ли уведомлять об issue
     */
    shouldNotify(issue, config, eventType) {
        const repoConfig = config.notifyOn;
        
        // Проверка типа события
        if (!repoConfig[eventType]) {
            return false;
        }
        
        // Проверка labels
        if (repoConfig.labels && repoConfig.labels.length > 0) {
            const issueLabels = issue.labels.map(l => l.name.toLowerCase());
            const configLabels = repoConfig.labels.map(l => l.toLowerCase());
            
            if (!issueLabels.some(label => configLabels.includes(label))) {
                return false;
            }
        }
        
        // Проверка filters
        const filters = config.filters;
        
        if (filters.onlyAssigned && (!issue.assignee || issue.assignee.length === 0)) {
            return false;
        }
        
        if (filters.onlyParticipating && !issue.participating) {
            return false;
        }
        
        if (filters.labels && filters.labels.length > 0) {
            const issueLabels = issue.labels.map(l => l.name.toLowerCase());
            const filterLabels = filters.labels.map(l => l.toLowerCase());
            
            if (!issueLabels.some(label => filterLabels.includes(label))) {
                return false;
            }
        }
        
        if (filters.states && filters.states.length > 0) {
            if (!filters.states.includes(issue.state)) {
                return false;
            }
        }
        
        // Проверка дубликатов уведомлений
        const lastNotified = this.notificationHistory.get(issue.id);
        if (lastNotified && Date.now() - lastNotified < 300000) { // 5 минут
            return false;
        }
        
        return true;
    }
    
    /**
     * Проверка, обновлена ли issue
     */
    isIssueUpdated(oldIssue, newIssue) {
        return (
            oldIssue.updated_at !== newIssue.updated_at ||
            oldIssue.state !== newIssue.state ||
            oldIssue.comments !== newIssue.comments ||
            JSON.stringify(oldIssue.labels) !== JSON.stringify(newIssue.labels) ||
            JSON.stringify(oldIssue.assignees) !== JSON.stringify(newIssue.assignees)
        );
    }
    
    /**
     * Получение issue по номеру
     */
    async getIssue(owner, repo, issueNumber) {
        try {
            return await this.apiClient.request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
        } catch (error) {
            console.error(`Failed to get issue ${owner}/${repo}#${issueNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Создание новой issue
     */
    async createIssue(owner, repo, issueData) {
        try {
            return await this.apiClient.request(`/repos/${owner}/${repo}/issues`, {
                method: 'POST',
                body: JSON.stringify(issueData)
            });
        } catch (error) {
            console.error(`Failed to create issue in ${owner}/${repo}:`, error);
            throw error;
        }
    }
    
    /**
     * Обновление issue
     */
    async updateIssue(owner, repo, issueNumber, updateData) {
        try {
            return await this.apiClient.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error(`Failed to update issue ${owner}/${repo}#${issueNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Добавление комментария к issue
     */
    async addComment(owner, repo, issueNumber, comment) {
        try {
            return await this.apiClient.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body: comment })
            });
        } catch (error) {
            console.error(`Failed to add comment to issue ${owner}/${repo}#${issueNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Поиск issues
     */
    async searchIssues(query, options = {}) {
        try {
            return await this.apiClient.searchIssues(query, options);
        } catch (error) {
            console.error('Failed to search issues:', error);
            throw error;
        }
    }
    
    /**
     * Получение issue activity
     */
    async getIssueActivity(owner, repo, issueNumber) {
        try {
            const [issue, comments, events] = await Promise.all([
                this.getIssue(owner, repo, issueNumber),
                this.apiClient.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`),
                this.apiClient.request(`/repos/${owner}/${repo}/issues/${issueNumber}/events`)
            ]);
            
            return {
                issue,
                comments,
                events,
                timeline: this.buildIssueTimeline(issue, comments, events)
            };
            
        } catch (error) {
            console.error(`Failed to get issue activity for ${owner}/${repo}#${issueNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Построение timeline issue
     */
    buildIssueTimeline(issue, comments, events) {
        const timeline = [];
        
        // Создание issue
        timeline.push({
            type: 'created',
            actor: issue.user,
            timestamp: issue.created_at,
            data: { title: issue.title }
        });
        
        // Events
        for (const event of events) {
            timeline.push({
                type: event.event,
                actor: event.actor,
                timestamp: event.created_at,
                data: event
            });
        }
        
        // Комментарии
        for (const comment of comments) {
            timeline.push({
                type: 'comment',
                actor: comment.user,
                timestamp: comment.created_at,
                data: { body: comment.body }
            });
        }
        
        // Сортировка по времени
        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return timeline;
    }
    
    /**
     * Обновление истории уведомлений
     */
    updateNotificationHistory(newIssues, updatedIssues) {
        const now = Date.now();
        
        for (const notification of [...newIssues, ...updatedIssues]) {
            this.notificationHistory.set(notification.issue.id, now);
        }
        
        // Очистка старых записей (старше 24 часов)
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        for (const [issueId, timestamp] of this.notificationHistory.entries()) {
            if (timestamp < twentyFourHoursAgo) {
                this.notificationHistory.delete(issueId);
            }
        }
    }
    
    /**
     * Подписка на уведомления
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    
    /**
     * Уведомление подписчиков
     */
    notifySubscribers(data) {
        for (const callback of this.subscribers) {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in issues subscriber callback:', error);
            }
        }
    }
    
    /**
     * Запуск polling
     */
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(async () => {
            try {
                await this.checkForNewIssues();
            } catch (error) {
                console.error('Polling failed:', error);
            }
        }, GITHUB_CONFIG.MODULES.issues.pollInterval);
        
        console.log('🔔 Started issues polling');
    }
    
    /**
     * Остановка polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('🔔 Stopped issues polling');
        }
    }
    
    /**
     * Получение списка отслеживаемых репозиториев
     */
    getWatchedRepos() {
        return Array.from(this.watchedRepos.entries()).map(([repoKey, config]) => ({
            repo: repoKey,
            config
        }));
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopPolling();
        this.subscribers.clear();
        this.watchedRepos.clear();
        this.issuesCache.clear();
        this.notificationHistory.clear();
    }
}

// Экспорт модуля
module.exports = GitHubIssuesModule;