# GitHub Integration

Сервис интеграции с GitHub API для автоматизации работы с репозиториями, Pull Request'ами и Issues.

## Возможности

- ✅ Работа с файлами репозитория (чтение, создание, обновление)
- ✅ Управление ветками (создание, получение информации)
- ✅ Создание и управление Pull Request'ами
- ✅ Добавление комментариев к PR
- ✅ Получение истории коммитов
- ✅ Создание Issues
- ✅ Обработка webhook'ов от GitHub
- ✅ Встроенный кэш для оптимизации запросов

## Настройка

### Переменные окружения

```bash
# GitHub Token (обязательно)
GITHUB_TOKEN=your_github_token

# Владелец репозитория (обязательно)
GITHUB_OWNER=username

# Название репозитория (обязательно)
GITHUB_REPO=repository-name
```

### Создание GitHub Token

1. Перейдите в [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Нажмите "Generate new token (classic)"
3. Выберите разрешения:
   - `repo` - полный доступ к репозиториям
   - `workflow` - для управления GitHub Actions (опционально)
4. Скопируйте токен и добавьте в `.env`

## API Endpoints

### Health Check

Проверка подключения к GitHub:

```bash
GET /api/github/health
```

Ответ:
```json
{
  "status": "connected",
  "repository": {
    "name": "my-repo",
    "full_name": "username/my-repo",
    "default_branch": "main"
  }
}
```

### Репозиторий

Получить информацию о репозитории:

```bash
GET /api/github/repo
```

### Ветки

Создать новую ветку:

```bash
POST /api/github/branches
Content-Type: application/json

{
  "branchName": "feature/new-feature",
  "baseBranch": "main"
}
```

### Файлы

Получить список файлов:

```bash
GET /api/github/files?path=src
```

Получить содержимое файла:

```bash
GET /api/github/files/path/to/file.ts?branch=main
```

Обновить или создать файл:

```bash
PUT /api/github/files/path/to/file.ts
Content-Type: application/json

{
  "content": "console.log('Hello World');",
  "message": "Update file via API",
  "branch": "main",
  "sha": "optional-file-sha"
}
```

### Pull Request'ы

Создать Pull Request:

```bash
POST /api/github/pulls
Content-Type: application/json

{
  "title": "Add new feature",
  "body": "Description of changes",
  "head": "feature/new-feature",
  "base": "main"
}
```

Получить информацию о PR:

```bash
GET /api/github/pulls/:pullNumber
```

Добавить комментарий к PR:

```bash
POST /api/github/pulls/:pullNumber/comments
Content-Type: application/json

{
  "comment": "LGTM! 👍"
}
```

### Коммиты

Получить последние коммиты:

```bash
GET /api/github/commits?branch=main&limit=10
```

### Issues

Создать Issue:

```bash
POST /api/github/issues
Content-Type: application/json

{
  "title": "Bug: Something is broken",
  "body": "Steps to reproduce...",
  "labels": ["bug", "priority"]
}
```

### Webhooks

Обработка webhook'ов от GitHub:

```bash
POST /api/github/webhook
X-GitHub-Event: push
Content-Type: application/json

{ ... payload ... }
```

Поддерживаемые события:
- `push` - автоматическая инвалидация кэша
- `pull_request` - логирование событий PR
- `issues` - логирование событий Issues

### Кэш

Очистить кэш:

```bash
DELETE /api/github/cache
```

Получить статистику кэша:

```bash
GET /api/github/cache/stats
```

## Интеграция с Task Queue

GitHub Service может использоваться вместе с Task Queue для автоматического создания PR после выполнения задач:

```typescript
// Пример: Автоматическое создание PR после анализа кода
const task = await taskQueueService.addTask('fix', {
  filePath: 'src/example.ts',
  description: 'Fix bugs in example.ts'
});

// После выполнения задачи можно автоматически создать PR
const githubService = new GitHubService(config);
await githubService.createBranch('fix/example-bugs');
await githubService.updateFile('src/example.ts', fixedContent, 'Fix bugs');
await githubService.createPullRequest(
  'Fix bugs in example.ts',
  'Automated fix by OpenClaw',
  'fix/example-bugs'
);
```

## Примеры использования

### Node.js

```javascript
import GitHubService from './services/githubService.js';

const github = new GitHubService({
  token: process.env.GITHUB_TOKEN,
  owner: 'my-org',
  repo: 'my-repo'
});

// Получить файл
const file = await github.getFileContent('README.md');
console.log(file.content);

// Создать ветку и PR
await github.createBranch('feature/update');
await github.updateFile('src/index.ts', newCode, 'Update index');
const pr = await github.createPullRequest(
  'Update index.ts',
  'Automated update',
  'feature/update'
);
```

### cURL

```bash
# Проверка подключения
curl http://localhost:3000/api/github/health

# Получить файлы
curl http://localhost:3000/api/github/files

# Создать Issue
curl -X POST http://localhost:3000/api/github/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Issue","body":"Testing API"}'
```

## Кэширование

GitHub Service использует встроенный кэш (NodeCache) для оптимизации запросов:

- **TTL по умолчанию**: 5 минут
- **Кэшируемые данные**: информация о репозитории, файлы, коммиты
- **Автоматическая инвалидация**: при получении webhook'ов

Статистика кэша доступна через `/api/github/cache/stats`.

## Обработка ошибок

Все endpoints возвращают ошибки в формате:

```json
{
  "error": "Error message"
}
```

Возможные ошибки:
- `400 Bad Request` - неверные параметры
- `401 Unauthorized` - неверный токен GitHub
- `404 Not Found` - ресурс не найден
- `500 Internal Server Error` - ошибка сервера

## Безопасность

- Токен GitHub хранится в переменной окружения
- Все запросы к GitHub API используют HTTPS
- Рекомендуется использовать Fine-grained tokens с минимальными разрешениями
- Rate limiting применяется на уровне Express middleware

## Лицензия

MIT
