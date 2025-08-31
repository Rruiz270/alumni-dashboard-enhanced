const https = require('https');

const VINDI_API_KEY = 'mFeOJnHWLHPKYjTAzX5Mv88N5NJ0-sfbZuAuqEhVfN8';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

console.log('🔍 TESTING EMAIL CROSSMATCH INSTEAD OF CPF...');

// First, let's check what email fields we have in the spreadsheet
async function checkSpreadsheetEmails() {
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
  
  return new Promise((resolve) => {
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('Sale Key')) {
          const lines = data.split('\n').filter(line => line.trim());
          
          // Parse headers
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          console.log('\n📋 SPREADSHEET HEADERS:');
          headers.forEach((header, index) => {
            if (header.toLowerCase().includes('email') || header.toLowerCase().includes('cliente') || header.toLowerCase().includes('mail')) {
              console.log(`Column ${String.fromCharCode(65 + index)} (${index}): ${header}`);
            }
          });
          
          // Column G is "Cliente" which seems to have emails
          console.log('\n📧 CHECKING COLUMN G (Cliente) FOR EMAILS:');
          
          const emails = [];
          for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
              const char = lines[i][j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            
            const nome = values[5] || ''; // Column F
            const cliente = values[6] || ''; // Column G
            const cpf = values[4] || ''; // Column E
            
            if (cliente && cliente.includes('@')) {
              emails.push({
                nome,
                email: cliente.toLowerCase(),
                cpf
              });
              console.log(`${i}. ${nome} - ${cliente}`);
            }
          }
          
          resolve(emails);
        } else {
          console.log('❌ Error accessing spreadsheet');
          resolve([]);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Error:', error.message);
      resolve([]);
    });
    
    req.end();
  });
}

// Check Vindi emails
async function checkVindiEmails() {
  return new Promise((resolve) => {
    const req = https.request('https://app.vindi.com.br/api/v1/customers?per_page=20', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const customers = response.customers || [];
            
            console.log('\n📧 VINDI CUSTOMER EMAILS:');
            const vindiEmails = customers.map((customer, i) => {
              console.log(`${i + 1}. ${customer.name} - ${customer.email}`);
              return {
                nome: customer.name,
                email: (customer.email || '').toLowerCase(),
                cpf: customer.registry_code || customer.code || ''
              };
            });
            
            resolve(vindiEmails);
          } catch (e) {
            console.log('❌ Parse error:', e.message);
            resolve([]);
          }
        } else {
          console.log('❌ Vindi API error');
          resolve([]);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Error:', error.message);
      resolve([]);
    });
    
    req.end();
  });
}

// Compare emails
async function compareEmails() {
  const [spreadsheetEmails, vindiEmails] = await Promise.all([
    checkSpreadsheetEmails(),
    checkVindiEmails()
  ]);
  
  console.log('\n🔍 COMPARING EMAILS:');
  console.log(`Spreadsheet emails found: ${spreadsheetEmails.length}`);
  console.log(`Vindi emails found: ${vindiEmails.length}`);
  
  // Create email maps
  const spreadsheetMap = new Map();
  spreadsheetEmails.forEach(item => {
    if (item.email) {
      spreadsheetMap.set(item.email, item);
    }
  });
  
  const vindiMap = new Map();
  vindiEmails.forEach(item => {
    if (item.email) {
      vindiMap.set(item.email, item);
    }
  });
  
  // Find matches
  let emailMatches = 0;
  console.log('\n✅ EMAIL MATCHES:');
  
  spreadsheetMap.forEach((spreadsheetItem, email) => {
    if (vindiMap.has(email)) {
      emailMatches++;
      const vindiItem = vindiMap.get(email);
      console.log(`${emailMatches}. ${email}`);
      console.log(`   Spreadsheet: ${spreadsheetItem.nome} (CPF: ${spreadsheetItem.cpf})`);
      console.log(`   Vindi: ${vindiItem.nome} (CPF: ${vindiItem.cpf})`);
    }
  });
  
  console.log(`\n📊 RESULTS:`);
  console.log(`Email matches found: ${emailMatches} out of ${spreadsheetEmails.length} spreadsheet emails`);
  console.log(`Match rate: ${((emailMatches / spreadsheetEmails.length) * 100).toFixed(1)}%`);
  
  // Show some non-matches
  console.log('\n❌ SPREADSHEET EMAILS NOT IN VINDI (first 5):');
  let nonMatchCount = 0;
  spreadsheetMap.forEach((item, email) => {
    if (!vindiMap.has(email) && nonMatchCount < 5) {
      nonMatchCount++;
      console.log(`${nonMatchCount}. ${email} - ${item.nome}`);
    }
  });
}

compareEmails();