const API_URL = 'http://localhost:3000';

async function testFinalVerification() {
  console.log('=== FINAL VERIFICATION TEST (POST ONLY) ===');
  
  const testEmail = `finaltest-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `finaluser-${Date.now()}`;
  
  try {
    // 1. Регистрация
    console.log('🔸 Step 1: Registration');
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
    console.log('✅ Registration response:', registerData);
    
    // 2. Ждем обработку
    console.log('\n🔸 Step 2: Waiting for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Проверяем, что пользователь НЕ создан в основной таблице
    console.log('\n🔸 Step 3: Checking user NOT in main table');
    const loginRes1 = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    if (loginRes1.status === 401) {
      console.log('✅ CORRECT: User not in main table');
    } else {
      console.log('❌ PROBLEM: User already in main table!');
      return;
    }
    
    // 4. Проверяем неправильный код
    console.log('\n🔸 Step 4: Testing WRONG verification code');
    const wrongCodeRes = await fetch(`${API_URL}/api/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '000000' // НЕПРАВИЛЬНЫЙ КОД
      })
    });
    
    const wrongCodeData = await wrongCodeRes.json();
    console.log('Wrong code response status:', wrongCodeRes.status);
    console.log('Wrong code response:', wrongCodeData);
    
    if (wrongCodeRes.status === 400) {
      console.log('✅ CORRECT: Wrong code rejected');
      
      // 5. Проверяем, что пользователь ВСЕ ЕЩЕ НЕ создан
      console.log('\n🔸 Step 5: Checking user STILL NOT in main table');
      const loginRes2 = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      if (loginRes2.status === 401) {
        console.log('✅ PERFECT: User STILL NOT created after wrong code!');
        console.log('🎉 VERIFICATION PROTECTION WORKS CORRECTLY!');
        
        // 6. Проверяем pending registration все еще существует
        console.log('\n🔸 Step 6: Checking pending registration exists');
        const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });
        
        if (resendRes.ok) {
          console.log('✅ PERFECT: Can resend verification (pending registration exists)');
          console.log('🔸 Check server logs for the correct verification code');
          return { success: true, testEmail };
        } else {
          console.log('❌ Problem: Cannot resend verification');
        }
      } else {
        console.log('❌ CRITICAL PROBLEM: User created despite wrong code!');
        const loginData = await loginRes2.json();
        console.log('User data:', loginData.user);
      }
    } else {
      console.log('❌ PROBLEM: Wrong code not rejected properly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalVerification();
