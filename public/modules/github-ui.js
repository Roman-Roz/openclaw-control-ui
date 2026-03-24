/**
 * 🎨 GitHub Integration UI Components
 * 
 * UI компоненты для GitHub интеграции в киберпанк-стиле
 */

class GitHubUI {
    constructor(client, options = {}) {
        this.client = client;
        this.config = {
            theme: 'cyberpunk',
            animations: true,
            soundEffects: false,
            autoRefresh: true,
            refreshInterval: 30000,
            ...options
        };
        
        this.components = new Map();
        this.updateInterval = null;
        
        // Стили
        this.injectStyles();
        
        // Инициализация
        this.initialize();
    }
    
    /**
     * Внедрение стилей
     */
    injectStyles() {
        const styleId = 'github-ui-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }
        
        const styles = `
            /* GitHub UI Styles */
            .github-ui {
                font-family: 'JetBrains Mono', monospace;
            }
            
            .github-card {
                background: rgba(10, 10, 15, 0.8);
                border: 1px solid rgba(0, 243, 255, 0.3);
                border-radius: 8px;
                padding: 20px;
                margin: 10px;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .github-card:hover {
                border-color: rgba(0, 243, 255, 0.7);
                box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
            }
            
            .github-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, #00f3ff, #9d00ff, #ff00ff);
            }
            
            .github-card-header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(0, 243, 255, 0.2);
            }
            
            .github-card-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 18px;
                color: #00f3ff;
                text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .github-card-icon {
                color: #00f3ff;
                font-size: 20px;
            }
            
            .github-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .github-stat-item {
                background: rgba(0, 243, 255, 0.05);
                border: 1px solid rgba(0, 243, 255, 0.1);
                border-radius: 6px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .github-stat-item:hover {
                background: rgba(0, 243, 255, 0.1);
                border-color: rgba(0, 243, 255, 0.3);
                transform: translateY(-2px);
            }
            
            .github-stat-label {
                font-size: 12px;
                color: #a0a0c0;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 5px;
            }
            
            .github-stat-value {
                font-family: 'Orbitron', sans-serif;
                font-size: 24px;
                color: #00f3ff;
                text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
            }
            
            .github-repo-list {
                max-height: 400px;
                overflow-y: auto;
                margin-top: 15px;
            }
            
            .github-repo-item {
                background: rgba(10, 10, 15, 0.6);
                border: 1px solid rgba(0, 243, 255, 0.1);
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 10px;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .github-repo-item:hover {
                background: rgba(0, 243, 255, 0.05);
                border-color: rgba(0, 243, 255, 0.3);
                transform: translateX(5px);
            }
            
            .github-repo-name {
                font-family: 'Orbitron', sans-serif;
                color: #00f3ff;
                font-size: 16px;
                margin-bottom: 5px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .github-repo-description {
                color: #a0a0c0;
                font-size: 14px;
                margin-bottom: 10px;
                line-height: 1.4;
            }
            
            .github-repo-stats {
                display: flex;
                gap: 15px;
                font-size: 12px;
                color: #8080a0;
            }
            
            .github-repo-stat {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .github-repo-stat i {
                color: #9d00ff;
            }
            
            .github-issues-list {
                max-height: 300px;
                overflow-y: auto;
                margin-top: 15px;
            }
            
            .github-issue-item {
                background: rgba(10, 10, 15, 0.6);
                border-left: 3px solid;
                border-color: #00f3ff;
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 8px;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .github-issue-item.bug {
                border-color: #ff0000;
            }
            
            .github-issue-item.enhancement {
                border-color: #00ff00;
            }
            
            .github-issue-item.question {
                border-color: #ffff00;
            }
            
            .github-issue-item:hover {
                background: rgba(0, 243, 255, 0.05);
                transform: translateX(3px);
            }
            
            .github-issue-title {
                color: #e0e0ff;
                font-size: 14px;
                margin-bottom: 5px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .github-issue-number {
                color: #9d00ff;
                font-family: 'Orbitron', sans-serif;
            }
            
            .github-issue-labels {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
                margin-top: 8px;
            }
            
            .github-issue-label {
                background: rgba(157, 0, 255, 0.2);
                border: 1px solid rgba(157, 0, 255, 0.4);
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 10px;
                color: #9d00ff;
                text-transform: uppercase;
            }
            
            .github-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: #00f3ff;
            }
            
            .github-loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(0, 243, 255, 0.1);
                border-top-color: #00f3ff;
                border-radius: 50%;
                animation: github-spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes github-spin {
                to { transform: rotate(360deg); }
            }
            
            .github-error {
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 6px;
                padding: 15px;
                color: #ff0000;
                margin: 10px;
                text-align: center;
            }
            
            .github-success {
                background: rgba(0, 255, 0, 0.1);
                border: 1px solid rgba(0, 255, 0, 0.3);
                border-radius: 6px;
                padding: 15px;
                color: #00ff00;
                margin: 10px;
                text-align: center;
            }
            
            /* Анимации */
            @keyframes github-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .github-pulse {
                animation: github-pulse 2s infinite;
            }
            
            @keyframes github-glow {
                0%, 100% { box-shadow: 0 0 5px rgba(0, 243, 255, 0.5); }
                50% { box-shadow: 0 0 20px rgba(0, 243, 255, 0.8); }
            }
            
            .github-glow {
                animation: github-glow 3s infinite;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
    
    /**
     * Инициализация
     */
    initialize() {
        // Подписка на события клиента
        this.client.on('connected', () => this.onConnected());
        this.client.on('error', (error) => this.onError(error));
        this.client.on('ws:message', (data) => this.onWebSocketMessage(data));
        
        // Запуск автообновления
        if (this.config.autoRefresh) {
            this.startAutoRefresh();
        }
    }
    
    /**
     * Создание карточки статистики
     */
    createStatsCard(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return null;
        }
        
        const cardId = `github-stats-${Date.now()}`;
        const card = document.createElement('div');
        card.id = cardId;
        card.className = 'github-card';
        
        card.innerHTML = `
            <div class="github-card-header">
                <h3 class="github-card-title">
                    <i class="fas fa-chart-line github-card-icon"></i>
                    GITHUB STATS
                </h3>
                <div class="github-card-actions"></div>
            </div>
            <div class="github-card-content">
                <div class="github-loading">
                    <div class="github-loading-spinner"></div>
                    <div>Loading GitHub stats...</div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Загрузка данных
        this.loadStats(cardId, options);
        
        // Сохранение компонента
        this.components.set(cardId, {
            type: 'stats',
            element: card,
            options: options,
            data: null
        });
        
        return cardId;
    }
    
    /**
     * Загрузка статистики
     */
    async loadStats(cardId, options = {}) {
        const component = this.components.get(cardId);
        if (!component) return;
        
        try {
            const stats = await this.client.getStats();
            component.data = stats;
            this.renderStats(cardId, stats);
            
        } catch (error) {
            this.renderError(cardId, 'Failed to load GitHub stats', error);
        }
    }
    
    /**
     * Рендеринг статистики
     */
    renderStats(cardId, stats) {
        const component = this.components.get(cardId);
        if (!component) return;
        
        const content = component.element.querySelector('.github-card-content');
        if (!content) return;
        
        const { totalStats, languageStats, activityStats, user } = stats;
        
        // Форматирование чисел
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };
        
        // Создание HTML для языков
        let languagesHtml = '';
        if (languageStats && Object.keys(languageStats).length > 0) {
            const topLanguages = Object.entries(languageStats)
                .sort(([, a], [, b]) => b.percentage - a.percentage)
                .slice(0, 5);
            
            languagesHtml = `
                <div style="margin-top: 20px;">
                    <div style="color: #a0a0c0; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">
                        Top Languages
                    </div>
                    ${topLanguages.map(([lang, data]) => `
                        <div style="margin-bottom: 5px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                <span style="color: #e0e0ff;">${lang}</span>
                                <span style="color: #00f3ff;">${data.percentage}%</span>
                            </div>
                            <div style="height: 4px; background: rgba(0, 243, 255, 0.1); border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: ${data.percentage}%; background: linear-gradient(90deg, #00f3ff, #9d00ff);"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        content.innerHTML = `
            ${user ? `
                <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(0, 243, 255, 0.2);">
                    <img src="${user.avatar_url}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00f3ff; margin-right: 15px;">
                    <div>
                        <div style="font-family: 'Orbitron', sans-serif; color: #00f3ff; font-size: 18px;">${user.login}</div>
                        <div style="color: #a0a0c0; font-size: 14px;">${user.name || ''}</div>
                    </div>
                </div>
            ` : ''}
            
            <div class="github-stats-grid">
                <div class="github-stat-item">
                    <div class="github-stat-label">Repositories</div>
                    <div class="github-stat-value">${formatNumber(totalStats.repos)}</div>
                </div>
                
                <div class="github-stat-item">
                    <div class="github-stat-label">Stars</div>
                    <div class="github-stat-value">${formatNumber(totalStats.stars)}</div>
                </div>
                
                <div class="github-stat-item">
                    <div class="github-stat-label">Forks</div>
                    <div class="github-stat-value">${formatNumber(totalStats.forks)}</div>
                </div>
                
                <div class="github-stat-item">
                    <div class="github-stat-label">Issues</div>
                    <div class="github-stat-value">${formatNumber(totalStats.issues)}</div>
                </div>
            </div>
            
            ${languagesHtml}
            
            ${activityStats ? `
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 243, 255, 0.2);">
                    <div style="color: #a0a0c0; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">
                        Recent Activity
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div style="text-align: center;">
                            <div style="font-family: 'Orbitron', sans-serif; color: #00f3ff; font-size: 20px;">${activityStats.today || 0}</div>
                            <div style="color: #a0a0c0; font-size: 11px;">Today</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-family: 'Orbitron', sans-serif; color: #9d00ff; font-size: 20px;">${activityStats.week || 0}</div>
                            <div style="color: #a0a0c0; font-size: 11px;">This Week</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-family: 'Orbitron', sans-serif; color: #ff00ff; font-size: 20px;">${activityStats.month || 0}</div>
                            <div style="color: #a0a0c0; font-size: 11px;">This Month</div>
