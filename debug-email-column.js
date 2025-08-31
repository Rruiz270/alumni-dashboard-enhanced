const https = require('https');

console.log('🔍 DEBUGGING EMAIL COLUMN IN SPREADSHEET...');

const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

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
      console.log(`📊 Total lines: ${lines.length}`);
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('\n📋 ALL HEADERS WITH INDICES:');
      headers.forEach((header, index) => {
        console.log(`${index}: ${header}`);
      });
      
      console.log('\n🔍 LOOKING FOR EMAIL-RELATED COLUMNS:');
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('email') || headerLower.includes('mail') || headerLower.includes('cliente')) {
          console.log(`Column ${index}: ${header} <-- POTENTIAL EMAIL COLUMN`);
        }
      });
      
      // Check first 10 rows for each potential email column
      console.log('\n📧 CHECKING FIRST 10 ROWS:');
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
        
        console.log(`\nRow ${i}:`);
        console.log(`  Nome (5): ${values[5]}`);
        console.log(`  Cliente (6): ${values[6]}`);
        
        // Check if column 6 has email
        if (values[6] && values[6].includes('@')) {
          console.log(`  ✅ Column 6 has email: ${values[6]}`);
        } else {
          console.log(`  ❌ Column 6 NO email`);
          
          // Check other columns for email
          values.forEach((val, idx) => {
            if (val && val.includes('@')) {
              console.log(`  📧 Found email in column ${idx}: ${val}`);
            }
          });
        }
      }
      
      // Count how many rows have emails in column 6
      let emailCount = 0;
      let noEmailCount = 0;
      for (let i = 1; i < lines.length; i++) {
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
        
        if (values[6] && values[6].includes('@')) {
          emailCount++;
        } else {
          noEmailCount++;
        }
      }
      
      console.log(`\n📊 COLUMN 6 (Cliente) STATISTICS:`);
      console.log(`Rows with email: ${emailCount}`);
      console.log(`Rows without email: ${noEmailCount}`);
      console.log(`Percentage with email: ${((emailCount / (emailCount + noEmailCount)) * 100).toFixed(1)}%`);
      
    } else {
      console.log('❌ Error accessing spreadsheet');
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Error:', error.message);
});

req.end();