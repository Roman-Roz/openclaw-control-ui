# Очередь задач (Task Queue)

Реализована система асинхронной обработки задач на основе **BullMQ** и **Redis**.

## Возможности

- **Асинхронная обработка**: Задачи выполняются в фоновом режиме без блокировки основного потока
- **Приоритеты**: Поддержка приоритетов задач (1-10)
- **Повторные попытки**: Автоматические повторные попытки при ошибках (до 3 раз)
- **Отложенное выполнение**: Возможность отложить выполнение задачи
- **Мониторинг**: Статистика по очередям и статусам задач
- **Graceful Shutdown**: Корректное завершение работы при остановке сервера

## Типы задач

1. **analyze** - Анализ кода
2. **fix** - Исправление ошибок в коде
3. **generate** - Генерация кода по требованиям
4. **custom** - Пользовательские задачи

## API Endpoints

### Создать задачу
```bash
POST /api/tasks
Content-Type: application/json

{
  "type": "analyze",
  "data": { "code": "...", "context": "..." },
  "agentId": "default",
  "model": "gpt-4",
  "priority": 5,
  "delay": 1000
}
```

### Быстрые эндпоинты
```bash
# Анализ кода
POST /api/tasks/analyze
{
  "code": "...",
  "context": "...",
  "agentId": "default"
}

# Исправление кода
POST /api/tasks/fix
{
  "code": "...",
  "issue": "Memory leak detected"
}

# Генерация кода
POST /api/tasks/generate
{
  "requirement": "Create REST API endpoint",
  "language": "TypeScript",
  "framework": "Express"
}
```

### Получить статус задачи
```bash
GET /api/tasks/:jobId
```

### Отменить задачу
```bash
DELETE /api/tasks/:jobId
```

### Статистика очереди
```bash
GET /api/tasks/stats
```

Ответ:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 100,
    "failed": 3,
    "total": 110
  }
}
```

## Конфигурация

Переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `REDIS_HOST` | Хост Redis | `localhost` |
| `REDIS_PORT` | Порт Redis | `6379` |
| `WORKER_CONCURRENCY` | Количество одновременных воркеров | `5` |

## Пример использования

```javascript
// Добавление задачи анализа
const response = await fetch('/api/tasks/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'function test() { return 42; }',
    context: 'Unit testing'
  })
});

const { data } = await response.json();
console.log('Job ID:', data.jobId);

// Проверка статуса
const statusResponse = await fetch(`/api/tasks/${data.jobId}`);
const { data: status } = await statusResponse.json();
console.log('Status:', status.status);
```

## Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│  API Server  │────▶│  Task Queue  │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │    Worker    │
                                         │  (Process)   │
                                         └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   Gateway    │
                                         │   Service    │
                                         └──────────────┘
```

## Обработка ошибок

- При ошибке выполнения задача автоматически повторяется (exponential backoff)
- После исчерпания попыток задача помечается как failed
- Failed задачи сохраняются для последующего анализа
- Клиент может получить информацию об ошибке через GET /api/tasks/:jobId

## Интеграция с Gateway

Задачи используют `GatewayService` для взаимодействия с OpenClaw Gateway CLI:
- Поддержка переключения моделей
- Mock-режим для разработки (при недоступности CLI)
- Логирование всех операций
