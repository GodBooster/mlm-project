# Инструкции по проверке сервера

## Как узнать, на каком порту работает приложение:

### 1. Подключиться к серверу по SSH:
```bash
ssh root@api.invarifi.tech
```

### 2. Проверить запущенные процессы:
```bash
# Посмотреть все процессы Node.js
ps aux | grep node

# Посмотреть на каких портах слушают процессы
netstat -tlnp | grep LISTEN

# Или использовать ss
ss -tlnp | grep LISTEN
```

### 3. Проверить переменные окружения:
```bash
# Посмотреть переменные окружения процесса
cat /proc/[PID]/environ | tr '\0' '\n' | grep PORT

# Или проверить .env файл
cat /path/to/your/app/.env | grep PORT
```

### 4. Проверить логи приложения:
```bash
# Если используется PM2
pm2 logs

# Если используется systemd
journalctl -u your-app-name -f

# Если логи в файле
tail -f /path/to/logs/app.log
```

### 5. Проверить конфигурацию nginx:
```bash
# Посмотреть конфигурацию
cat /etc/nginx/sites-available/api.invarifi.tech

# Проверить синтаксис
nginx -t

# Перезапустить nginx
systemctl restart nginx
```

## Возможные проблемы:

### Проблема 1: Приложение не запущено
```bash
# Запустить приложение
cd /path/to/your/app
npm start
# или
node index.js
```

### Проблема 2: Неправильный порт в nginx
Нужно настроить nginx для проксирования на правильный порт:
```nginx
location / {
    proxy_pass http://localhost:3000;  # порт вашего приложения
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Проблема 3: Файрвол блокирует порт
```bash
# Проверить статус ufw
ufw status

# Разрешить порт если нужно
ufw allow 3000
```

## Для Netlify:

После того как узнаете правильный порт, обновите переменную окружения в Netlify:
```
VITE_API_URL=https://api.invarifi.tech
```

Или исправьте nginx, чтобы он проксировал запросы на правильный порт. 