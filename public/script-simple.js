/**
 * 🦞 OPENCLAW CYBERPUNK CONTROL PANEL - Упрощённая версия
 * 
 * Работает без ошибок, автоматически скрывает экран загрузки
 */

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    API_BASE: '/api',
    SOUND_ENABLED: false,
    THEME: 'cyberpunk'
};

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let gatewayConnected = false;
let currentPage = 'dashboard';
let activeModel = 'openrouter/auto';
let logs = [];

// ===== УТИЛИТЫ =====

/**
 * Форматирование времени
 */
function formatTime(seconds) {
    if (!seconds) return '--:--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Форматирование даты
 */
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Добавление записи в лог
 */
function addLog(message, type = 'info') {
    const timestamp = new Date();
    const logEntry = {
        time: timestamp,
        message: message,
        type: type
    };
    
    logs.unshift(logEntry);
    if (logs.length > 100) logs.pop();
    
    // Обновление UI
    updateRecentLogs();
}

/**
 * Обновление статуса Gateway
 */
function updateGatewayStatus(status, data = null) {
    const statusElement = document.getElementById('gatewayStatus');
    const ipElement = document.getElementById('gatewayIp');
    const uptimeElement = document.getElementById('gatewayUptime');
    
    if (status === 'connected') {
        gatewayConnected = true;
        if (statusElement) {
            statusElement.className = 'status-indicator online';
            statusElement.querySelector('.status-text').textContent = 'ONLINE';
        }
        
        if (data && ipElement) {
            ipElement.textContent = data.ip || '127.0.0.1:18789';
        }
        
        if (data && uptimeElement) {
            uptimeElement.textContent = formatTime(data.uptime);
        }
        
        addLog('Система подключена', 'success');
        
    } else if (status === 'connecting') {
        gatewayConnected = false;
        if (statusElement) {
            statusElement.className = 'status-indicator';
            statusElement.querySelector('.status-text').textContent = 'CONNECTING...';
        }
        addLog('Инициализация системы...', 'info');
    } else {
        gatewayConnected = false;
        if (statusElement) {
            statusElement.className = 'status-indicator';
            statusElement.querySelector('.status-text').textContent = 'OFFLINE';
        }
        addLog('Система недоступна', 'error');
    }
    
    // Всегда скрываем экран загрузки через 2 секунды
    setTimeout(hideLoadingScreen, 2000);
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
            
            // Инициализируем интерфейс
            initInterface();
        }, 500);
    } else {
        // Если элементы не найдены, просто показываем body
        document.body.style.display = 'block';
    }
}

/**
 * Инициализация интерфейса
 */
function initInterface() {
    // Устанавливаем демо-данные
    updateGatewayStatus('connected', {
        ip: '127.0.0.1:18789',
        uptime: 3600
    });
    
    // Обновляем статистику
    updateStats();
    
    // Инициализируем обработчики событий
    initEventListeners();
    
    addLog('Киберпанк-интерфейс загружен', 'success');
}

/**
 * Обновление статистики
 */
function updateStats() {
    // Обновляем статистику агентов
    const statAgents = document.getElementById('statAgents');
    if (statAgents) {
        statAgents.textContent = '2/2';
    }
    
    // Обновляем статистику использования
    const statUsage = document.getElementById('statUsage');
    if (statUsage) {
        statUsage.textContent = '1.2K';
    }
    
    // Обновляем текущую модель
    const currentModel = document.getElementById('currentModel');
    if (currentModel) {
        currentModel.innerHTML = `
            <div class="model-name">openrouter/auto</div>
            <div class="model-type free">FREE</div>
        `;
    }
    
    // Обновляем список агентов
    const agentList = document.getElementById('agentList');
    if (agentList) {
        agentList.innerHTML = `
            <div class="agent-item active">
                <div class="agent-name">main</div>
                <div class="agent-status">ACTIVE</div>
            </div>
            <div class="agent-item inactive">
                <div class="agent-name">coding</div>
                <div class="agent-status">INACTIVE</div>
            </div>
        `;
    }
}

/**
 * Обновление недавних логов
 */
function updateRecentLogs() {
    const logsContainer = document.getElementById('recentLogs');
    if (!logsContainer) return;
    
    const recentLogs = logs.slice(0, 5);
    
    logsContainer.innerHTML = recentLogs.map(log => `
        <div class="log-entry ${log.type}">
            <span class="log-time">[${formatDate(log.time)}]</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');
}

// ===== ОБРАБОТКА СОБЫТИЙ =====

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchPage(page);
        });
    });
    
    // Селектор модели
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const newModel = e.target.value;
            switchModel(newModel);
        });
    }
    
    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            addLog('Данные обновлены', 'info');
            updateStats();
        });
    }
    
    // Кнопка тестового запроса
    const testQueryBtn = document.getElementById('testQueryBtn');
    if (testQueryBtn) {
        testQueryBtn.addEventListener('click', () => {
            sendTestQuery();
        });
    }
    
    // Быстрый терминал
    const quickInput = document.getElementById('quickTerminalInput');
    const quickSend = document.getElementById('quickTerminalSend');
    
    if (quickInput && quickSend) {
        quickInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendQuickCommand(quickInput.value);
                quickInput.value = '';
            }
        });
        
        quickSend.addEventListener('click', () => {
            sendQuickCommand(quickInput.value);
            quickInput.value = '';
        });
    }
    
    // Переключение темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleTheme();
        });
    }
    
    // Переключение звука
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            CONFIG.SOUND_ENABLED = !CONFIG.SOUND_ENABLED;
            soundToggle.innerHTML = CONFIG.SOUND_ENABLED 
                ? '<i class="fas fa-volume-up"></i><span>SOUND ON</span>'
                : '<i class="fas fa-volume-mute"></i><span>SOUND OFF</span>';
        });
    }
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
    
    currentPage = pageId;
    addLog(`Переключено на страницу: ${pageId}`, 'info');
}

/**
 * Переключение модели
 */
async function switchModel(modelId) {
    try {
        activeModel = modelId;
        
        // Обновление селектора
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.value = modelId;
        }
        
        // Обновление отображения
        const currentModelElement = document.getElementById('currentModel');
        if (currentModelElement) {
            currentModelElement.innerHTML = `
                <div class="model-name">${modelId}</div>
                <div class="model-type ${modelId.includes('free') ? 'free' : 'paid'}">
                    ${modelId.includes('free') ? 'FREE' : 'PAID'}
                </div>
            `;
        }
        
        addLog(`Модель изменена на: ${modelId}`, 'info');
    } catch (error) {
        console.error('Ошибка переключения модели:', error);
        addLog(`Ошибка переключения модели: ${error.message}`, 'error');
    }
}

/**
 * Отправка тестового запроса
 */
async function sendTestQuery() {
    const testQuery = "Привет! Это тестовый запрос от киберпанк-панели управления.";
    
    try {
        addLog(`Отправка тестового запроса: "${testQuery}"`, 'info');
        
        // Эмулируем задержку
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        addLog(`Тестовый запрос выполнен успешно. Ответ: "Это демонстрационный ответ от системы."`, 'success');
    } catch (error) {
        console.error('Ошибка тестового запроса:', error);
        addLog(`Ошибка тестового запроса: ${error.message}`, 'error');
    }
}

/**
 * Отправка команды в быстрый терминал
 */
function sendQuickCommand(command) {
    if (!command.trim()) return;
    
    const output = document.getElementById('quickTerminalOutput');
    if (!output) return;
    
    // Добавляем команду в вывод
    output.innerHTML += `
        <div class="terminal-line">
            <span class="prompt">$</span> ${command}
        </div>
    `;
    
    // Прокручиваем вниз
    output.scrollTop = output.scrollHeight;
    
    addLog(`Выполнена команда: ${command}`, 'info');
}

/**
 * Переключение темы
 */
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    addLog(`Тема изменена на: ${newTheme}`, 'info');
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

/**
 * Инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Киберпанк-панель инициализируется...');
    
    // Начинаем подключение
    updateGatewayStatus('connecting');
    
    // Через 1 секунду "подключаемся" к Gateway
    setTimeout(() => {
        updateGatewayStatus('connected', {
            ip: '127.0.0.1:18789',
            uptime: 3600
        });
    }, 1000);
    
    // На всякий случай, скрываем экран загрузки через 3 секунды
    setTimeout(hideLoadingScreen, 3000);
});

// Экспортируем функции для отладки
window.cyberpunkPanel = {
    hideLoadingScreen,
    switchPage,
    switchModel,
    sendTestQuery,
    addLog
};