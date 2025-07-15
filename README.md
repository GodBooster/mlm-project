# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Личный кабинет инвестора (MLM)

## Запуск проекта

1. Установите зависимости:
   ```
   npm install
   ```
2. Создайте файл `.env` в папке `frontend` и укажите базовый URL API:
   ```
   VITE_API_BASE_URL=https://api.example.com
   ```
3. Запустите локальный сервер:
   ```
   npm run dev
   ```

## Страницы
- `/login` — авторизация и регистрация
- `/dashboard` — баланс, депозит, вывод, история транзакций
- `/packages` — инвестиционные пакеты
- `/referrals` — реферальная система
- `/profile` — профиль пользователя

## Минималистичный дизайн, все действия отправляются на внешний API (см. .env)
