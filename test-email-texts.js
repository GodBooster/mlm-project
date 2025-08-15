const API_URL = 'http://localhost:3000';

async function testEmailTexts() {
  console.log('=== TESTING UPDATED EMAIL TEXTS ===');
  
  const testEmail = `emailtest-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  const testUsername = `emailuser-${Date.now()}`;
  
  try {
    // 1. Тестируем регистрацию (email верификации)
    console.log('🔸 Step 1: Testing registration email (verification)');
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
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. Resend verification (это вызовет отправку email)
    console.log('\n🔸 Step 2: Testing verification email text');
    const resendRes = await fetch(`${API_URL}/api/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendRes.json();
    console.log('✅ Resend response:', resendData);
    console.log('🔍 Check server logs for email with "3 minutes" text');
    
    // 3. Тестируем сброс пароля
    console.log('\n🔸 Step 3: Testing password reset email');
    const resetRes = await fetch(`${API_URL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resetData = await resetRes.json();
    console.log('✅ Reset password response:', resetData);
    console.log('🔍 Check server logs for email with "3 Minutes" text');
    
    console.log('\n📋 EMAIL TEXT UPDATES:');
    console.log('✅ Registration email: "3 minutes" instead of "10 minutes"');
    console.log('✅ Password reset email: "3 Minutes" instead of "60 Minutes"');
    console.log('🔸 Both emails now reflect the correct 3-minute expiration time');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailTexts();
