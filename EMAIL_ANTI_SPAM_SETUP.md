# 📧 Настройка Email для избежания спама

## 🔧 DNS записи для домена margine-space.com

### 1. SPF запись (обязательно)
```
Тип: TXT
Имя: @ (или margine-space.com)
Значение: v=spf1 include:_spf.google.com include:mail.margine-space.com ~all
```

### 2. DKIM запись (рекомендуется)
Если используете Google Workspace:
```
Тип: TXT
Имя: google._domainkey
Значение: (получить из Google Admin Console)
```

### 3. DMARC запись (рекомендуется)
```
Тип: TXT
Имя: _dmarc
Значение: v=DMARC1; p=quarantine; rua=mailto:dmarc@margine-space.com; ruf=mailto:dmarc@margine-space.com
```

### 4. MX записи (если используете свой почтовый сервер)
```
Тип: MX
Имя: @
Приоритет: 10
Значение: mail.margine-space.com
```

## 🛠️ Дополнительные настройки

### 1. Обратная DNS запись (PTR)
Убедитесь, что IP сервера имеет правильную обратную DNS запись:
```bash
# Проверить
nslookup 49.13.212.207
# Должно показывать margine-space.com или mail.margine-space.com
```

### 2. Настройка почтового сервера
В `/etc/postfix/main.cf`:
```
myhostname = mail.margine-space.com
mydomain = margine-space.com
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
```

### 3. Проверка репутации
Проверьте репутацию IP и домена:
- https://mxtoolbox.com/blacklists.aspx
- https://www.senderscore.org/
- https://www.mail-tester.com/

## 📋 Чек-лист

- [ ] SPF запись добавлена
- [ ] DKIM запись настроена
- [ ] DMARC запись добавлена
- [ ] Обратная DNS запись настроена
- [ ] Почтовый сервер правильно настроен
- [ ] Репутация IP/домена проверена
- [ ] Email заголовки улучшены (уже сделано в коде)

## 🚀 После настройки

1. Подождите 24-48 часов для распространения DNS записей
2. Протестируйте отправку email
3. Проверьте, что письма не попадают в спам

## 📞 Поддержка

Если письма все еще попадают в спам:
1. Проверьте логи почтового сервера
2. Используйте https://www.mail-tester.com/ для диагностики
3. Обратитесь к провайдеру почтового сервера
