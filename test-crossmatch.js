// Teste simples do crossmatch
const fetch = require('node-fetch');

async function testCrossmatch() {
  console.log('=== TESTANDO CROSSMATCH ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/dashboard-data');
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('Summary:', data.summary);
    console.log('Customers count:', data.customers?.length || 0);
    console.log('Inconsistencies count:', data.inconsistencies?.length || 0);
    
    if (data.customers && data.customers.length > 0) {
      console.log('First customer:', data.customers[0]);
    } else {
      console.log('NO CUSTOMERS FOUND!');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testCrossmatch();