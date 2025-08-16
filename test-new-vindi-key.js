// Testar nova chave Vindi
const https = require('https');

const VINDI_API_KEY = 'mFeOJnHWLHPKYjTAzX5Mv88N5NJ0-sfbZuAuqEhVfN8';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

console.log('=== TESTANDO NOVA CHAVE VINDI ===');

// Testar customers
const customerOptions = {
  hostname: 'app.vindi.com.br',
  path: '/api/v1/customers?per_page=10',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
};

https.get(customerOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('=== VINDI CUSTOMERS (REAL) ===');
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ SUCESSO! Total customers:', jsonData.customers?.length || 0);
        
        if (jsonData.customers && jsonData.customers.length > 0) {
          console.log('\n🎯 PRIMEIROS 3 CLIENTES REAIS:');
          jsonData.customers.slice(0, 3).forEach((customer, i) => {
            console.log(`\nCliente ${i + 1}:`);
            console.log('  ID:', customer.id);
            console.log('  Nome:', customer.name);
            console.log('  CPF/CNPJ:', customer.registry_code);
            console.log('  Email:', customer.email);
            console.log('  Status:', customer.status);
          });
        }
        
        // Testar bills agora
        testBills();
        
      } catch (e) {
        console.log('❌ Parse error:', e.message);
      }
    } else {
      console.log('❌ Error response:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Error customers:', err.message);
});

function testBills() {
  console.log('\n=== TESTANDO BILLS REAIS ===');
  
  const billOptions = {
    hostname: 'app.vindi.com.br',
    path: '/api/v1/bills?per_page=10',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    }
  };

  https.get(billOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ SUCESSO! Total bills:', jsonData.bills?.length || 0);
          
          if (jsonData.bills && jsonData.bills.length > 0) {
            console.log('\n💰 PRIMEIRAS 3 FATURAS REAIS:');
            jsonData.bills.slice(0, 3).forEach((bill, i) => {
              console.log(`\nFatura ${i + 1}:`);
              console.log('  ID:', bill.id);
              console.log('  Valor:', bill.amount);
              console.log('  Status:', bill.status);
              console.log('  Cliente ID:', bill.customer?.id);
              console.log('  Cliente Nome:', bill.customer?.name);
            });
          }
        } catch (e) {
          console.log('❌ Parse error:', e.message);
        }
      } else {
        console.log('❌ Error response:', data);
      }
    });
  }).on('error', (err) => {
    console.error('❌ Error bills:', err.message);
  });
}