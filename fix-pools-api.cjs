const fetch = require('node-fetch');

async function fixPoolsAPI() {
  try {
    console.log('🔧 Fixing pools API configuration...');
    
    // Проверяем доступные API endpoints
    const apiEndpoints = [
      {
        name: 'DeFiLlama Yields',
        url: 'https://yields.llama.fi/pools',
        working: true
      },
      {
        name: 'DeFiLlama Protocols', 
        url: 'https://api.llama.fi/protocols',
        working: true
      },
      {
        name: 'DeFiLlama V2 Yields',
        url: 'https://defillama.com/api/v2/yields',
        working: false,
        reason: '403 Forbidden - Rate limited or blocked'
      }
    ];
    
    console.log('\n📊 API Status:');
    apiEndpoints.forEach(endpoint => {
      const status = endpoint.working ? '✅' : '❌';
      console.log(`${status} ${endpoint.name}: ${endpoint.url}`);
      if (!endpoint.working) {
        console.log(`   Reason: ${endpoint.reason}`);
      }
    });
    
    console.log('\n🔧 Recommendations:');
    console.log('1. ✅ Use https://yields.llama.fi/pools (working)');
    console.log('2. ✅ Use https://api.llama.fi/protocols (working)');
    console.log('3. ❌ Avoid https://defillama.com/api/v2/yields (blocked)');
    console.log('4. Add User-Agent header to avoid blocking');
    console.log('5. Implement retry logic with delays');
    
    // Тестируем рабочий endpoint
    console.log('\n🧪 Testing working endpoint...');
    try {
      const response = await fetch('https://yields.llama.fi/pools', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MLM-Bot/1.0)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Successfully fetched ${data.length || 0} pools`);
        console.log('✅ API is working correctly');
      } else {
        console.log(`❌ API returned: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing pools API:', error);
  }
}

// Запускаем исправление
fixPoolsAPI();
