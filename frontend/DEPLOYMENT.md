# Инструкции по деплою на Netlify

## Переменные окружения

Для работы фронтенда на Netlify нужно настроить следующие переменные окружения в панели управления Netlify:

### В разделе Site settings > Environment variables добавьте:

```
VITE_API_URL=https://your-backend-url.com
```

**Замените `your-backend-url.com` на реальный URL вашего бэкенда.**

## Примеры URL для разных окружений:

### Для разработки (локально):
```
VITE_API_URL=http://localhost:3000
```

### Для продакшена (если бэкенд на Heroku):
```
VITE_API_URL=https://your-app-name.herokuapp.com
```

### Для продакшена (если бэкенд на Railway):
```
VITE_API_URL=https://your-app-name.railway.app
```

### Для продакшена (если бэкенд на Render):
```
VITE_API_URL=https://your-app-name.onrender.com
```

## Проверка настроек

После настройки переменных окружения:

1. Перейдите в раздел Deploys в Netlify
2. Нажмите "Trigger deploy" > "Deploy site"
3. Дождитесь завершения деплоя
4. Проверьте работу сайта

## Устранение проблем

Если сайт не работает:

1. Проверьте логи деплоя в Netlify
2. Убедитесь, что переменная `VITE_API_URL` настроена правильно
3. Проверьте, что бэкенд доступен по указанному URL
4. Проверьте CORS настройки на бэкенде 