#!/bin/bash

# ============================================================================
# СКРИПТ ПРИМЕНЕНИЯ ИСПРАВЛЕНИЙ EMAIL
# ============================================================================

echo "🔧 Применение исправлений для email..."

# 1. Создание резервной копии
echo "📦 Создание резервной копии..."
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)

# 2. Применение исправленной конфигурации
echo "📝 Применение исправленной конфигурации..."
sudo cp final-postfix-main.cf /etc/postfix/main.cf

# 3. Проверка конфигурации
echo "🔍 Проверка конфигурации..."
sudo postfix check

if [ $? -eq 0 ]; then
    echo "✅ Конфигурация корректна"
else
    echo "❌ Ошибка в конфигурации"
    exit 1
fi

# 4. Перезапуск Postfix
echo "🔄 Перезапуск Postfix..."
sudo systemctl restart postfix

# 5. Проверка статуса
echo "📊 Проверка статуса..."
sudo systemctl status postfix --no-pager -l

# 6. Проверка портов
echo "🌐 Проверка портов..."
netstat -tlnp | grep :587
netstat -tlnp | grep :25

# 7. Тест SMTP
echo "🧪 Тест SMTP подключения..."
echo "quit" | telnet localhost 587

# 8. Проверка логов
echo "📋 Проверка логов..."
sudo tail -10 /var/log/mail.log

# 9. Добавление правил Fail2ban для Postfix
echo "🛡️ Настройка Fail2ban для Postfix..."
sudo tee /etc/fail2ban/jail.d/postfix.conf > /dev/null <<EOF
[postfix]
enabled = true
port = smtp,465,submission
filter = postfix
logpath = /var/log/mail.log
maxretry = 3
bantime = 3600
findtime = 600

[postfix-sasl]
enabled = true
port = smtp,465,submission
filter = postfix-sasl
logpath = /var/log/mail.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

# 10. Перезапуск Fail2ban
echo "🔄 Перезапуск Fail2ban..."
sudo systemctl restart fail2ban

# 11. Финальная проверка
echo ""
echo "🎉 ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ!"
echo ""
echo "📝 СЛЕДУЮЩИЕ ШАГИ:"
echo "1. Проверьте логи: sudo tail -f /var/log/mail.log"
echo "2. Протестируйте отправку: echo 'test' | mail -s 'Test' your-email@example.com"
echo "3. Проверьте приложение: попробуйте зарегистрировать нового пользователя"
echo ""
echo "🔍 ДЛЯ МОНИТОРИНГА:"
echo "- Логи Postfix: sudo tail -f /var/log/mail.log"
echo "- Статус Fail2ban: sudo fail2ban-client status"
echo "- Статус Postfix: sudo systemctl status postfix"
