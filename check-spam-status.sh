#!/bin/bash

# ============================================================================
# ПРОВЕРКА СТАТУСА СПАМА И РЕКОМЕНДАЦИИ
# ============================================================================

echo "📧 ПРОВЕРКА СТАТУСА СПАМА"
echo "=========================="

# 1. Проверка DNS записей
echo -e "\n🌍 1. Проверка DNS записей..."
echo "SPF:"
dig TXT margine-space.com | grep "v=spf1"

echo -e "\nDKIM:"
dig TXT mail._domainkey.margine-space.com | grep "v=DKIM1"

echo -e "\nDMARC:"
dig TXT _dmarc.margine-space.com | grep "v=DMARC1"

echo -e "\nMX:"
dig MX margine-space.com

echo -e "\nA запись mail:"
dig A mail.margine-space.com

# 2. Проверка репутации IP
echo -e "\n🌐 2. Проверка репутации IP..."
SERVER_IP=$(curl -s ifconfig.me)
echo "IP сервера: $SERVER_IP"

echo "Проверка в основных blacklist:"
echo "SORBS: $(dig +short $SERVER_IP.dnsbl.sorbs.net)"
echo "Spamhaus: $(dig +short $SERVER_IP.zen.spamhaus.org)"
echo "Barracuda: $(dig +short $SERVER_IP.b.barracudacentral.org)"

# 3. Проверка заголовков последнего письма
echo -e "\n📄 3. Проверка заголовков письма..."
if [ -f "/var/mail/root" ]; then
    echo "Последние заголовки:"
    tail -50 /var/mail/root | grep -E "(From:|To:|Subject:|Date:|Message-ID:|DKIM-Signature:|Authentication-Results:|Received-SPF:)" | head -10
else
    echo "Почтовый ящик пуст"
fi

# 4. Отправка тестового письма с подробными заголовками
echo -e "\n🧪 4. Отправка тестового письма..."
echo "Отправка письма с подробными заголовками..."
(
echo "From: test@margine-space.com"
echo "To: root@margine-space.com"
echo "Subject: Spam Test - $(date)"
echo "Date: $(date -R)"
echo "Message-ID: <$(date +%s).$(hostname)@margine-space.com>"
echo "X-Mailer: Test Mailer"
echo ""
echo "Это тестовое письмо для проверки спам-фильтров."
echo "Отправлено: $(date)"
echo "IP: $SERVER_IP"
) | sendmail -t

echo "✅ Тестовое письмо отправлено"

# 5. Проверка очереди
echo -e "\n📬 5. Проверка очереди..."
postqueue -p

# 6. Проверка логов
echo -e "\n📝 6. Последние логи..."
tail -20 /var/log/mail.log | grep -E "(opendkim|spam|reject|fail)"

# 7. Проверка конфигурации
echo -e "\n⚙️ 7. Проверка конфигурации..."
echo "Postfix myhostname: $(postconf myhostname)"
echo "Postfix mydomain: $(postconf mydomain)"
echo "Postfix myorigin: $(postconf myorigin)"

# 8. Рекомендации
echo -e "\n🎯 8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ СПАМА..."
echo "=============================================="

echo "🔧 НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:"
echo "1. Проверьте DNS записи в Cloudflare:"
echo "   - Убедитесь что все записи активны"
echo "   - Отключите проксирование для email записей"
echo "   - Проверьте что MX указывает на mail.margine-space.com"

echo -e "\n2. Улучшите SPF запись:"
echo "   v=spf1 mx a ip4:49.13.212.207 ip4:162.244.24.181 ~all"

echo -e "\n3. Настройте DMARC более мягко:"
echo "   v=DMARC1; p=none; rua=mailto:dmarc@margine-space.com; sp=none; adkim=r; aspf=r;"

echo -e "\n4. Проверьте заголовки писем:"
echo "   - Добавьте List-Unsubscribe"
echo "   - Убедитесь что From адрес соответствует домену"

echo -e "\n⏰ ДЕЙСТВИЯ ЧЕРЕЗ 24-48 ЧАСОВ:"
echo "1. DNS записи должны распространиться"
echo "2. DKIM ключ должен быть признан"
echo "3. Репутация IP должна улучшиться"

echo -e "\n📊 МОНИТОРИНГ:"
echo "1. Проверяйте логи: sudo tail -f /var/log/mail.log"
echo "2. Тестируйте отправку: echo 'test' | mail -s 'test' root"
echo "3. Проверяйте заголовки в полученных письмах"

echo -e "\n🔍 ДИАГНОСТИЧЕСКИЕ КОМАНДЫ:"
echo "1. Проверка DNS: dig TXT margine-space.com"
echo "2. Проверка DKIM: dig TXT mail._domainkey.margine-space.com"
echo "3. Проверка DMARC: dig TXT _dmarc.margine-space.com"
echo "4. Проверка IP: curl -s ifconfig.me"
echo "5. Проверка очереди: postqueue -p"

echo -e "\n📧 ТЕСТИРОВАНИЕ:"
echo "1. Отправьте письмо на Gmail и проверьте заголовки"
echo "2. Используйте сервисы проверки: mail-tester.com"
echo "3. Проверьте в спам-фильтрах провайдеров"
