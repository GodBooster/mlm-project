# MLM Investment Platform - Backend

Универсальная система очередей для обработки всех типов начислений в инвестиционной платформе MLM.

## 🚀 Возможности

### Система Очередей
- **Daily Profit** - ежедневные начисления по инвестиционным пакетам
- **Deposit** - обработка депозитов через очередь
- **Referral Bonus** - реферальные бонусы
- **Rank Bonus** - бонусы за достижение рангов
- **Rank Reward** - награды за ранги
- **Bonus** - общие бонусы

### Автоматизация
- Планировщик для ежедневных начислений (00:01 и 12:01 UTC)
- Обработка ошибок и повторные попытки
- Логирование всех операций

## 📋 Требования

- Node.js 18+
- PostgreSQL 12+
- pg-boss для очередей

## 🛠 Установка

1. **Установите зависимости:**
```bash
npm install
```

2. **Настройте базу данных PostgreSQL:**
```bash
# Создайте пользователя и базу данных
sudo -u postgres psql
CREATE USER mlm_user WITH PASSWORD 'mlm_password';
CREATE DATABASE mlm_database;
GRANT ALL PRIVILEGES ON DATABASE mlm_database TO mlm_user;
\q
```

3. **Создайте файл .env:**
```bash
DATABASE_URL="postgresql://mlm_user:mlm_password@localhost:5432/mlm_database"
PORT=3001
```

4. **Выполните миграции:**
```bash
npm run db:migrate
npm run db:generate
```

5. **Инициализируйте тестовые данные:**
```bash
npm run db:seed
```

6. **Запустите сервер:**
```bash
npm start
```

## 📊 API Endpoints

### Инвестиции
- `POST /api/investments` - создать инвестицию
- `GET /api/investments/user/:userId` - получить инвестиции пользователя
- `GET /api/investments/stats/:userId` - статистика инвестиций

### Рефералы
- `POST /api/referrals/process` - обработать реферал
- `GET /api/referrals/user/:userId` - получить рефералов пользователя
- `GET /api/referrals/stats/:userId` - статистика рефералов
- `GET /api/referrals/tree/:userId` - реферальное дерево

### Ранги
- `GET /api/ranks` - получить все ранги
- `GET /api/ranks/user/:userId` - получить ранг пользователя
- `POST /api/ranks/update/:userId` - обновить ранг пользователя
- `GET /api/ranks/progress/:userId` - прогресс к следующему рангу

### Очереди
- `POST /api/queue/daily-profit/trigger` - запустить ежедневные начисления
- `POST /api/queue/bonus` - опубликовать бонус

### Пользователи
- `GET /api/users` - получить всех пользователей
- `POST /api/users` - создать пользователя
- `GET /api/users/:id` - получить пользователя

### Пакеты
- `GET /api/packages` - получить инвестиционные пакеты
- `POST /api/packages` - создать пакет

### Транзакции
- `GET /api/transactions/user/:userId` - получить транзакции пользователя

## 🔧 Структура Проекта

```
backend/
├── jobs/
│   ├── queue-manager.js    # Универсальный менеджер очередей
│   ├── scheduler.js        # Планировщик задач
│   └── bonus.js           # Пример обработчика бонусов
├── services/
│   ├── investment-service.js  # Сервис инвестиций
│   ├── referral-service.js    # Сервис рефералов
│   └── rank-service.js        # Сервис рангов
├── prisma/
│   └── schema.prisma       # Схема базы данных
├── index.js               # Основной сервер
├── init-db.js            # Инициализация БД
└── package.json
```

## 📈 Система Рангов

| Ранг | Рефералы | Инвестиции | Бонус | Награда |
|------|----------|------------|-------|---------|
| BRONZE | 0 | $0 | $0 | $0 |
| SILVER | 5 | $1,000 | $50 | $100 |
| GOLD | 15 | $5,000 | $200 | $500 |
| PLATINUM | 30 | $15,000 | $500 | $1,500 |
| DIAMOND | 50 | $30,000 | $1,000 | $3,000 |

## ⏰ Расписание Начислений

- **Daily Profit**: ежедневно в 00:01 и 12:01 UTC
- **Referral Bonus**: при регистрации нового реферала
- **Rank Bonus**: при повышении ранга
- **Rank Reward**: при достижении нового ранга

## 🔍 Мониторинг

Все операции логируются в консоль:
- Успешные начисления
- Ошибки обработки
- Статистика очередей

## 🚨 Обработка Ошибок

- Автоматические повторные попытки для неудачных задач
- Логирование всех ошибок
- Graceful shutdown при завершении работы

## 📝 Примеры Использования

### Создание инвестиции
```javascript
const response = await fetch('/api/investments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 1,
    packageId: 2,
    amount: 5000
  })
})
```

### Запуск ежедневных начислений
```javascript
const response = await fetch('/api/queue/daily-profit/trigger', {
  method: 'POST'
})
```

### Публикация бонуса
```javascript
const response = await fetch('/api/queue/bonus', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 1,
    amount: 100,
    reason: 'Welcome bonus'
  })
})
```

## 🔄 Миграция с SQLite

Если у вас есть существующая база SQLite:

1. Экспортируйте данные из SQLite
2. Импортируйте в PostgreSQL
3. Обновите схему через Prisma
4. Запустите миграции

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи сервера
2. Убедитесь в корректности подключения к БД
3. Проверьте настройки очередей pg-boss 