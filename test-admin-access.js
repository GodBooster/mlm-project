const API_URL = 'https://api.margine-space.com';

async function testAdminAccess() {
  console.log('Testing admin access...');
  
  // 1. Попробуем залогиниться как админ
  const loginData = {
    email: 'admin@margine-space.com',
    password: '1234567890'
  };
  
  try {
    console.log('1. Testing login...');
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    
    const loginResult = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login response:', loginResult);
    
    if (!loginRes.ok) {
      console.error('Login failed');
      return;
    }
    
    const token = loginResult.token;
    console.log('Token received:', token ? 'YES' : 'NO');
    console.log('User isAdmin:', loginResult.user?.isAdmin);
    
    // 2. Попробуем получить админские данные
    console.log('\n2. Testing admin API access...');
    const adminRes = await fetch(`${API_URL}/api/admin/users`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Admin API response status:', adminRes.status);
    if (adminRes.ok) {
      const adminData = await adminRes.json();
      console.log('Admin data received:', adminData.length, 'users');
    } else {
      const errorData = await adminRes.text();
      console.log('Admin API error:', errorData);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAdminAccess();
