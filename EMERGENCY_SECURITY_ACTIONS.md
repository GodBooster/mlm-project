# 🚨 ЭКСТРЕННЫЕ МЕРЫ БЕЗОПАСНОСТИ СЕРВЕРА

## ⚠️ **КРИТИЧЕСКАЯ СИТУАЦИЯ**

Ваш сервер подвергается **массированным атакам**:
- **25+ атак** за короткий период
- **Поиск конфиденциальных файлов** (.env, .git, .config)
- **Path Traversal** атаки
- **Поиск SMTP конфигураций**
- **Поиск AWS ключей**

## 🛡️ **НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ (ВЫПОЛНИТЬ СЕЙЧАС)**

### **1. Настроить Nginx защиту:**

```bash
# Подключиться к серверу
ssh -i /path/to/your/key root@49.13.212.207

# Создать резервную копию
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Добавить правила безопасности в nginx конфигурацию
# Добавить содержимое nginx-security.conf в server блок
```

### **2. Настроить Fail2ban:**

```bash
# Установить Fail2ban (если не установлен)
apt update && apt install -y fail2ban

# Создать конфигурацию
cp fail2ban-config.conf /etc/fail2ban/jail.local

# Перезапустить Fail2ban
systemctl restart fail2ban
systemctl enable fail2ban
```

### **3. Настроить UFW Firewall:**

```bash
# Установить UFW
apt install -y ufw

# Настроить базовые правила
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Включить UFW
ufw enable
```

### **4. Блокировать подозрительные IP:**

```bash
# Блокировать IP адреса из логов атак
ufw deny from [IP_ADDRESS]

# Или использовать iptables
iptables -A INPUT -s [IP_ADDRESS] -j DROP
```

## 🔒 **ДОПОЛНИТЕЛЬНЫЕ МЕРЫ БЕЗОПАСНОСТИ**

### **1. Мониторинг атак:**

```bash
# Запустить мониторинг
cd /opt/mlm-project/backend
node monitor-attacks.js

# Настроить автоматический мониторинг
crontab -e
# Добавить: */5 * * * * cd /opt/mlm-project/backend && node monitor-attacks.js
```

### **2. Обновить систему:**

```bash
# Обновить систему
apt update && apt upgrade -y

# Перезагрузить сервер
reboot
```

### **3. Проверить права доступа:**

```bash
# Проверить права на конфиденциальные файлы
ls -la | grep -E "\.(env|git|config)"

# Установить правильные права
chmod 600 .env
chmod 700 .git
```

## 📊 **МОНИТОРИНГ И ЛОГИ**

### **Проверить статус защиты:**

```bash
# Статус Fail2ban
fail2ban-client status

# Статус UFW
ufw status

# Логи атак
tail -f /var/log/fail2ban.log
tail -f /var/log/nginx/access.log
```

### **Настроить логирование:**

```bash
# Включить детальное логирование в nginx
# Добавить в nginx конфигурацию:
# access_log /var/log/nginx/access.log;
# error_log /var/log/nginx/error.log;
```

## 🚨 **ТРЕВОЖНЫЕ СИГНАЛЫ**

**Немедленно реагировать если:**
- Более 50 атак в час
- Попытки доступа к .env файлам
- Path Traversal атаки
- Множественные неудачные логины
- Подозрительная активность в логах

## 📞 **ЭКСТРЕННЫЕ КОНТАКТЫ**

При критических атаках:
1. **Немедленно** заблокировать подозрительные IP
2. **Проверить** целостность системы
3. **Обновить** все пароли и ключи
4. **Рассмотреть** временное отключение сервера

## ✅ **ПРОВЕРКА ЭФФЕКТИВНОСТИ**

После применения мер проверить:
- [ ] Атаки заблокированы
- [ ] Подозрительные IP заблокированы
- [ ] Логи показывают блокировки
- [ ] Система работает стабильно
- [ ] Мониторинг активен

**ПОМНИТЕ: Безопасность - это постоянный процесс!**
