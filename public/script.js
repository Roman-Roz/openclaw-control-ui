/**
 * 🦞 OPENCLAW CYBERPUNK CONTROL PANEL - Основная логика
 * 
 * Управление интерфейсом, подключение к Gateway, обработка событий
 */

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    API_BASE: '/api',
    RECONNECT_DELAY: 5000,
    POLL_INTERVAL: 10000,
    SOUND_ENABLED: true,
    THEME: 'cyberpunk',
    // Используем эмулированный API
    USE_MOCK_API: true
};

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let gatewayConnected = false;
let gatewaySocket = null;
let currentPage = 'dashboard';
let activeModel = 'openrouter/auto';
let agents = [];
let logs = [];
let stats = {
    gateway: { status: 'unknown', uptime: 0 },
    agents: { total: 0, active: 0 },
    models: { current: 'openrouter/auto', cost: 0 },
    usage: { today: 0, month: 0 }
};

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
 * Воспроизведение звука
 */
function playSound(type) {
    if (!CONFIG.SOUND_ENABLED) return;
    
    const sounds = {
        click: new Audio('assets/sounds/click.wav'),
        beep: new Audio('assets/sounds/beep.wav'),
        success: new Audio('assets/sounds/success.wav'),
        error: new Audio('assets/sounds/error.wav')
    };
    
    if (sounds[type]) {
        sounds[type].volume = 0.3;
        sounds[type].play().catch(() => {});
    }
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
    
    // Воспроизведение звука
    if (type === 'error') playSound('error');
    else if (type === 'success') playSound('success');
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
        statusElement.className = 'status-indicator online';
        statusElement.querySelector('.status-text').textContent = 'ONLINE';
        
        if (data) {
            ipElement.textContent = data.ip || '127.0.0.1:18789';
            uptimeElement.textContent = formatTime(data.uptime);
        }
        
        addLog('Система подключена', 'success');
        
        // Скрываем экран загрузки и показываем основной интерфейс
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const mainContainer = document.getElementById('mainContainer');
            
            if (loadingScreen && mainContainer) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    mainContainer.style.display = 'flex';
                }, 500);
            }
        }, 1000);
        
    } else if (status === 'connecting') {
        gatewayConnected = false;
        statusElement.className = 'status-indicator';
        statusElement.querySelector('.status-text').textContent = 'CONNECTING...';
        addLog('Инициализация системы...', 'info');
    } else {
        gatewayConnected = false;
        statusElement.className = 'status-indicator';
        statusElement.querySelector('.status-text').textContent = 'OFFLINE';
        addLog('Система недоступна', 'error');
        
        // Все равно показываем интерфейс через 3 секунды
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const mainContainer = document.getElementById('mainContainer');
            
            if (loadingScreen && mainContainer) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    mainContainer.style.display = 'flex';
                    addLog('Загружен демонстрационный режим', 'warning');
                }, 500);
            }
        }, 3000);
    }
}

// ===== ПОДКЛЮЧЕНИЕ К GATEWAY =====

/**
 * Подключение к эмулированному Gateway
 */
async function connectToGateway() {
    try {
        updateGatewayStatus('connecting');
        
        // Используем эмулированный API
        const response = await fetch(`${CONFIG.API_BASE}/status`);
        if (!response.ok) throw new Error('API недоступен');
        
        const data = await response.json();
        
        // Эмулируем WebSocket подключение
        setTimeout(() => {
            updateGatewayStatus('connected', {
                ip: '127.0.0.1:18789',
                uptime: 3600 // 1 час в секундах
            });
            
            // Запрос начальных данных
            fetchGatewayData();
            
            // Эмулируем WebSocket сообщения
            setInterval(() => {
                handleGatewayMessage({
                    type: 'heartbeat',
                    data: { timestamp: new Date().toISOString() }
                });
            }, 10000);
            
        }, 1000);
        
    } catch (error) {
        console.error('Ошибка подключения:', error);
        updateGatewayStatus('error');
        
        // Используем фиктивные данные для демонстрации
        setTimeout(() => {
            updateGatewayStatus('connected', {
                ip: '127.0.0.1:18789',
                uptime: 7200
            });
            updateAgentsList([
                { id: 'main', status: 'active', model: 'openrouter/auto' },
                { id: 'coding', status: 'inactive', model: 'deepseek-coder' }
            ]);
            addLog('Используются демонстрационные данные', 'info');
        }, 2000);
    }
}

/**
 * Получение данных от Gateway
 */
async function fetchGatewayData() {
    try {
        // Получение статуса
        const statusResponse = await fetch(`${CONFIG.API_BASE}/status`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            updateGatewayStatus('connected', statusData);
        }
        
        // Получение агентов
        const agentsResponse = await fetch(`${CONFIG.API_BASE}/agents`);
        if (agentsResponse.ok) {
            const agentsData = await agentsResponse.json();
            updateAgentsList(agentsData);
        }
        
        // Получение моделей
        const modelsResponse = await fetch(`${CONFIG.API_BASE}/models`);
        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            updateModelsList(modelsData);
        }
        
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        addLog(`Ошибка получения данных: ${error.message}`, 'error');
    }
}

/**
 * Обработка сообщений от Gateway
 */
function handleGatewayMessage(message) {
    switch (message.type) {
        case 'status':
            updateGatewayStatus('connected', message.data);
            break;
            
        case 'agent_update':
            updateAgentsList(message.data);
            break;
            
        case 'log':
            addLog(message.data.message, message.data.level);
            break;
            
        case 'model_switch':
            updateCurrentModel(message.data.model);
            break;
            
        default:
            console.log('Неизвестное сообщение:', message);
    }
}

// ===== ОБНОВЛЕНИЕ UI =====

/**
 * Обновление списка агентов
 */
function updateAgentsList(agentsData) {
    agents = agentsData || [];
    
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    
    // Обновление статистики
    document.getElementById('statAgents').textContent = `${activeAgents}/${totalAgents}`;
    
    // Обновление списка
    const agentList = document.getElementById('agentList');
    if (agentList) {
        if (agents.length === 0) {
            agentList.innerHTML = '<div class="agent-item">No agents running</div>';
        } else {
            agentList.innerHTML = agents.map(agent => `
                <div class="agent-item ${agent.status}">
                    <div class="agent-name">${agent.id}</div>
                    <div class="agent-status">${agent.status.toUpperCase()}</div>
                </div>
            `).join('');
        }
    }
    
    stats.agents = { total: totalAgents, active: activeAgents };
}

/**
 * Обновление списка моделей
 */
function updateModelsList(modelsData) {
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect && modelsData && modelsData.providers) {
        // Сохраняем текущее значение
        const currentValue = modelSelect.value;
        
        // Очищаем и добавляем модели
        modelSelect.innerHTML = '';
        
        // Добавляем модели из всех провайдеров
        Object.entries(modelsData.providers).forEach(([provider, config]) => {
            if (config.models && Array.isArray(config.models)) {
                config.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.id.toUpperCase()} (${provider.toUpperCase()})`;
                    modelSelect.appendChild(option);
                });
            }
        });
        
        // Восстанавливаем выбранное значение
        if (currentValue) {
            modelSelect.value = currentValue;
        }
    }
}

/**
 * Обновление текущей модели
 */
function updateCurrentModel(modelId) {
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

/**
 * Обновление статистики использования
 */
function updateUsageStats() {
    // Здесь можно добавить реальные данные от Gateway
    const usageElement = document.getElementById('statUsage');
    if (usageElement) {
        usageElement.textContent = stats.usage.today;
    }
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
            playSound('click');
        });
    });
    
    // Селектор модели
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const newModel = e.target.value;
            switchModel(newModel);
            playSound('beep');
        });
    }
    
    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchGatewayData();
            playSound('click');
            addLog('Данные обновлены', 'info');
        });
    }
    
    // Кнопка тестового запроса
    const testQueryBtn = document.getElementById('testQueryBtn');
    if (testQueryBtn) {
        testQueryBtn.addEventListener('click', () => {
            sendTestQuery();
            playSound('beep');
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
            playSound('click');
        });
    }
    
    // Переключение темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleTheme();
            playSound('click');
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
            playSound('click');
        });
    }
    
    // Кнопка помощи
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showHelpModal();
            playSound('click');
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
    
    // Обновить хлебные крошки
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = `
            <span class="crumb">HOME</span>
            <span class="separator">//</span>
            <span class="crumb active">${pageId.toUpperCase()}</span>
        `;
    }
    
    currentPage = pageId;
    addLog(`Переключено на страницу: ${pageId}`, 'info');
}

/**
 * Переключение модели
 */
async function switchModel(modelId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/model/switch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelId })
        });
        
        if (response.ok) {
            updateCurrentModel(modelId);
            addLog(`Модель успешно изменена на: ${modelId}`, 'success');
        } else {
            throw new Error('Ошибка переключения модели');
        }
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
        
        const response = await fetch(`${CONFIG.API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: testQuery,
                model: activeModel
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            addLog(`Тестовый запрос выполнен успешно. Ответ: ${data.response.substring(0, 50)}...`, 'success');
        } else {
            throw new Error('Ошибка выполнения запроса');
        }
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
    
    // Обработка команд
    switch (command