const https = require('https');

// Testar Google Sheets
console.log('=== TESTANDO GOOGLE SHEETS ===');
const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

https.get(sheetUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Google Sheets Response Status:', res.statusCode);
    const lines = data.split('\n').filter(line => line.trim());
    console.log('Total lines from sheet:', lines.length);
    if (lines.length > 0) {
      console.log('Headers:', lines[0]);
      console.log('First data row:', lines[1] || 'No data rows');
      console.log('Sample of 3 rows:');
      lines.slice(0, 3).forEach((line, i) => console.log(`Row ${i}:`, line));
    }
  });
}).on('error', (err) => {
  console.error('Error fetching Google Sheets:', err.message);
});

// Testar Vindi API
console.log('\n=== TESTANDO VINDI API ===');
const VINDI_API_KEY = 'mkYfBktvZyD-MLeBNiH0i3m9fXAb2sLmWz_TJ_ZijbY';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

const options = {
  hostname: 'sandbox-app.vindi.com.br',
  path: '/api/v1/customers?per_page=5',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Vindi API Response Status:', res.statusCode);
    try {
      const jsonData = JSON.parse(data);
      console.log('Customers found:', jsonData.customers?.length || 0);
      if (jsonData.customers && jsonData.customers.length > 0) {
        console.log('First customer sample:', {
          id: jsonData.customers[0].id,
          name: jsonData.customers[0].name,
          code: jsonData.customers[0].code,
          registry_code: jsonData.customers[0].registry_code
        });
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Error fetching Vindi:', err.message);
});