# 🔒 Инструкции по безопасности - Margine Space

**Дата:** 15 августа 2025  
**Статус:** КРИТИЧЕСКИЕ УЯЗВИМОСТИ ОБНАРУЖЕНЫ

---

## ✅ **ЧТО УЖЕ СДЕЛАНО:**

### 1. **Новый JWT_SECRET сгенерирован:**
```
JWT_SECRET=WvC8ii2kD9nKM4CZLa28Pt0RU+mt6bZWaxhyd8hbUCI=
```

### 2. **Пароли админов обновлены:**
- **admin@margine-space.com:** `AdminSecurePass123!@#`
- **superadmin@margine-space.com:** `SuperAdminSecurePass456!@#`

---

## 🚨 **НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:**

### **1. Добавить JWT_SECRET в .env файл:**
```bash
# На сервере
cd /opt/mlm-project/backend

# Добавить JWT_SECRET в .env
echo "JWT_SECRET=WvC8ii2kD9nKM4CZLa28Pt0RU+mt6bZWaxhyd8hbUCI=" >> .env

# Проверить, что добавлено
cat .env | grep JWT_SECRET
```

### **2. Перезапустить сервер:**
```bash
# Перезапустить backend
pm2 restart mlm-backend

# Проверить статус
pm2 status

# Проверить логи
pm2 logs mlm-backend --lines 20
```

### **3. Проверить доступ к админке:**
```bash
# Открыть в браузере
https://margine-space.com/admin

# Войти с новыми паролями:
# Email: admin@margine-space.com
# Password: AdminSecurePass123!@#
```

---

## 📋 **СОХРАНИТЬ В БЕЗОПАСНОМ МЕСТЕ:**

### **JWT_SECRET:**
```
WvC8ii2kD9nKM4CZLa28Pt0RU+mt6bZWaxhyd8hbUCI=
```

### **Пароли админов:**
```
admin@margine-space.com: AdminSecurePass123!@#
superadmin@margine-space.com: SuperAdminSecurePass456!@#
```

---

## 🔍 **ПРОВЕРКА БЕЗОПАСНОСТИ:**

### **1. Проверить JWT токены:**
```bash
# Старые токены должны перестать работать
# Новые токены должны работать только с новым секретом
```

### **2. Проверить админский доступ:**
```bash
# Попробовать войти с новыми паролями
# Проверить все функции админки
```

### **3. Проверить логи:**
```bash
# Проверить, нет ли подозрительной активности
pm2 logs mlm-backend --lines 50
```

---

## 🛡️ **ДОПОЛНИТЕЛЬНЫЕ МЕРЫ БЕЗОПАСНОСТИ:**

### **1. Rate Limiting (на этой неделе):**
```bash
npm install express-rate-limit
```

### **2. CORS защита (на этой неделе):**
```javascript
app.use(cors({
  origin: ['https://margine-space.com'],
  credentials: true
}));
```

### **3. 2FA для админов (в течение месяца):**
- Добавить двухфакторную аутентификацию
- Использовать Google Authenticator или SMS

### **4. Мониторинг (постоянно):**
- Логирование всех админских действий
- Мониторинг неудачных попыток входа
- Регулярные проверки безопасности

---

## ⚠️ **ВАЖНЫЕ ЗАМЕЧАНИЯ:**

1. **НЕ ДЕЛИТЕСЬ** JWT_SECRET и паролями
2. **РЕГУЛЯРНО МЕНЯЙТЕ** пароли (каждые 3 месяца)
3. **МОНИТОРЬТЕ** логи на подозрительную активность
4. **ДЕЛАЙТЕ БЭКАПЫ** базы данных
5. **ОБНОВЛЯЙТЕ** зависимости

---

## 🆘 **В СЛУЧАЕ ПРОБЛЕМ:**

### **Если админка не работает:**
1. Проверить логи: `pm2 logs mlm-backend`
2. Проверить .env файл: `cat .env | grep JWT_SECRET`
3. Перезапустить сервер: `pm2 restart mlm-backend`

### **Если забыли пароли:**
1. Использовать скрипт: `node fix-security-vulnerabilities.js`
2. Или сбросить в базе данных напрямую

---

**🔒 БЕЗОПАСНОСТЬ - ЭТО ПРОЦЕСС, А НЕ СОБЫТИЕ!**
