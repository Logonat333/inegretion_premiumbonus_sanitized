# Промежуточный сервис YClients ↔ PremiumBonus

TypeScript-сервис, который упрощает интеграцию между платформами YClients и PremiumBonus. Проект уже подготовлен с многоуровневой архитектурой, строгой валидацией, устойчивыми HTTP-клиентами, асинхронной обработкой и базовыми механизмами безопасности и наблюдаемости, чтобы вы могли сразу переходить к разработке бизнес-логики.

## Технологический стек
- TypeScript (strict) + ts-node-dev / tsc
- Express с Helmet, rate limiting и собственными middleware
- Axios с интерсепторами, экспоненциальным backoff + jitter, Circuit Breaker (Opossum)
- DTO-валидация через Zod
- Pino — JSON-логгер с корреляцией `traceId`
- Redis (BullMQ) для очередей и обеспечения идемпотентности
- PostgreSQL как хранилище аудита (таблица `audit_logs`)
- Абстракция над Vault / AWS Secrets Manager
- OpenAPI 3.0 (Swagger UI)
- Docker (distroless, non-root) и Kubernetes-манифест (read-only FS)
- GitHub Actions (lint/test, SAST, DAST baseline, SBOM)

## Структура репозитория
```
apps/
  middleware/
    src/
      interfaces/http/     # контроллеры, DTO, маршруты, middleware, OpenAPI
      application/         # сценарии (use-cases) и координация
      domain/              # доменные сущности, value objects
      infrastructure/      # адаптеры, persistence, конфиг, безопасность, наблюдаемость
      shared/              # ошибки, утилиты, результаты, трейсинг
    tests/                 # unit / integration / contract / e2e / load
.github/workflows/ci.yml   # CI/CD: сборка, SAST, DAST, SBOM
Dockerfile                 # distroless образ (non-root, read-only)
k8s/deployment.yaml        # деплоймент с безопасными настройками
```

## Быстрый старт
1. **Требования**
   - Node.js ≥ 18.18 (рекомендуется Node 18 LTS для полной совместимости с `opossum`; при использовании Node 20/22 появится предупреждение `EBADENGINE`)
   - Redis для BullMQ
   - PostgreSQL со схемой, содержащей таблицу `audit_logs`:
     ```sql
     CREATE TABLE IF NOT EXISTS audit_logs (
       external_purchase_id text NOT NULL,
       source text NOT NULL,
       payload jsonb NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now(),
       PRIMARY KEY (external_purchase_id, source)
     );
     ```

2. **Установка зависимостей**
   ```bash
   npm install
   ```

3. **Переменные окружения**
   - Скопируйте `.env.example` в `.env` и задайте значения (см. раздел «Секреты и конфигурация»).
   - Для локальной разработки оставьте `SECRET_PROVIDER=env`, чтобы считывать секреты напрямую из окружения.

4. **Режим разработки**
   ```bash
   npm run dev
   ```
   HTTP-интерфейс доступен по `http://localhost:${PORT}`, Swagger UI — `/docs`.

5. **Сборка и запуск (production)**
   ```bash
   npm run build
   npm start
   ```

6. **Git-процессы**
   - Активируйте GPG-подпись коммитов (`git config --global commit.gpgsign true`) и убедитесь, что ключ загружен в GitHub.
   - Основная ветка (`main`) должна быть защищена: требуйте Pull Request, успешный CI и подписанные коммиты.
   - Перед первым коммитом выполните `npm run prepare`, чтобы установить хук Husky. Хук `pre-commit` запускает `lint-staged` (ESLint + Prettier) по изменённым файлам.

## Тесты и контроль качества
- `npm run lint` — ESLint с правилами для TypeScript.
- `npm run test` — юнит-тесты на Vitest (`apps/middleware/tests`).
- `npm run test:integration` — заготовка под интеграционные тесты.
- `npm run sbom` — генерация SBOM в формате CycloneDX (`.sbom/bom.xml`).

CI-конвейер (`.github/workflows/ci.yml`) запускает lint/tests, CodeQL SAST, базовый ZAP DAST (через мок окружение) и публикует SBOM-артефакты.

## Docker и деплоймент
- **Docker**: `Dockerfile` использует двухэтапную сборку (Node builder + distroless runtime, пользователь non-root). OpenAPI-файлы попадают в итоговый образ. Пример:
  ```bash
  docker build -t yclients-premiumbonus:latest .
  docker run --rm -p 3000:3000 --env-file .env yclients-premiumbonus:latest
  ```
- **Kubernetes**: `k8s/deployment.yaml` описывает деплоймент с readiness/liveness-пробами, ресурсами, `runAsNonRoot` и read-only root filesystem (writable `/tmp`).

## Секреты и конфигурация
- `apps/middleware/src/infrastructure/config/config.ts` — единая точка загрузки конфигурации с типизацией и валидацией через Zod; профили окружений (`APP_ENV=local|dev|stage|prod`) управляют включением Swagger, маскированием ошибок и уровнем логирования запросов.
- `createSecretProvider` (infrastructure/config/secrets.ts) поддерживает Vault: AppRole или заранее выданный `VAULT_TOKEN`. Укажите `SECRET_PROVIDER=vault` и заполните `VAULT_ADDR`, `VAULT_SECRET_PATH`, `VAULT_ROLE_ID`/`VAULT_SECRET_ID` при необходимости.
- Логгер Pino (`infrastructure/observability/logger.ts`) добавляет `service`, `requestId` и `traceId`. Middleware обеспечивает распространение заголовков `x-request-id` и `x-trace-id`.

## Состояние зависимостей
- `opossum@6.x` официально поддерживает Node 12-18. На Node 20/22 npm выводит `EBADENGINE`, но пакет функционирует. Для CI/production предпочтителен Node 18 LTS либо фиксация предупреждения в документации.
- `npm audit` сообщает об уязвимостях `libxmljs2` (через `@cyclonedx/cyclonedx-npm`) и `esbuild` (через цепочку `vitest`). Обновление требует доступа к npm-реестру:
  ```bash
  npm audit fix
  npm audit fix --force # приведёт к major-обновлению Vitest (≥3)
  ```
  В офлайн-средах зафиксируйте риск и выполните обновление при следующем доступе к сети.
- Предупреждение о Husky (`husky - install command is DEPRECATED`) безвредно. При необходимости используйте `npx husky init` и `husky set` для перестройки хуков.

## Внешние интеграции
- HTTP-клиенты для YClients и PremiumBonus лежат в `infrastructure/adapters/*` и используют общий устойчивый клиент (`infrastructure/adapters/http/http-client.ts`) с ретраями, jitter и circuit breaker.
- Очередь BullMQ (`PurchaseQueue`) использует `external_purchase_id` как `jobId`, обеспечивая идемпотентность.
- Репозиторий аудита в PostgreSQL устраняет дубликаты по `(external_purchase_id, source)`.

## Контракты
- OpenAPI-спецификация: `apps/middleware/src/interfaces/http/openapi/openapi.yaml`, отдается через `/openapi.json` (+ `/docs` со Swagger UI при `APP_ENV=local|dev`).
- DTO-валидация (Zod) выполняется до вызова use-case — ошибки возвращают `400 VALIDATION`.

## Полезные ссылки
- Документация YClients API: https://developers.yclients.com/ru/
- База знаний YClients: https://help.yclients.com/
- Документация PremiumBonus API: https://doc.premiumbonus.ru/pb/
- Пример заполнения чувствительных переменных:
  - `YCLIENTS_USER_TOKEN=<ваш_токен_yclients>`
  - `PREMIUMBONUS_TOKEN=<ваш_токен_premiumbonus>`

## Подготовка к публичному GitHub-репозиторию
- Никогда не коммитьте `.env` и любые реальные токены/ключи. В репозитории должен быть только безопасный шаблон `.env.example`.
- Перед публикацией проверьте историю Git на случайно закоммиченные секреты:
  ```bash
  git log --all -S 'YCLIENTS_USER_TOKEN'
  git log --all -S 'PREMIUMBONUS_TOKEN'
  ```
- Если секрет уже попадал в историю:
  1. Отзовите/перевыпустите токен у провайдера.
  2. Перепишите историю (например, `git filter-repo`) и принудительно обновите удаленный репозиторий.
  3. Включите GitHub Secret Scanning и Push Protection в настройках репозитория.
- Рекомендуется добавить branch protection для `main`: PR-only merge, обязательный CI и запрет force-push.

## Что дальше
- Реализовать воркер PremiumBonus для обработки задач из очереди и работы с результатами/ошибками.
- Подключить реальные провайдеры секретов (Vault / AWS SM) и настроить доставку секретов в окружение.
- Дополнить интеграционные и контрактные тесты с использованием заглушек внешних сервисов.
- Добавить распределенный трейсинг (например, OpenTelemetry) при необходимости end-to-end наблюдаемости.
- Укрепить DAST, направив ZAP на тестовый стенд после его появления.
