// Testar dados reais da Vindi e Google Sheets
const https = require('https');

// Testar Vindi API Real
console.log('=== TESTANDO VINDI API REAL ===');
const VINDI_API_KEY = 'mkYfBktvZyD-MLeBNiH0i3m9fXAb2sLmWz_TJ_ZijbY';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

// Testar customers
const customerOptions = {
  hostname: 'sandbox-app.vindi.com.br',
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
    console.log('=== VINDI CUSTOMERS ===');
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log('Total customers:', jsonData.customers?.length || 0);
        if (jsonData.customers && jsonData.customers.length > 0) {
          jsonData.customers.slice(0, 3).forEach((customer, i) => {
            console.log(`Customer ${i + 1}:`, {
              id: customer.id,
              name: customer.name,
              registry_code: customer.registry_code,
              code: customer.code,
              email: customer.email
            });
          });
        }
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    } else {
      console.log('Error response:', data);
    }
    
    // Agora testar bills
    testBills();
  });
}).on('error', (err) => {
  console.error('Error customers:', err.message);
  testBills();
});

function testBills() {
  console.log('\n=== TESTANDO VINDI BILLS ===');
  
  const billOptions = {
    hostname: 'sandbox-app.vindi.com.br',
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
          console.log('Total bills:', jsonData.bills?.length || 0);
          if (jsonData.bills && jsonData.bills.length > 0) {
            jsonData.bills.slice(0, 3).forEach((bill, i) => {
              console.log(`Bill ${i + 1}:`, {
                id: bill.id,
                amount: bill.amount,
                status: bill.status,
                customer_id: bill.customer?.id,
                customer_name: bill.customer?.name
              });
            });
          }
        } catch (e) {
          console.log('Parse error:', e.message);
        }
      } else {
        console.log('Error response:', data);
      }
      
      // Testar Google Sheets
      testGoogleSheets();
    });
  }).on('error', (err) => {
    console.error('Error bills:', err.message);
    testGoogleSheets();
  });
}

function testGoogleSheets() {
  console.log('\n=== TESTANDO GOOGLE SHEETS REAL ===');
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  
  // Tentar diferentes URLs
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`
  ];
  
  function tryUrl(urlIndex) {
    if (urlIndex >= urls.length) {
      console.log('Todas as URLs falharam');
      return;
    }
    
    const url = new URL(urls[urlIndex]);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Node.js)',
      }
    };
    
    console.log(`Tentando URL ${urlIndex + 1}:`, urls[urlIndex]);
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        
        if (res.statusCode === 200 && !data.includes('<HTML>')) {
          console.log('✅ CSV obtido com sucesso!');
          const lines = data.split('\n').filter(line => line.trim());
          console.log('Total lines:', lines.length);
          
          if (lines.length > 0) {
            console.log('Headers:', lines[0]);
            if (lines.length > 1) {
              console.log('Sample data rows:');
              lines.slice(1, 4).forEach((line, i) => {
                console.log(`Row ${i + 1}:`, line);
              });
            }
          }
        } else if (res.statusCode === 302 || res.statusCode === 307) {
          console.log('Redirect detected');
          tryUrl(urlIndex + 1);
        } else {
          console.log('Invalid response, trying next URL...');
          tryUrl(urlIndex + 1);
        }
      });
    }).on('error', (err) => {
      console.error('Error:', err.message);
      tryUrl(urlIndex + 1);
    });
  }
  
  tryUrl(0);
}