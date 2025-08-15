const API_URL = 'http://localhost:3000';

async function testCorrectFlow() {
  console.log('=== TESTING CORRECT REGISTRATION FLOW ===');
  console.log('Expected behavior:');
  console.log('1. Registration saves to PendingRegistration table');
  console.log('2. User CANNOT login until email verified');
  console.log('3. Only after email verification user is created in User table');
  console.log('4. User can login only after verification');
  console.log('');
  
  const testEmail = `correct-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `correctuser-${Date.now()}`;
  
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
    
    if (!registerRes.ok) {
      console.error('❌ Registration failed');
      return;
    }
    
    // 2. Ждем обработку очереди
    console.log('\n🔸 Step 2: Waiting for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Пробуем войти (должно НЕ получиться)
    console.log('\n🔸 Step 3: Trying login (should FAIL)');
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    console.log('Login status:', loginRes.status);
    
    if (loginRes.status === 401) {
      console.log('✅ CORRECT: User cannot login - not in User table yet');
      
      // 4. Проверяем pending registration
      console.log('\n🔸 Step 4: Checking pending registration');
      const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      
      const resendData = await resendRes.json();
      console.log('Resend verification status:', resendRes.status);
      console.log('Resend verification response:', resendData);
      
      if (resendRes.ok) {
        console.log('✅ PERFECT: User is in PendingRegistration table');
        console.log('\n🔸 Next step: User should click verification link from email');
        console.log('🔸 After verification: User will be created in User table');
        console.log('🔸 Then: User can login and use the system');
        
        return { 
          success: true, 
          message: 'Flow working correctly - user in pending state',
          testEmail,
          testPassword 
        };
      } else {
        console.log('❌ PROBLEM: User not found in PendingRegistration either');
      }
      
    } else if (loginRes.ok) {
      const loginData = await loginRes.json();
      console.log('❌ WRONG: User can login without email verification');
      console.log('User data:', loginData.user);
      console.log('This means user was created in User table directly - wrong behavior');
      
    } else {
      const loginError = await loginRes.json();
      console.log('❌ Unexpected login error:', loginError);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCorrectFlow();
