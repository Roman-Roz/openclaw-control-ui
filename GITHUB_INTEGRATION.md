# 🚀 GitHub Integration for OpenClaw Cyberpunk Control Panel

## 📋 Обзор

Полная интеграция GitHub API в киберпанк-панель управления OpenClaw. Включает статистику репозиториев, отслеживание issues, мониторинг активности и многое другое.

## 🎯 Возможности

### ✅ Реализовано:
1. **GitHub Stats Dashboard** - статистика репозиториев
2. **Issue Notifier** - уведомления о issues
3. **Repo Explorer** - навигация по репозиториям
4. **Real-time Updates** - WebSocket для обновлений в реальном времени
5. **Cyberpunk UI** - интерфейс в стиле киберпанк

### ⏳ В разработке:
1. **CI/CD Monitor** - мониторинг GitHub Actions
2. **Code Review Assistant** - AI-помощник для code review
3. **Advanced Search** - расширенный поиск по коду

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
cd /home/pc/.openclaw/workspace/openclaw-cyberpunk-panel
npm install
```

### 2. Настройка GitHub Token (опционально)
```bash
# Создайте Personal Access Token на GitHub:
# 1. Перейдите на https://github.com/settings/tokens
# 2. Нажмите "Generate new token"
# 3. Выберите scopes: repo, user, notifications
# 4. Скопируйте токен

# Установите токен как переменную окружения
export GITHUB_TOKEN=your_token_here
```

### 3. Запуск сервера
```bash
# Запуск с GitHub интеграцией (основной)
npm start

# Или запуск упрощённой версии (без GitHub)
npm run simple
```

### 4. Открытие в браузере
```
http://localhost:3000
```

## 📁 Структура проекта

```
openclaw-cyberpunk-panel/
├── modules/github/              # GitHub модули
│   ├── config.js               # Конфигурация
│   ├── api-client.js           # GitHub API клиент
│   ├── stats-module.js         # Модуль статистики
│   ├── issues-module.js        # Модуль issues
│   ├── index.js                # Основной модуль
│   └── server-api.js           # Express API
├── public/                     # Фронтенд файлы
│   ├── index-github.html       # Главная страница с GitHub
│   ├── index-simple.html       # Упрощённая версия
│   ├── modules/
│   │   ├── github-client.js    # Браузерный клиент
│   │   └── github-ui.js        # UI компоненты
│   ├── github-integration.js   # Основная логика
│   ├── github-utils.js         # Утилиты
│   └── script-simple.js        # Базовый скрипт
├── server-with-github.js       # Сервер с GitHub
├── server-minimal.js           # Упрощённый сервер
└── package.json
```

## 🔧 API Эндпоинты

### GitHub API (`/api/github`)
- `GET /health` - проверка состояния
- `GET /user` - информация о пользователе
- `GET /user/repos` - репозитории пользователя
- `GET /stats` - статистика
- `GET /repos/:owner/:repo` - информация о репозитории
- `GET /repos/:owner/:repo/issues` - issues репозитория
- `POST /repos/:owner/:repo/watch` - отслеживание репозитория
- `GET /search/repos` - поиск репозиториев
- `POST /token` - обновление токена

### Системные эндпоинты
- `GET /health` - health check
- `GET /system/info` - информация о системе
- `GET /simple` - упрощённая версия
- `GET /` - главная страница с GitHub

## 🎨 UI Компоненты

### 1. GitHub Stats Dashboard
- Общая статистика репозиториев
- Языки программирования
- Активность (сегодня/неделя/месяц)
- Rate limit информация

### 2. Repository Explorer
- Список репозиториев
- Поиск и фильтрация
- Быстрый доступ к GitHub

### 3. Issues Tracker
- Открытые issues
- Фильтрация по labels
- Уведомления о новых issues

### 4. Real-time Updates
- WebSocket подключение
- Автоматическое обновление
- Уведомления в реальном времени

## 🔐 Аутентификация

### Варианты:
1. **Personal Access Token** - через переменную окружения `GITHUB_TOKEN`
2. **OAuth** - (в разработке)
3. **Без аутентификации** - ограниченный доступ к публичным данным

### Настройка токена:
```javascript
// Через UI
githubClient.updateToken('your_token_here');

// Через API
POST /api/github/token
{
  "token": "your_token_here"
}
```

## ⚡ Производительность

### Кэширование:
- Автоматическое кэширование запросов
- TTL: 5 минут
- Максимальный размер: 100 записей

### Rate Limiting:
- Отслеживание лимитов GitHub API
- Автоматическая пауза при достижении лимита
- Отображение оставшихся запросов

### Оптимизации:
- Ленивая загрузка данных
- Пакетные запросы
- WebSocket для реального времени

## 🐛 Отладка

### Логирование:
```bash
# Запуск с подробным логированием
DEBUG=github* npm start

# Просмотр логов в реальном времени
tail -f /tmp/openclaw-cyberpunk.log
```

### Консоль браузера:
- Откройте Developer Tools (F12)
- Перейдите на вкладку Console
- Проверьте ошибки и предупреждения

### Проверка подключения:
```bash
# Проверка health check
curl http://localhost:3000/health

# Проверка GitHub API
curl http://localhost:3000/api/github/health
```

## 🔄 Обновление

### Обновление зависимостей:
```bash
npm update
```

### Обновление кода:
```bash
git pull origin main
npm install
```

### Миграция данных:
- Кэш автоматически очищается при обновлении
- Настройки сохраняются в localStorage

## 📈 Мониторинг

### Метрики:
- Время ответа API
- Количество запросов
- Использование памяти
- Rate limit статус

### Алёрты:
- GitHub API недоступен
- Rate limit превышен
- Ошибки аутентификации
- Проблемы с WebSocket

## 🤝 Вклад в разработку

### Установка для разработки:
```bash
git clone <repository-url>
cd openclaw-cyberpunk-panel
npm install
npm run dev
```

### Структура кода:
- Модульная архитектура
- Чистые функции
- Комментарии на русском языке
- Тесты (в разработке)

### Code Style:
- ESLint конфигурация
- Prettier для форматирования
- Коммиты по Conventional Commits

## 🚨 Устранение неполадок

### Проблема: GitHub не подключается
**Решение:**
1. Проверьте интернет-подключение
2. Убедитесь, что токен действителен
3. Проверьте настройки брандмауэра

### Проблема: Страница зависает на загрузке
**Решение:**
1. Очистите кэш браузера (Ctrl+Shift+Delete)
2. Проверьте консоль на ошибки JavaScript
3. Попробуйте упрощённую версию (`/simple`)

### Проблема: Нет данных
**Решение:**
1. Проверьте аутентификацию
2. Убедитесь, что у пользователя есть репозитории
3. Проверьте rate limit

### Проблема: WebSocket не работает
**Решение:**
1. Проверьте поддержку WebSocket в браузере
2. Убедитесь, что порт 3000 открыт
3. Проверьте настройки прокси

## 📞 Поддержка

### Каналы связи:
- GitHub Issues: для багов и feature requests
- Discord: для обсуждения и помощи
- Документация: для справки

### Полезные ссылки:
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Cyberpunk UI Components](https://github.com/cyberpunk-ui)

## 🎉 Что дальше?

### Планируемые функции:
1. **GitHub Actions Dashboard** - мониторинг workflow
2. **Code Review AI** - автоматический анализ кода
3. **Repository Templates** - быстрые шаблоны
4. **Team Collaboration** - управление командами
5. **Advanced Analytics** - детальная аналитика

### Roadmap:
- Q2 2026: CI/CD мониторинг
- Q3 2026: Code review ассистент
- Q4 2026: Расширенная аналитика
- Q1 2027: Мобильное приложение

---

**Готово!** Теперь у вас есть полноценная GitHub интеграция в киберпанк-панели управления OpenClaw. 🚀