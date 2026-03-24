/**
 * 🛠️ GitHub Integration Utilities
 * 
 * Вспомогательные функции для GitHub интеграции
 */

/**
 * Форматирование чисел (1K, 1M и т.д.)
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Обновление текста элемента
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

/**
 * Показать/скрыть индикаторы загрузки
 */
function showLoadingIndicators(show) {
    const loadingElements = document.querySelectorAll('.github-loading');
    loadingElements.forEach(element => {
        element.style.display = show ? 'flex' : 'none';
    });
}

/**
 * Показать ошибку
 */
function showError(message) {
    console.error('❌ Error:', message);
    
    // Можно добавить уведомление в UI
    const logsContainer = document.getElementById('recentLogs');
    if (logsContainer) {
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0') + ':' + 
                       now.getSeconds().toString().padStart(2, '0');
        
        const errorLog = document.createElement('div');
        errorLog.className = 'log-entry error';
        errorLog.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logsContainer.insertBefore(errorLog, logsContainer.firstChild);
        
        // Ограничение количества логов
        const logs = logsContainer.querySelectorAll('.log-entry');
        if (logs.length > 10) {
            logsContainer.removeChild(logs[logs.length - 1]);
        }
    }
}

/**
 * Добавить лог
 */
function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('recentLogs');
    if (!logsContainer) return;
    
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0') + ':' + 
                   now.getSeconds().toString().padStart(2, '0');
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logsContainer.insertBefore(logEntry, logsContainer.firstChild);
    
    // Ограничение количества логов
    const logs = logsContainer.querySelectorAll('.log-entry');
    if (logs.length > 10) {
        logsContainer.removeChild(logs[logs.length - 1]);
    }
}

/**
 * Показать уведомление
 */
function showNotification(data) {
    // Создание уведомления в UI
    const notification = document.createElement('div');
    notification.className = 'cyber-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(10, 10, 15, 0.95);
        border: 1px solid rgba(0, 243, 255, 0.5);
        border-radius: 8px;
        padding: 15px;
        max-width: 300px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <i class="fab fa-github" style="color: #00f3ff; margin-right: 10px;"></i>
            <div style="font-family: 'Orbitron', sans-serif; color: #00f3ff; font-size: 14px;">
                GitHub Notification
            </div>
        </div>
        <div style="color: #e0e0ff; font-size: 13px; margin-bottom: 10px;">
            ${data.message || 'New notification'}
        </div>
        <div style="font-size: 11px; color: #a0a0c0;">
            ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

/**
 * Открыть репозиторий
 */
function openRepo(owner, repo) {
    const url = `https://github.com/${owner}/${repo}`;
    window.open(url, '_blank');
    
    // Добавление лога
    addLog(`Opened repository: ${owner}/${repo}`, 'info');
}

/**
 * Открыть issue
 */
function openIssue(issueNumber) {
    // Здесь можно реализовать открытие issue
    // Пока просто добавляем лог
    addLog(`Clicked on issue #${issueNumber}`, 'info');
}

/**
 * Переключение страниц
 */
function switchPage(pageId) {
    // Скрыть все страницы
    document.querySelectorAll('.cyber-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Показать выбранную страницу
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Обновить активную навигацию
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    
    // Обновить заголовок
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = pageId.toUpperCase();
        pageTitle.setAttribute('data-text', pageId.toUpperCase());
    }
    
    // Обновить хлебные крошки
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <span class="crumb">HOME</span>
            <span class="separator">//</span>
            <span class="crumb active">${pageId.toUpperCase()}</span>
        `;
    }
    
    // Добавление лога
    addLog(`Switched to page: ${pageId}`, 'info');
}

/**
 * Скрытие экрана загрузки
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingScreen && mainContainer) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainContainer.style.display = 'flex';
            mainContainer.style.opacity = '1';
            mainContainer.style.transition = 'opacity 0.5s ease';
            
            // Инициализация GitHub интеграции после загрузки
            initializeGitHubIntegration();
            
            // Добавление первого лога
            addLog('Cyberpunk interface loaded successfully', 'success');
            
        }, 500);
    }
}

/**
 * Инициализация навигации
 */
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchPage(page);
        });
    });
}

/**
 * Инициализация обработчиков событий
 */
function initializeEventHandlers() {
    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (isGitHubConnected && githubClient) {
                loadGitHubData();
                addLog('GitHub data refreshed', 'info');
            } else {
                addLog('Cannot refresh: GitHub not connected', 'warning');
            }
        });
    }
    
    // Кнопка тестового запроса
    const testQueryBtn = document.getElementById('testQueryBtn');
    if (testQueryBtn) {
        testQueryBtn.addEventListener('click', () => {
            addLog('Test query executed', 'info');
        });
    }
    
    // Переключение темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const body = document.body;
            const currentTheme = body.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            body.setAttribute('data-theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' 
                ? '<i class="fas fa-moon"></i><span>DARK MODE</span>'
                : '<i class="fas fa-sun"></i><span>LIGHT MODE</span>';
            
            addLog(`Theme changed to: ${newTheme}`, 'info');
        });
    }
    
    // Переключение звука
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            const soundEnabled = soundToggle.innerHTML.includes('ON');
            soundToggle.innerHTML = soundEnabled
                ? '<i class="fas fa-volume-mute"></i><span>SOUND OFF</span>'
                : '<i class="fas fa-volume-up"></i><span>SOUND ON</span>';
            
            addLog(`Sound ${soundEnabled ? 'disabled' : 'enabled'}`, 'info');
        });
    }
    
    // Кнопка помощи
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showNotification({
                message: 'GitHub Integration Help: Connect your GitHub account to view stats, repos, and issues. Use the refresh button to update data.'
            });
            addLog('Help dialog opened', 'info');
        });
    }
}

// Добавление CSS анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .cyber-notification {
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
    }
`;
document.head.appendChild(style);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 GitHub Integration Utilities Loaded');
    
    // Инициализация навигации
    initializeNavigation();
    
    // Инициализация обработчиков событий
    initializeEventHandlers();
    
    // Автоматически скрываем экран загрузки через 2 секунды
    setTimeout(hideLoadingScreen, 2000);
});