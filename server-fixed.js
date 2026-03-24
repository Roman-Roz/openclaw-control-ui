/**
 * 🚀 OpenClaw Cyberpunk Control Panel - Fixed Version
 * 
 * Исправленная версия сервера с GitHub интеграцией
 */

const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

// Конфигурация
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Создание Express приложения
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// GitHub API эмуляция (для демо)
const githubDemoData = {
    user: {
        login: 'cyberpunk-user',
        name: 'Cyberpunk Developer',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
        public_repos: 42,
        followers: 128,
        following: 64
    },
    stats: {
        totalStats: {
            repos: 42,
            stars: 1250,
            forks: 320,
            issues: 89,
            prs: 24
        },
        languageStats: {
            JavaScript: { percentage: 45, bytes: 1250000 },
            TypeScript: { percentage: 25, bytes: 750000 },
            Python: { percentage: 15, bytes: 450000 },
            HTML: { percentage: 10, bytes: 300000 },
            CSS: { percentage: 5, bytes: 150000 }
        },
        activityStats: {
            today: 8,
            week: 42,
            month: 156,
            total: 1248
        }
    },
    repos: [
        {
            name: 'openclaw-cyberpunk-panel',
            full_name: 'cyberpunk-user/openclaw-cyberpunk-panel',
            description: 'Cyberpunk control panel for OpenClaw with GitHub integration',
            html_url: 'https://github.com/cyberpunk-user/openclaw-cyberpunk-panel',
            stargazers_count: 125,
            forks_count: 32,
            watchers_count: 89,
            language: 'JavaScript',
            updated_at: '2026-03-21T10:00:00Z'
        },
        {
            name: 'ai-assistant',
            full_name: 'cyberpunk-user/ai-assistant',
            description: 'AI assistant for code review and development',
            html_url: 'https://github.com/cyberpunk-user/ai-assistant',
            stargazers_count: 89,
            forks_count: 21,
            watchers_count: 56,
            language: 'Python',
            updated_at: '2026-03-20T15:30:00Z'
        },
        {
            name: 'cyberpunk-ui',
            full_name: 'cyberpunk-user/cyberpunk-ui',
            description: 'Cyberpunk UI components library',
            html_url: 'https://github.com/cyberpunk-user/cyberpunk-ui',
            stargazers_count: 67,
            forks_count: 18,
            watchers_count: 42,
            language: 'TypeScript',
            updated_at: '2026-03-19T12:45:00Z'
        }
    ],
    issues: [
        {
            number: 42,
            title: 'Add dark mode toggle',
            state: 'open',
            created_at: '2026-03-21T09:00:00Z',
            user: { login: 'developer1' },
            labels: [{ name: 'enhancement' }, { name: 'ui' }]
        },
        {
            number: 41,
            title: 'Fix WebSocket connection issue',
            state: 'open',
            created_at: '2026-03-20T14:30:00Z',
            user: { login: 'developer2' },
            labels: [{ name: 'bug' }, { name: 'websocket' }]
        },
        {
            number: 40,
            title: 'Add GitHub OAuth support',
            state: 'open',
            created_at: '2026-03-19T11:15:00Z',
            user: { login: 'developer3' },
            labels: [{ name: 'feature' }, { name: 'auth' }]
        }
    ]
};

// GitHub API Routes
app.get('/api/github/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'github-api',
        version: '1.0.0',
        mode: 'demo',
        message: 'GitHub API running in demo mode'
    });
});

app.get('/api/github/user', (req, res) => {
    res.json(githubDemoData.user);
});

app.get('/api/github/stats', (req, res) => {
    res.json(githubDemoData.stats);
});

app.get('/api/github/user/repos', (req, res) => {
    const { per_page = 10, page = 1 } = req.query;
    const start = (page - 1) * per_page;
    const end = start + parseInt(per_page);
    
    res.json({
        items: githubDemoData.repos.slice(start, end),
        total_count: githubDemoData.repos.length,
        page: parseInt(page),
        per_page: parseInt(per_page)
    });
});

app.get('/api/github/repos/:owner/:repo/issues', (req, res) => {
    const { state = 'open', per_page = 5 } = req.query;
    
    const filteredIssues = githubDemoData.issues.filter(issue => 
        issue.state === state
    ).slice(0, parseInt(per_page));
    
    res.json({
        items: filteredIssues,
        total_count: filteredIssues.length,
        state,
        per_page: parseInt(per_page)
    });
});

app.post('/api/github/token', (req, res) => {
    const { token } = req.body;
    
    if (token && token.startsWith('ghp_')) {
        res.json({
            status: 'success',
            message: 'GitHub token updated successfully',
            mode: 'authenticated'
        });
    } else {
        res.json({
            status: 'demo',
            message: 'Using demo mode. Provide a valid GitHub token for real data.',
            mode: 'demo'
        });
    }
});

// System Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'openclaw-cyberpunk-panel',
        version: '2.0.0',
        features: ['github-integration', 'cyberpunk-ui', 'real-time-updates', 'websocket'],
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/system/info', (req, res) => {
    res.json({
        system: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        },
        server: {
            port: PORT,
            public_dir: PUBLIC_DIR,
            started_at: new Date().toISOString()
        },
        github: {
            mode: 'demo',
            endpoints: [
                '/api/github/health',
                '/api/github/user',
                '/api/github/stats',
                '/api/github/user/repos',
                '/api/github/repos/:owner/:repo/issues',
                '/api/github/token'
            ]
        }
    });
});

// Simple version route
app.get('/simple', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index-simple.html'));
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// WebSocket для реального времени
wss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    
    // Отправка heartbeat каждые 30 секунд
    const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            }));
        }
    }, 30000);
    
    // Отправка обновлений GitHub данных каждые 60 секунд
    const updateInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'github:update',
                timestamp: new Date().toISOString(),
                data: {
                    stats: githubDemoData.stats,
                    activity: Math.floor(Math.random() * 10) + 1
                }
            }));
        }
    }, 60000);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message:', data);
            
            // Обработка команд
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;
                    
                case 'github:refresh':
                    ws.send(JSON.stringify({
                        type: 'github:update',
                        timestamp: new Date().toISOString(),
                        data: {
                            stats: githubDemoData.stats,
                            message: 'Data refreshed'
                        }
                    }));
                    break;
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔗 WebSocket client disconnected');
        clearInterval(heartbeatInterval);
        clearInterval(updateInterval);
    });
    
    // Отправка приветственного сообщения
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to OpenClaw Cyberpunk Control Panel',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: ['github-integration', 'real-time-updates', 'websocket']
    }));
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  ██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██
  ██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██
  ██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
   🦞 OPENCLAW CYBERPUNK CONTROL PANEL v2.0.0
   🚀 WITH GITHUB INTEGRATION (FIXED VERSION)
  
🚀 Панель управления запущена на http://localhost:${PORT}
🌍 Режим: development
📁 Статические файлы: ${PUBLIC_DIR}

📋 Доступные эндпоинты:
   • Панель управления: http://localhost:${PORT}
   • GitHub API: http://localhost:${PORT}/api/github
   • Health check: http://localhost:${PORT}/health
   • System info: http://localhost:${PORT}/system/info
   • Simple version: http://localhost:${PORT}/simple

🔗 GitHub Integration:
   • Mode: DEMO (working)
   • WebSocket: ✅ Active
   • Real-time: ✅ Enabled

🛑 Для остановки нажмите Ctrl+C
    `);
});

// Обработка ошибок
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    wss.close();
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});