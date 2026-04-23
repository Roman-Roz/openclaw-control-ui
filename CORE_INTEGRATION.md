# 📊 GitHub Stats & Issues Module - Встроен в ядро

## ✅ Выполненные улучшения

### 1. Расширенная статистика репозиториев (`GitHubService`)

#### Новые методы:
- `initializeStatsModule(username)` - инициализация модуля статистики
- `calculateStats()` - расчет общей статистики (репозитории, звезды, форки, watchers, issues)
- `getRepoDetailedStats(owner, repo)` - детальная статистика по конкретному репозиторию
- `calculateRepoHealthScore(repo)` - расчет health score репозитория (0-100)
- `getStats()` - получение текущей статистики
- `startAutoRefresh(interval)` - авто-обновление статистики
- `stopAutoRefresh()` - остановка авто-обновления

#### Статистика включает:
- Общее количество репозиториев
- Суммарные звезды, форки, watchers
- Статистика по языкам программирования (топ-10 с процентами)
- Активность (сегодня, неделя, месяц)
- Health score репозитория (наличие README, license, topics, активность)

### 2. Мониторинг Issues с уведомлениями (`GitHubService`)

#### Новые методы:
- `initializeIssuesModule()` - инициализация модуля мониторинга
- `watchRepo(owner, repo, config)` - добавить репозиторий для отслеживания
- `unwatchRepo(owner, repo)` - удалить репозиторий из отслеживания
- `checkForNewIssues()` - проверка новых и обновленных issues
- `shouldNotify(issue, config, eventType)` - проверка необходимости уведомления
- `subscribe(callback)` - подписка на уведомления
- `startPolling()` - запуск polling (каждые 5 минут)
- `stopPolling()` - остановка polling

#### Фильтры уведомлений:
- Новые issues
- Обновления существующих issues
- Комментарии
- Упоминания
- Specific labels (bug, urgent, critical)
- Только назначенные на вас
- Только участвующие

### 3. Новые API эндпоинты (`/api/github`)

#### Статистика:
```
POST   /api/github/stats/init          - Инициализировать модуль статистики
GET    /api/github/stats               - Получить текущую статистику
POST   /api/github/stats/refresh       - Обновить статистику
GET    /api/github/stats/:owner/:repo  - Детальная статистика репозитория
POST   /api/github/stats/auto-refresh/start  - Запустить авто-обновление
POST   /api/github/stats/auto-refresh/stop   - Остановить авто-обновление
```

#### Issues:
```
POST   /api/github/issues/init         - Инициализировать модуль мониторинга
POST   /api/github/issues/watch        - Добавить репозиторий для отслеживания
DELETE /api/github/issues/unwatch/:owner/:repo - Удалить из отслеживания
GET    /api/github/issues/watching     - Список отслеживаемых репозиториев
POST   /api/github/issues/check        - Проверить новые issues
GET    /api/github/issues/subscribe    - Подписаться на уведомления
```

### 4. Интеграция с WebSocket

Модуль поддерживает подписку на уведомления через callback:
```typescript
const unsubscribe = githubService.subscribe((data) => {
  console.log('Notification:', data);
  // Отправка через WebSocket клиентам
});
```

## 🔧 Использование

### Инициализация статистики:
```bash
curl -X POST http://localhost:3000/api/github/stats/init \
  -H "Content-Type: application/json" \
  -d '{"username": "your-github-username"}'
```

### Получение статистики:
```bash
curl http://localhost:3000/api/github/stats
```

### Детальная статистика репозитория:
```bash
curl http://localhost:3000/api/github/stats/owner/repo-name
```

### Начало отслеживания Issues:
```bash
# Инициализация
curl -X POST http://localhost:3000/api/github/issues/init

# Добавить репозиторий
curl -X POST http://localhost:3000/api/github/issues/watch \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "owner-name",
    "repo": "repo-name",
    "config": {
      "notifyOn": {
        "new": true,
        "updates": true,
        "labels": ["bug", "critical"]
      }
    }
  }'
```

### Проверка новых Issues:
```bash
curl -X POST http://localhost:3000/api/github/issues/check
```

## 📁 Измененные файлы

1. **src/services/githubService.ts** - Основные улучшения:
   - Добавлены интерфейсы: `RepoStats`, `LanguageStats`, `ActivityStats`, `RepoHealth`, `IssueNotification`
   - Добавлены свойства для модулей статистики и issues
   - Реализованы все методы для статистики и мониторинга
   - Вспомогательные методы для работы с GitHub API

2. **src/routes/github.ts** - Новые маршруты:
   - 10 новых эндпоинтов для статистики
   - 6 новых эндпоинтов для мониторинга issues

## 🎯 Преимущества

1. **Централизация** - Все функции GitHub интегрированы в единый сервис
2. **TypeScript** - Полная типизация всех новых методов
3. **Гибкость** - Настраиваемые фильтры и интервалы обновления
4. **Производительность** - Кэширование результатов запросов
5. **Расширяемость** - Легко добавить новые функции мониторинга

## 🔄 Миграция

Старые модули из `modules/github/` могут быть удалены или использоваться как reference:
- `modules/github/stats-module.js` → встроен в `githubService.ts`
- `modules/github/issues-module.js` → встроен в `githubService.ts`
- `modules/github/api-client.js` → методы интегрированы в `githubService.ts`

## 📝 Заметки

- Polling для issues запускается автоматически при инициализации
- Авто-обновление статистики можно включить отдельно
- Все методы поддерживают отмену подписки
- Health score рассчитывается по формуле: база 50 + бонусы (максимум 100)
