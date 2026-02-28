# PremiumBonus Integration Service

Легковесный TypeScript-сервис для интеграции с PremiumBonus.

Сервис принимает покупки по HTTP, валидирует их, пишет аудит в Postgres, ставит задачу в Redis-очередь и отправляет покупку в PremiumBonus API.

## Что внутри

- `POST /api/v1/purchases` - принять покупку и отправить в PremiumBonus
- `GET /health/live` - liveness
- `GET /health/ready` - readiness
- `GET /docs` и `GET /openapi.json` в `local/dev` профиле

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Создайте локальный `.env` из примера:

```bash
cp .env.example .env
```

3. Заполните обязательные переменные (`PREMIUMBONUS_API_BASE_URL`, `PREMIUMBONUS_TOKEN`, `POSTGRES_CONNECTION_STRING`).

4. Запустите сервис:

```bash
npm run dev
```

## Основные переменные окружения

- `PREMIUMBONUS_API_BASE_URL` - базовый URL PremiumBonus API
- `PREMIUMBONUS_TOKEN` - токен авторизации PremiumBonus
- `POSTGRES_CONNECTION_STRING` - строка подключения к Postgres
- `REDIS_HOST`, `REDIS_PORT` - Redis для очереди
- `PORT` - порт HTTP-сервера (по умолчанию `3000`)

Полный список - в `.env.example`.

## Тесты и проверка

```bash
npm run test
npm run build
```

## Docker

```bash
docker build -t premiumbonus-integration:latest .
docker run --rm -p 3000:3000 --env-file .env premiumbonus-integration:latest
```

## Структура

- `apps/middleware/src/application` - use-cases
- `apps/middleware/src/infrastructure` - HTTP adapters, конфиг, persistence
- `apps/middleware/src/interfaces/http` - роуты, контроллеры, OpenAPI

## Безопасность

- Не коммитьте `.env`
- Используйте отдельные токены для `dev/stage/prod`
- Включите Secret Scanning и Push Protection в GitHub
