#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';

async function createTestUser() {
  console.log('🧪 Creating test user with IP tracking...\n');

  const testEmail = `test-ip-${Date.now()}@example.com`;
  const testUsername = `testuser-${Date.now()}`;

  console.log(`📧 Test email: ${testEmail}`);
  console.log(`👤 Test username: ${testUsername}`);

  try {
    // 1. Регистрация с IP адресом
    console.log('\n1️⃣ Registering user with IP...');
    
    const registerRes = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.100',
        'X-Real-IP': '10.0.0.50'
      },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: 'test123456'
      })
    });

    const registerData = await registerRes.json();
    console.log('✅ Registration response:', registerData);

    if (!registerData.success) {
      throw new Error(`Registration failed: ${registerData.error}`);
    }

    // 2. Получаем код верификации из логов (симуляция)
    console.log('\n2️⃣ Simulating email verification...');
    console.log('📧 Check server logs for verification code');
    
    // 3. Проверяем в PendingRegistration (через API)
    console.log('\n3️⃣ Checking PendingRegistration...');
    
    // Ждем немного для обработки очереди
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Тестируем логин с IP
    console.log('\n4️⃣ Testing login with IP tracking...');
    
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '172.16.0.25',
        'CF-Connecting-IP': '203.0.113.10'
      },
      body: JSON.stringify({
        email: 'admin@margine-space.com',
        password: 'AdminSecurePass123!@#'
      })
    });

    const loginData = await loginRes.json();
    console.log('✅ Login response:', loginData.success ? 'Success' : 'Failed');

    // 5. Инструкции для проверки
    console.log('\n📊 NEXT STEPS:');
    console.log('1. Open Prisma Studio: http://localhost:5555');
    console.log('2. Check PendingRegistration table for:', testEmail);
    console.log('3. Check User table for admin@margine-space.com');
    console.log('4. Look for registrationIp and lastLoginIp fields');
    
    console.log('\n🔍 Expected IP addresses:');
    console.log(`   Registration IP: 192.168.1.100 (X-Forwarded-For)`);
    console.log(`   Login IP: 172.16.0.25 (X-Forwarded-For)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestUser();
