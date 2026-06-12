# PD Control — учёт запросов субъектов персональных данных

Защищённое SPA-приложение для регистрации и обработки обращений субъектов персональных данных.

## Стек

- React + Vite;
- Node.js + Express;
- PostgreSQL 16;
- JWT, bcrypt, Helmet, CORS;
- Nodemailer для подтверждения email;
- GitHub Actions для тестов и production-сборки.

## Возможности

- регистрация с подтверждением email;
- вход по логину или email;
- JWT-аутентификация и роли `USER`, `EMPLOYEE`, `ADMIN`;
- создание, просмотр, обработка и удаление обращений;
- серверная фильтрация, поиск и пагинация;
- управление пользователями и ролями;
- комментарии сотрудников;
- журналирование действий;
- корректная обработка HTTP 400, 401, 403, 404, 409 и 500.

## Локальный запуск

### 1. PostgreSQL

```bash
docker compose up -d
```

Проверка состояния:

```bash
docker compose ps
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

Перед запуском укажите реальные SMTP-параметры и замените `JWT_SECRET` в `.env`.

### 3. Frontend

```bash
cd frontend
npm ci
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health-check: `http://localhost:5000/api/health`

## Обновление существующей базы

Для действующей базы один раз выполните:

```bash
docker exec -i pd_requests_postgres \
  psql -U pd_app -d pd_requests_db \
  < backend/src/db/migrate_requirements.sql
```

## Проверки

```bash
cd backend && npm test
cd ../frontend && npm test
npm run build
```

## Основные маршруты API

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-code`
- `POST /api/auth/login`
- `GET /api/requests?page=1&limit=10&status=&type=&search=`
- `GET /api/requests/summary`
- `POST /api/requests`
- `PUT /api/requests/:id`
- `DELETE /api/requests/:id`
- `GET /api/users`
- `PUT /api/users/:id/role`
- `DELETE /api/users/:id`
- `GET /api/audit-logs`
