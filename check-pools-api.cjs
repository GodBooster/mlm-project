const fetch = require('node-fetch');

async function checkPoolsAPI() {
  try {
    console.log('🔍 Checking pools API endpoints...');
    
    const apiUrls = [
      'https://yields.llama.fi/pools',
      'https://api.llama.fi/protocols',
      'https://defillama.com/api/v2/yields'
    ];
    
    for (let i = 0; i < apiUrls.length; i++) {
      const url = apiUrls[i];
      console.log(`\n📡 Testing: ${url}`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MLM-Bot/1.0)',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Success: ${response.status} - Data length: ${JSON.stringify(data).length}`);
        } else {
          console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🔧 Recommendations:');
    console.log('1. Check internet connectivity');
    console.log('2. Verify API endpoints are accessible');
    console.log('3. Check if rate limiting is applied');
    console.log('4. Consider using proxy if blocked');
    
  } catch (error) {
    console.error('❌ Error checking pools API:', error);
  }
}

// Запускаем проверку
checkPoolsAPI();
