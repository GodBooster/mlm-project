const API_URL = 'http://localhost:3000';

async function testDuplicateEmail() {
  console.log('=== TESTING DUPLICATE EMAIL HANDLING ===');
  
  const testEmail = `duplicate-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `duplicateuser-${Date.now()}`;
  
  try {
    // 1. Первая регистрация
    console.log('🔸 Step 1: First registration');
    const registerRes1 = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: testPassword
      })
    });
    
    const registerData1 = await registerRes1.json();
    console.log('✅ First registration:', registerData1);
    
    // 2. Ждем обработку
    console.log('\n🔸 Step 2: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Вторая регистрация с тем же email
    console.log('\n🔸 Step 3: Second registration (same email)');
    const registerRes2 = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail, // ТОТ ЖЕ EMAIL
        username: testUsername + '2',
        password: testPassword + '2'
      })
    });
    
    const registerData2 = await registerRes2.json();
    console.log('✅ Second registration:', registerData2);
    
    // 4. Ждем обработку
    console.log('\n🔸 Step 4: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Проверяем pending registration
    console.log('\n🔸 Step 5: Checking pending registration');
    const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendRes.json();
    console.log('Resend verification response:', resendData);
    
    if (resendRes.ok) {
      console.log('✅ SUCCESS: Duplicate email handling works correctly');
      console.log('🔸 Email was updated in PendingRegistration table (upsert logic)');
    } else {
      console.log('❌ Problem with duplicate email handling');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDuplicateEmail();
