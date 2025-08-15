const API_URL = 'http://localhost:3000';

async function debugVerification() {
  console.log('=== DEBUG VERIFICATION PROCESS ===');
  
  const testEmail = 'yaroslavnaumov328@gmail.com'; // Тот же email
  
  try {
    // 1. Проверяем, есть ли pending registration
    console.log('🔸 Step 1: Checking if pending registration exists');
    const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendRes.json();
    console.log('Resend response status:', resendRes.status);
    console.log('Resend response:', resendData);
    
    if (resendRes.ok) {
      console.log('✅ Pending registration EXISTS');
      console.log('🔸 You should have received a new verification code in logs');
      
      // 2. Тестируем неправильный код
      console.log('\n🔸 Step 2: Testing wrong code');
      const wrongRes = await fetch(`${API_URL}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          code: '000000' // Заведомо неправильный
        })
      });
      
      const wrongData = await wrongRes.json();
      console.log('Wrong code response status:', wrongRes.status);
      console.log('Wrong code response:', wrongData);
      
    } else if (resendRes.status === 404) {
      console.log('❌ No pending registration found');
      console.log('🔸 Possible reasons:');
      console.log('   1. Registration expired (>10 minutes)');
      console.log('   2. Already verified');
      console.log('   3. Database issue');
      
      // Проверяем, может пользователь уже зарегистрирован
      console.log('\n🔸 Checking if user already exists');
      const loginRes = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: '1234567890' // Предполагаемый пароль
        })
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        console.log('✅ User already exists and verified');
        console.log('User ID:', loginData.user.id);
        console.log('Email verified:', loginData.user.emailVerified);
      } else {
        console.log('❌ User does not exist');
        console.log('🔸 Need to register again');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugVerification();
