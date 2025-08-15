# 🛡️ ПОШАГОВАЯ НАСТРОЙКА FAIL2BAN

## 📋 **ПРЕДВАРИТЕЛЬНЫЕ ПРОВЕРКИ**

### **1. Проверить статус Fail2ban:**
```bash
systemctl status fail2ban
```

### **2. Проверить установку:**
```bash
fail2ban-client version
```

## 🔧 **НАСТРОЙКА КОНФИГУРАЦИИ**

### **1. Создать резервную копию:**
```bash
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.conf.backup
```

### **2. Применить новую конфигурацию:**
```bash
cp /tmp/fail2ban-config.conf /etc/fail2ban/jail.local
```

### **3. Проверить синтаксис:**
```bash
fail2ban-client reload
```

## 🚀 **ЗАПУСК И НАСТРОЙКА**

### **1. Перезапустить Fail2ban:**
```bash
systemctl restart fail2ban
systemctl enable fail2ban
```

### **2. Проверить статус:**
```bash
systemctl status fail2ban
fail2ban-client status
```

### **3. Проверить активные тюрьмы:**
```bash
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
fail2ban-client status nginx-botsearch
```

## 📊 **МОНИТОРИНГ И УПРАВЛЕНИЕ**

### **1. Просмотр заблокированных IP:**
```bash
# Все заблокированные IP
fail2ban-client banned

# Конкретная тюрьма
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

### **2. Разблокировать IP:**
```bash
# Разблокировать конкретный IP
fail2ban-client set sshd unbanip 192.168.1.100
fail2ban-client set nginx-http-auth unbanip 192.168.1.100
```

### **3. Просмотр логов:**
```bash
# Логи Fail2ban
tail -f /var/log/fail2ban.log

# Логи атак
tail -f /var/log/nginx/access.log
tail -f /var/log/auth.log
```

## 🎯 **НАСТРОЙКА СПЕЦИФИЧЕСКИХ ПРАВИЛ**

### **1. Создать кастомные фильтры:**
```bash
# Создать файл фильтра
nano /etc/fail2ban/filter.d/nginx-attacks.conf
```

**Содержимое фильтра:**
```
[Definition]
failregex = ^<HOST>.*GET.*\.(env|git|config|sql|bak|backup).*$
            ^<HOST>.*GET.*\.\./.*$
            ^<HOST>.*GET.*smtp.*\.(env|json|config).*$
ignoreregex =
```

### **2. Создать кастомную тюрьму:**
```bash
# Добавить в jail.local
[nginx-attacks]
enabled = true
port = http,https
filter = nginx-attacks
logpath = /var/log/nginx/access.log
maxretry = 3
bantime = 3600
findtime = 600
```

## 🔍 **ТЕСТИРОВАНИЕ**

### **1. Симуляция атаки:**
```bash
# Сделать несколько запросов к заблокированным путям
curl http://your-server/.env
curl http://your-server/.git/config
```

### **2. Проверить блокировку:**
```bash
# Проверить, заблокирован ли IP
fail2ban-client status nginx-attacks
```

## 📈 **ОПТИМИЗАЦИЯ**

### **1. Настройка времени блокировки:**
```bash
# В jail.local изменить:
bantime = 3600    # 1 час
findtime = 600    # 10 минут
maxretry = 5      # 5 попыток
```

### **2. Настройка уведомлений:**
```bash
# Добавить в jail.local
[Definition]
destemail = your-email@domain.com
sender = fail2ban@your-server.com
action = %(action_mwl)s
```

## 🚨 **ЭКСТРЕННЫЕ КОМАНДЫ**

### **1. Остановить Fail2ban:**
```bash
systemctl stop fail2ban
```

### **2. Разблокировать все IP:**
```bash
fail2ban-client unban --all
```

### **3. Перезагрузить конфигурацию:**
```bash
fail2ban-client reload
```

## ✅ **ПРОВЕРКА ЭФФЕКТИВНОСТИ**

### **1. Проверить статистику:**
```bash
fail2ban-client status
```

### **2. Проверить логи:**
```bash
tail -f /var/log/fail2ban.log | grep "Ban\|Unban"
```

### **3. Мониторинг атак:**
```bash
# Запустить мониторинг
cd /opt/mlm-project/backend
node monitor-attacks.js
```

## 🔧 **ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ**

### **1. Настройка UFW интеграции:**
```bash
# Убедиться, что UFW работает
ufw status
ufw enable
```

### **2. Настройка автоматического обновления:**
```bash
# Создать скрипт обновления
nano /usr/local/bin/fail2ban-update.sh
```

**Содержимое скрипта:**
```bash
#!/bin/bash
apt update
apt upgrade fail2ban -y
systemctl restart fail2ban
```

### **3. Настройка ротации логов:**
```bash
# Добавить в /etc/logrotate.d/fail2ban
/var/log/fail2ban.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## 🎯 **РЕЗУЛЬТАТ**

После настройки Fail2ban:
- ✅ Автоматическая блокировка атакующих IP
- ✅ Защита от брутфорс атак
- ✅ Мониторинг подозрительной активности
- ✅ Логирование всех событий
- ✅ Возможность разблокировки IP

**Fail2ban будет автоматически блокировать IP адреса, которые совершают подозрительные действия!** 🛡️

МОНИТОРИНГ РАБОТЫ:

# Просмотр логов в реальном времени
tail -f /var/log/fail2ban.log

# Проверка статуса всех тюрем
fail2ban-client status

# Проверка конкретной тюрьмы
fail2ban-client status nginx-attacks