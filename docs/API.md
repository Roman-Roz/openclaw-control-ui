# OpenClaw Cyberpunk Control Panel - API Documentation

## Base URL
```
http://localhost:3000
```

## Endpoints

### Health & Status

#### GET /health
Проверка работоспособности сервера.

**Response:**
```json
{
  "status": "ok",
  "service": "openclaw-cyberpunk-panel",
  "version": "2.0.0",
  "gateway": "http://127.0.0.1:18789",
  "uptime": 12345.67,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /system/info
Получение системной информации.

**Response:**
```json
{
  "panel": {
    "version": "2.0.0",
    "nodeVersion": "v18.0.0",
    "environment": "development",
    "uptime": 12345.67
  },
  "gateway": {
    "available": true,
    "url": "http://127.0.0.1:18789",
    "lastCheck": "2024-01-01T00:00:00.000Z"
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "memory": { "rss": 123456, "heapTotal": 123456, "heapUsed": 123456, "external": 123456 },
    "cpus": 8
  },
  "websocket": {
    "connectedClients": 5,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Gateway API

#### GET /api/status
Получение статуса OpenClaw Gateway.

**Response:**
```json
{
  "running": true,
  "pid": "12345",
  "port": 18789,
  "url": "http://127.0.0.1:18789",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/agents
Получение списка агентов.

**Response:**
```json
[
  {
    "id": "main",
    "status": "active",
    "model": "openrouter/auto"
  },
  {
    "id": "coding",
    "status": "inactive",
    "model": "deepseek-coder"
  }
]
```

#### GET /api/models
Получение списка доступных моделей.

**Response:**
```json
{
  "providers": {
    "openrouter": {
      "models": [
        { "id": "openrouter/auto", "name": "OpenRouter Auto", "cost": 0 }
      ]
    },
    "deepseek": {
      "models": [
        { "id": "deepseek-coder", "name": "DeepSeek Coder", "cost": 0.0001 },
        { "id": "deepseek-chat", "name": "DeepSeek Chat", "cost": 0.0001 }
      ]
    },
    "google": {
      "models": [
        { "id": "google/gemini-1.5-flash", "name": "Gemini 1.5 Flash", "cost": 0 }
      ]
    }
  }
}
```

#### POST /api/model/switch
Переключение активной модели.

**Request:**
```json
{
  "modelId": "openrouter/auto"
}
```

**Response:**
```json
{
  "success": true,
  "model": "openrouter/auto",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "error": {
    "status": 400,
    "message": "modelId is required",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "abc123",
    "path": "/api/model/switch"
  }
}
```

#### POST /api/command
Отправка команды в Gateway.

**Request:**
```json
{
  "command": "restart agent"
}
```

**Response:**
```json
{
  "success": true,
  "result": "Executed: restart agent",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### WebSocket

#### GET /ws/stats
Статистика WebSocket подключений.

**Response:**
```json
{
  "connectedClients": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### WebSocket Connection
Подключение к WebSocket серверу:
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Отправка сообщения
ws.send(JSON.stringify({
  type: 'ping'
}));
```

**Message Types:**
- `welcome` - Приветственное сообщение при подключении
- `heartbeat` - Периодический сигнал активности
- `pong` - Ответ на ping
- `subscribed` - Подтверждение подписки
- `error` - Сообщение об ошибке

## Error Handling

Все ошибки возвращаются в едином формате:

```json
{
  "error": {
    "status": 400,
    "message": "Error description",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique-request-id",
    "path": "/api/endpoint"
  }
}
```

**HTTP Status Codes:**
- `200` - Успех
- `400` - Неверный запрос
- `404` - Ресурс не найден
- `429` - Превышен лимит запросов (Rate Limit)
- `500` - Внутренняя ошибка сервера

## Rate Limiting

- **Общий лимит:** 100 запросов в минуту с одного IP
- **API лимит:** 30 запросов в минуту для `/api/*` endpoints
- **WebSocket лимит:** 10 подключений в минуту

При превышении лимита возвращается ответ `429 Too Many Requests`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Порт сервера |
| NODE_ENV | development | Режим работы |
| GATEWAY_URL | http://127.0.0.1:18789 | URL Gateway |
| LOG_LEVEL | info | Уровень логирования |
| RATE_LIMIT_MAX | 100 | Макс. запросов в минуту |
| RATE_LIMIT_WINDOW_MS | 60000 | Окно rate limiting (мс) |
| WS_HEARTBEAT_INTERVAL | 5000 | Интервал heartbeat (мс) |

## Security Features

- **Helmet** - Безопасные HTTP заголовки
- **CORS** - Контроль跨domain доступа
- **Rate Limiting** - Защита от DDoS
- **Input Sanitization** - Очистка входных данных
- **Content-Type Validation** - Проверка типа контента
