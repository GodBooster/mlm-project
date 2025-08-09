import fetch from 'node-fetch';

async function testAdminAPI() {
  try {
    console.log('Testing admin packages API...');
    
    // Сначала получим токен админа
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@margine-space.com',
        password: 'admin123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginData.token) {
      // Теперь получим пакеты через admin API
      const packagesResponse = await fetch('http://localhost:3000/api/admin/packages', {
        headers: { 
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const packages = await packagesResponse.json();
      console.log('Admin packages response:');
      packages.forEach(pkg => {
        console.log(`- ${pkg.name}: minAmount=${pkg.minAmount}, maxAmount=${pkg.maxAmount}, monthlyYield=${pkg.monthlyYield}`);
      });
      
      // Теперь попробуем создать новый пакет
      const createResponse = await fetch('http://localhost:3000/api/admin/packages', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Package',
          minAmount: 500,
          maxAmount: 2000,
          monthlyYield: 20,
          duration: 30,
          isActive: true
        })
      });
      
      const createData = await createResponse.json();
      console.log('Create package response:', createData);
      
    }
    
  } catch (error) {
    console.error('Error testing admin API:', error);
  }
}

testAdminAPI(); 