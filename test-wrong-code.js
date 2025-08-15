const API_URL = 'http://localhost:3000';

async function testWrongCode() {
  console.log('=== TESTING WRONG VERIFICATION CODE ===');
  
  const testEmail = `wrongcode-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `wrongcodeuser-${Date.now()}`;
  
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
    console.log('\n🔸 Step 2: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Проверяем неправильный код
    console.log('\n🔸 Step 3: Testing WRONG verification code');
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
    
    if (wrongCodeRes.status === 400 && wrongCodeData.error === 'Invalid verification code') {
      console.log('✅ CORRECT: Wrong code rejected properly');
      
      // 4. Проверяем, что пользователь НЕ создан
      console.log('\n🔸 Step 4: Checking that user was NOT created');
      const loginRes = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      if (loginRes.status === 401) {
        console.log('✅ PERFECT: User was NOT created in main table');
        
        // 5. Проверяем, что pending registration все еще существует
        console.log('\n🔸 Step 5: Checking pending registration still exists');
        const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });
        
        if (resendRes.ok) {
          console.log('✅ PERFECT: Pending registration still exists');
          console.log('🔸 User can try again with correct code');
          
          return { 
            success: true, 
            message: 'Wrong code handling works correctly',
            testEmail 
          };
        } else {
          console.log('❌ PROBLEM: Pending registration was removed');
        }
      } else {
        console.log('❌ CRITICAL PROBLEM: User was created despite wrong code!');
      }
    } else {
      console.log('❌ PROBLEM: Wrong code was not rejected properly');
      console.log('Expected: status 400, error "Invalid verification code"');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWrongCode();
