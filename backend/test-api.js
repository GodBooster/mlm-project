import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing packages API...');
    
    const response = await fetch('http://localhost:3000/api/packages');
    const packages = await response.json();
    
    console.log('Packages response:');
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: minAmount=${pkg.minAmount}, maxAmount=${pkg.maxAmount}, percent=${pkg.percent}`);
    });
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI(); 