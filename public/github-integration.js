/**
 * 🚀 GitHub Integration JavaScript
 * 
 * Основная логика для GitHub интеграции в киберпанк-панели
 */

// Глобальные переменные
let githubClient = null;
let isGitHubConnected = false;
let currentUser = null;
let githubStats = null;

/**
 * Инициализация GitHub интеграции
 */
function initializeGitHubIntegration() {
    console.log('🚀 Initializing GitHub integration...');
    
    try {
        // Создание GitHub клиента
        githubClient = new GitHubClient({
            apiBase: '/api/github',
            autoConnect: true,
            reconnectDelay: 5000
        });
        
        // Подписка на события
        githubClient.on('connected', onGitHubConnected);
        githubClient.on('error', onGitHubError);
        githubClient.on('disconnected', onGitHubDisconnected);
        githubClient.on('ws:message', onWebSocketMessage);
        
        console.log('🔗 GitHub client initialized');
        
        // Обновление статуса в UI
        updateGitHubStatus('connecting');
        
    } catch (error) {
        console.error('❌ Failed to initialize GitHub client:', error);
        updateGitHubStatus('error', error.message);
        showError('GitHub initialization failed: ' + error.message);
    }
}

/**
 * Обработка успешного подключения к GitHub
 */
function onGitHubConnected(data) {
    console.log('✅ GitHub connected:', data);
    isGitHubConnected = true;
    
    // Обновление UI
    updateGitHubStatus('connected');
    
    // Загрузка данных
    loadGitHubData();
    
    // Обновление превью на дашборде
    updateGitHubPreview();
    
    // Добавление лога
    addLog('GitHub integration connected successfully', 'success');
}

/**
 * Обработка ошибки GitHub
 */
function onGitHubError(error) {
    console.error('❌ GitHub error:', error);
    isGitHubConnected = false;
    
    // Обновление UI
    updateGitHubStatus('error', error.message);
    
    // Показать ошибку
    showError('GitHub connection error: ' + error.message);
    
    // Добавление лога
    addLog('GitHub connection failed: ' + error.message, 'error');
}

/**
 * Обработка отключения GitHub
 */
function onGitHubDisconnected() {
    console.log('🔗 GitHub disconnected');
    isGitHubConnected = false;
    
    // Обновление UI
    updateGitHubStatus('disconnected');
    
    // Добавление лога
    addLog('GitHub integration disconnected', 'warning');
}

/**
 * Обработка WebSocket сообщений
 */
function onWebSocketMessage(data) {
    console.log('📨 WebSocket message:', data);
    
    // Обработка разных типов сообщений
    switch (data.type) {
        case 'heartbeat':
            // Можно обновить timestamp
            break;
            
        case 'github:update':
            // Обновление GitHub данных
            if (data.data && data.data.stats) {
                updateStatsDisplay(data.data.stats);
            }
            break;
            
        case 'github:notification':
            // Уведомление от GitHub
            showNotification(data.data);
            break;
    }
}

/**
 * Загрузка данных GitHub
 */
async function loadGitHubData() {
    if (!isGitHubConnected || !githubClient) {
        console.warn('GitHub not connected, skipping data load');
        return;
    }
    
    try {
        // Показать индикаторы загрузки
        showLoadingIndicators(true);
        
        // Загрузка пользователя
        const user = await githubClient.getUser();
        currentUser = user;
        updateUserDisplay(user);
        
        // Загрузка статистики
        const stats = await githubClient.getStats();
        githubStats = stats;
        updateStatsDisplay(stats);
        
        // Загрузка репозиториев
        const repos = await githubClient.getUserRepos({ per_page: 10 });
        updateReposDisplay(repos);
        
        // Загрузка issues (если есть репозитории)
        if (repos && repos.length > 0) {
            const firstRepo = repos[0];
            const issues = await githubClient.getRepoIssues(
                firstRepo.owner.login,
                firstRepo.name,
                { per_page: 5, state: 'open' }
            );
            updateIssuesDisplay(issues);
        }
        
        // Скрыть индикаторы загрузки
        showLoadingIndicators(false);
        
        console.log('✅ GitHub data loaded successfully');
        
        // Добавление лога
        addLog('GitHub data loaded: ' + user.login, 'success');
        
    } catch (error) {
        console.error('❌ Failed to load GitHub data:', error);
        showLoadingIndicators(false);
        showError('Failed to load GitHub data: ' + error.message);
        
        // Добавление лога
        addLog('Failed to load GitHub data: ' + error.message, 'error');
    }
}

/**
 * Обновление статуса GitHub в UI
 */
function updateGitHubStatus(status, errorMessage = '') {
    const statusElement = document.getElementById('githubStatusText');
    const statusCard = document.getElementById('githubStatusCard');
    const loadingElement = document.getElementById('githubStatusLoading');
    const contentElement = document.getElementById('githubStatusContent');
    const errorElement = document.getElementById('githubStatusError');
    const errorDetails = document.getElementById('githubErrorDetails');
    
    if (!statusElement) return;
    
    switch (status) {
        case 'connecting':
            statusElement.textContent = 'CONNECTING...';
            statusElement.style.color = '#ffff00';
            if (loadingElement) loadingElement.style.display = 'flex';
            if (contentElement) contentElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';
            break;
            
        case 'connected':
            statusElement.textContent = 'CONNECTED';
            statusElement.style.color = '#00ff00';
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';
            break;
            
        case 'disconnected':
            statusElement.textContent = 'DISCONNECTED';
            statusElement.style.color = '#ff9900';
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';
            break;
            
        case 'error':
            statusElement.textContent = 'ERROR';
            statusElement.style.color = '#ff0000';
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                if (errorDetails) {
                    errorDetails.textContent = errorMessage;
                }
            }
            break;
    }
}

/**
 * Обновление отображения пользователя
 */
function updateUserDisplay(user) {
    const usernameElement = document.getElementById('githubUsername');
    const userAvatarElement = document.getElementById('githubUserAvatar');
    
    if (usernameElement && user) {
        usernameElement.textContent = user.login || 'Unknown';
    }
    
    // Можно добавить аватар если есть элемент
    if (userAvatarElement && user.avatar_url) {
        userAvatarElement.src = user.avatar_url;
        userAvatarElement.style.display = 'block';
    }
}

/**
 * Обновление отображения статистики
 */
function updateStatsDisplay(stats) {
    if (!stats) return;
    
    const { totalStats, languageStats, activityStats } = stats;
    
    // Обновление основных статистик
    updateElementText('totalRepos', totalStats?.repos || 0);
    updateElementText('totalStars', formatNumber(totalStats?.stars || 0));
    updateElementText('totalForks', formatNumber(totalStats?.forks || 0));
    updateElementText('totalIssues', formatNumber(totalStats?.issues || 0));
    
    // Обновление активности
    updateElementText('activityToday', activityStats?.today || 0);
    updateElementText('activityWeek', activityStats?.week || 0);
    updateElementText('activityMonth', activityStats?.month || 0);
    updateElementText('activityTotal', activityStats?.total || 0);
    
    // Обновление языков программирования
    updateLanguagesDisplay(languageStats);
    
    // Обновление превью на дашборде
    updateGitHubPreview();
}

/**
 * Обновление отображения языков программирования
 */
function updateLanguagesDisplay(languageStats) {
    const languagesList = document.getElementById('languagesList');
    if (!languagesList || !languageStats) return;
    
    // Сортировка языков по популярности
    const sortedLanguages = Object.entries(languageStats)
        .sort(([, a], [, b]) => b.percentage - a.percentage)
        .slice(0, 5); // Топ 5 языков
    
    let html = '';
    
    for (const [language, data] of sortedLanguages) {
        const percentage = parseFloat(data.percentage);
        const width = Math.max(10, percentage); // Минимальная ширина 10%
        
        html += `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #e0e0ff; font-size: 12px;">${language}</span>
                    <span style="color: #00f3ff; font-size: 12px; font-family: 'Orbitron', sans-serif;">${percentage.toFixed(1)}%</span>
                </div>
                <div style="height: 6px; background: rgba(0, 243, 255, 0.1); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${width}%; background: linear-gradient(90deg, #00f3ff, #9d00ff);"></div>
                </div>
            </div>
        `;
    }
    
    languagesList.innerHTML = html;
}

/**
 * Обновление отображения репозиториев
 */
function updateReposDisplay(repos) {
    const reposList = document.getElementById('reposList');
    const loadingElement = document.getElementById('reposLoading');
    
    if (!reposList || !loadingElement) return;
    
    // Скрыть индикатор загрузки
    loadingElement.style.display = 'none';
    reposList.style.display = 'block';
    
    if (!repos || repos.length === 0) {
        reposList.innerHTML = '<div style="text-align: center; color: #a0a0c0; padding: 20px;">No repositories found</div>';
        return;
    }
    
    let html = '';
    
    for (const repo of repos.slice(0, 10)) { // Показываем первые 10 репозиториев
        const updated = new Date(repo.updated_at);
        const updatedStr = updated.toLocaleDateString();
        
        html += `
            <div class="github-list-item" onclick="openRepo('${repo.owner.login}', '${repo.name}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-family: 'Orbitron', sans-serif; color: #00f3ff; font-size: 14px;">
                        ${repo.owner.login}/${repo.name}
                    </div>
                    <div style="font-size: 11px; color: #9d00ff;">
                        ${repo.private ? '🔒 Private' : '🌐 Public'}
                    </div>
                </div>
                
                ${repo.description ? `
                    <div style="color: #a0a0c0; font-size: 12px; margin-bottom: 8px; line-height: 1.4;">
                        ${repo.description}
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 15px; font-size: 11px; color: #8080a0;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-star"></i>
                        <span>${formatNumber(repo.stargazers_count || 0)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-code-branch"></i>
                        <span>${formatNumber(repo.forks_count || 0)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-eye"></i>
                        <span>${formatNumber(repo.watchers_count || 0)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-circle" style="color: ${repo.language ? '#9d00ff' : '#8080a0'}; font-size: 8px;"></i>
                        <span>${repo.language || 'N/A'}</span>
                    </div>
                </div>
                
                <div style="font-size: 10px; color: #606080; margin-top: 8px;">
                    Updated: ${updatedStr}
                </div>
            </div>
        `;
    }
    
    reposList.innerHTML = html;
}

/**
 * Обновление отображения issues
 */
function updateIssuesDisplay(issues) {
    const issuesList = document.getElementById('issuesList');
    const loadingElement = document.getElementById('issuesLoading');
    
    if (!issuesList || !loadingElement) return;
    
    // Скрыть индикатор загрузки
    loadingElement.style.display = 'none';
    issuesList.style.display = 'block';
    
    if (!issues || issues.length === 0) {
        issuesList.innerHTML = '<div style="text-align: center; color: #a0a0c0; padding: 20px;">No open issues found</div>';
        return;
    }
    
    let html = '';
    
    for (const issue of issues.slice(0, 5)) { // Показываем первые 5 issues
        const created = new Date(issue.created_at);
        const createdStr = created.toLocaleDateString();
        
        // Определение типа issue по labels
        let issueType = 'info';
        if (issue.labels && issue.labels.length > 0) {
            const labelNames = issue.labels.map(l => l.name.toLowerCase());
            if (labelNames.includes('bug')) issueType = 'bug';
            else if (labelNames.includes('enhancement')) issueType = 'enhancement';
            else if (labelNames.includes('question')) issueType = 'question';
        }
        
        html += `
            <div class="github-list-item ${issueType}" onclick="openIssue('${issue.number}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="font-size: 13px; color: #e0e0ff; line-height: 1.4; flex: 1;">
                        #${issue.number}: ${issue.title}
                    </div>
                    <div style="font-size: 10px; color: #9d00ff; white-space: nowrap; margin-left: 10px;">
                        ${issue.state === 'open' ? '🟢 Open' : '🔴 Closed'}
                    </div>
                </div>
                
                ${issue.labels && issue.labels.length > 0 ? `
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px;">
                        ${issue.labels.slice(0, 3).map(label => `
                            <span style="background: rgba(157, 0, 255, 0.2); border: 1px solid rgba(157, 0, 255, 0.4); border-radius: 10px; padding: 2px 6px; font-size: 9px; color: #9d00ff;">
                                ${label.name}
                            </span>
                        `).join('')}
                        ${issue.labels.length > 3 ? `<span style="font-size: 9px; color: #8080a0;">+${issue.labels.length - 3} more</span>` : ''}
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #606080;">
                    <div>
                        By: ${issue.user?.login || 'Unknown'}
                    </div>
                    <div>
                        ${createdStr}
                    </div>
                </div>
            </div>
        `;
    }
    
    issuesList.innerHTML = html;
}

/**
 * Обновление GitHub превью на дашборде
 */
function updateGitHubPreview() {
    const previewLoading = document.getElementById('githubPreviewLoading');
    const previewContent = document.getElementById('githubPreviewContent');
    
    if (!previewLoading || !previewContent) return;
    
    if (!githubStats || !currentUser) {
        previewLoading.style.display = 'flex';
        previewContent.style.display = 'none';
        return;
    }
    
    previewLoading.style.display = 'none';
    previewContent.style.display = 'block';
    
    // Обновление статистик в превью
    updateElementText('githubRepos', githubStats.totalStats?.repos || 0);
    updateElementText('githubStars', formatNumber(githubStats.totalStats?.stars || 0));
    updateElementText('githubIssues', formatNumber(githubStats.totalStats?.issues || 0));
    updateElementText('githubPRs', formatNumber(githubStats.totalStats?.prs || 0));
}

/**
 * Показать/скрыть индикаторы загрузки
 */
function showLoading