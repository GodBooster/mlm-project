// Скрипт для отладки админского доступа
// Запустите этот код в консоли браузера на странице админки

console.log('=== ADMIN ACCESS DEBUG ===');

// 1. Проверяем переменные окружения
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

// 2. Проверяем токен в localStorage
const adminToken = localStorage.getItem('adminToken');
console.log('Admin token in localStorage:', adminToken ? 'EXISTS' : 'NOT FOUND');
if (adminToken) {
  console.log('Token length:', adminToken.length);
  console.log('Token preview:', adminToken.substring(0, 50) + '...');
}

// 3. Тестируем админский API
async function testAdminAPI() {
  if (!adminToken) {
    console.error('No admin token found!');
    return;
  }

  try {
    console.log('Testing admin API...');
    const response = await fetch('https://api.margine-space.com/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('Success! Users count:', data.length);
    } else {
      const errorText = await response.text();
      console.error('API Error:', errorText);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// 4. Тестируем логин
async function testLogin() {
  const loginData = {
    email: 'admin@margine-space.com',
    password: '1234567890'
  };

  try {
    console.log('Testing login...');
    const response = await fetch('https://api.margine-space.com/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    console.log('Login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful!');
      console.log('User isAdmin:', data.user?.isAdmin);
      console.log('Token received:', data.token ? 'YES' : 'NO');
      
      // Сохраняем новый токен
      localStorage.setItem('adminToken', data.token);
      console.log('New token saved to localStorage');
      
      // Тестируем API с новым токеном
      setTimeout(testAdminAPI, 1000);
    } else {
      const errorData = await response.json();
      console.error('Login failed:', errorData);
    }
  } catch (error) {
    console.error('Login network error:', error);
  }
}

// Запускаем тесты
console.log('\n=== RUNNING TESTS ===');
testLogin();
