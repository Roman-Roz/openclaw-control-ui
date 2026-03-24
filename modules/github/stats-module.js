/**
 * 📊 GitHub Stats Dashboard Module
 * 
 * Модуль для отображения статистики GitHub репозиториев
 */

const GITHUB_CONFIG = require('./config.js');

class GitHubStatsModule {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.stats = {
            user: null,
            repos: [],
            totalStats: {
                repos: 0,
                stars: 0,
                forks: 0,
                watchers: 0,
                issues: 0,
                prs: 0
            },
            languageStats: {},
            activityStats: {},
            lastUpdated: null
        };
        
        this.subscribers = new Set();
        this.updateInterval = null;
    }
    
    /**
     * Инициализация модуля
     */
    async initialize(username = null) {
        try {
            // Получение информации о пользователе
            this.stats.user = await this.apiClient.getUser(username);
            
            // Получение репозиториев
            const repos = await this.apiClient.getUserRepos(username, {
                per_page: 100
            });
            
            this.stats.repos = repos;
            await this.calculateStats();
            
            // Запуск автоматического обновления
            if (GITHUB_CONFIG.MODULES.stats.autoRefresh) {
                this.startAutoRefresh();
            }
            
            return this.stats;
            
        } catch (error) {
            console.error('Failed to initialize GitHub stats module:', error);
            throw error;
        }
    }
    
    /**
     * Расчет статистики
     */
    async calculateStats() {
        const stats = {
            repos: this.stats.repos.length,
            stars: 0,
            forks: 0,
            watchers: 0,
            issues: 0,
            prs: 0
        };
        
        const languageStats = {};
        const activityStats = {
            today: 0,
            week: 0,
            month: 0
        };
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        for (const repo of this.stats.repos) {
            // Основная статистика
            stats.stars += repo.stargazers_count || 0;
            stats.forks += repo.forks_count || 0;
            stats.watchers += repo.watchers_count || 0;
            stats.issues += repo.open_issues_count || 0;
            
            // Языки программирования
            try {
                const languages = await this.apiClient.getRepoLanguages(repo.owner.login, repo.name);
                for (const [language, bytes] of Object.entries(languages)) {
                    languageStats[language] = (languageStats[language] || 0) + bytes;
                }
            } catch (error) {
                // Пропускаем ошибки получения языков
            }
            
            // Активность
            const updatedAt = new Date(repo.updated_at);
            if (updatedAt >= today) activityStats.today++;
            if (updatedAt >= weekAgo) activityStats.week++;
            if (updatedAt >= monthAgo) activityStats.month++;
        }
        
        // Расчет процентов для языков
        const totalBytes = Object.values(languageStats).reduce((sum, bytes) => sum + bytes, 0);
        const languagePercentages = {};
        
        for (const [language, bytes] of Object.entries(languageStats)) {
            languagePercentages[language] = {
                bytes: bytes,
                percentage: totalBytes > 0 ? (bytes / totalBytes * 100).toFixed(1) : 0
            };
        }
        
        // Сортировка языков по популярности
        const sortedLanguages = Object.entries(languagePercentages)
            .sort(([, a], [, b]) => b.bytes - a.bytes)
            .slice(0, 10) // Топ 10 языков
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
        
        this.stats.totalStats = stats;
        this.stats.languageStats = sortedLanguages;
        this.stats.activityStats = activityStats;
        this.stats.lastUpdated = new Date();
        
        // Уведомление подписчиков
        this.notifySubscribers();
        
        return this.stats;
    }
    
    /**
     * Получение расширенной статистики репозитория
     */
    async getRepoDetailedStats(owner, repoName) {
        try {
            const [repo, contributors, languages, prs, issues] = await Promise.all([
                this.apiClient.getRepo(owner, repoName),
                this.apiClient.getRepoContributors(owner, repoName, { per_page: 10 }),
                this.apiClient.getRepoLanguages(owner, repoName),
                this.apiClient.getRepoPRs(owner, repoName, { per_page: 5, state: 'open' }),
                this.apiClient.getRepoIssues(owner, repoName, { per_page: 5, state: 'open' })
            ]);
            
            // Расчет активности
            const now = new Date();
            const created = new Date(repo.created_at);
            const updated = new Date(repo.updated_at);
            const pushed = new Date(repo.pushed_at);
            
            const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
            const lastUpdateDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
            const lastPushDays = Math.floor((now - pushed) / (1000 * 60 * 60 * 24));
            
            return {
                basic: repo,
                contributors: contributors.slice(0, 5), // Топ 5 контрибьюторов
                languages: languages,
                recentPRs: prs,
                recentIssues: issues,
                activity: {
                    ageDays: ageDays,
                    lastUpdateDays: lastUpdateDays,
                    lastPushDays: lastPushDays,
                    isActive: lastPushDays < 30, // Активен если был push за последние 30 дней
                    commitFrequency: repo.size > 0 ? Math.round(repo.size / Math.max(ageDays, 1)) : 0
                },
                health: {
                    hasReadme: repo.has_wiki || false,
                    hasLicense: !!repo.license,
                    hasTopics: repo.topics && repo.topics.length > 0,
                    hasIssues: repo.has_issues,
                    hasProjects: repo.has_projects,
                    hasWiki: repo.has_wiki,
                    score: this.calculateRepoHealthScore(repo)
                }
            };
            
        } catch (error) {
            console.error(`Failed to get detailed stats for ${owner}/${repoName}:`, error);
            throw error;
        }
    }
    
    /**
     * Расчет health score репозитория
     */
    calculateRepoHealthScore(repo) {
        let score = 50; // Базовый score
        
        // README
        if (repo.has_wiki) score += 10;
        
        // License
        if (repo.license) score += 10;
        
        // Topics
        if (repo.topics && repo.topics.length > 0) score += 5;
        
        // Issues enabled
        if (repo.has_issues) score += 5;
        
        // Recent activity (within 30 days)
        const lastUpdate = new Date(repo.updated_at);
        const now = new Date();
        const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceUpdate < 7) score += 15;
        else if (daysSinceUpdate < 30) score += 10;
        else if (daysSinceUpdate < 90) score += 5;
        else score -= 10;
        
        // Stars
        if (repo.stargazers_count > 100) score += 10;
        else if (repo.stargazers_count > 10) score += 5;
        
        // Forks
        if (repo.forks_count > 10) score += 5;
        
        // Watchers
        if (repo.watchers_count > 5) score += 5;
        
        return Math.min(Math.max(score, 0), 100);
    }
    
    /**
     * Получение trending репозиториев
     */
    async getTrendingRepos(language = null, since = 'daily') {
        try {
            const query = language ? `language:${language}` : '';
            const sort = 'stars';
            const order = 'desc';
            
            const searchParams = {
                q: `${query} created:>${this.getDateForSince(since)}`,
                sort: sort,
                order: order,
                per_page: 20
            };
            
            const result = await this.apiClient.searchRepos(searchParams.q, searchParams);
            return result.items;
            
        } catch (error) {
            console.error('Failed to get trending repos:', error);
            throw error;
        }
    }
    
    /**
     * Получение даты для since параметра
     */
    getDateForSince(since) {
        const now = new Date();
        let date = new Date();
        
        switch (since) {
            case 'daily':
                date.setDate(now.getDate() - 1);
                break;
            case 'weekly':
                date.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                date.setMonth(now.getMonth() - 1);
                break;
            default:
                date.setDate(now.getDate() - 1);
        }
        
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Подписка на обновления
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    
    /**
     * Уведомление подписчиков
     */
    notifySubscribers() {
        for (const callback of this.subscribers) {
            try {
                callback(this.stats);
            } catch (error) {
                console.error('Error in stats subscriber callback:', error);
            }
        }
    }
    
    /**
     * Запуск автоматического обновления
     */
    startAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.calculateStats();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, GITHUB_CONFIG.MODULES.stats.refreshInterval);
    }
    
    /**
     * Остановка автоматического обновления
     */
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Получение текущей статистики
     */
    getStats() {
        return this.stats;
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopAutoRefresh();
        this.subscribers.clear();
    }
}

// Экспорт модуля
module.exports = GitHubStatsModule;