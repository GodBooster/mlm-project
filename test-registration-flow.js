const API_URL = 'https://api.margine-space.com';

async function testRegistrationFlow() {
  console.log('=== TESTING NEW REGISTRATION FLOW ===');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `testuser-${Date.now()}`;
  
  try {
    // 1. Регистрация
    console.log('\n1. Testing registration...');
    const registerRes = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: testPassword
      })
    });
    
    const registerData = await registerRes.json();
    console.log('Registration response:', registerData);
    
    if (!registerRes.ok) {
      console.error('Registration failed');
      return;
    }
    
    // 2. Проверяем, что пользователь НЕ создан в основной таблице
    console.log('\n2. Checking that user is NOT in main table...');
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    console.log('Login response status:', loginRes.status);
    if (loginRes.status === 401) {
      console.log('✅ User correctly NOT created in main table');
    } else {
      console.log('❌ User was created in main table (should not be)');
    }
    
    // 3. Проверяем, что данные есть во временной таблице
    console.log('\n3. Checking pending registration...');
    const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendRes.json();
    console.log('Resend verification response:', resendData);
    
    if (resendRes.ok) {
      console.log('✅ Pending registration found in temporary table');
    } else {
      console.log('❌ Pending registration not found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRegistrationFlow();
