const API_URL = 'http://localhost:3000';

async function testCorrectCode() {
  console.log('=== TESTING CORRECT VERIFICATION CODE ===');
  
  const testEmail = `correctcode-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `correctcodeuser-${Date.now()}`;
  
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
    
    // 2. Ждем обработку и получаем код из логов
    console.log('\n🔸 Step 2: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Проверяем resend для получения нового кода
    console.log('\n🔸 Step 3: Getting verification code via resend');
    const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendRes.json();
    console.log('Resend response:', resendData);
    
    if (resendRes.ok) {
      console.log('✅ Pending registration exists');
      console.log('🔸 Check server logs for verification code');
      console.log('🔸 NOTE: In real app, user would get code from email');
      
      // В реальной ситуации код пришел бы на email
      // Для тестирования нужно смотреть логи сервера
      console.log('\n🔸 To complete the test:');
      console.log('1. Check server logs for verification code');
      console.log('2. Use that code in POST /api/verify-email');
      console.log('3. User should be created in main table');
      console.log('4. User should be able to login');
      
      return { success: true, testEmail, testPassword };
    } else {
      console.log('❌ Problem with resend verification');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCorrectCode();
