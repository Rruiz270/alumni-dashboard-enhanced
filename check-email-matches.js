const http = require('http');

console.log('📧 CHECKING EMAIL MATCHES IN API...');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/dashboard-data',
  method: 'GET'
}, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`Total customers: ${response.customers?.length || 0}`);
      
      // Count matches by method
      const matchMethods = {};
      response.customers?.forEach(c => {
        const method = c.matchMethod || 'NO_MATCH';
        matchMethods[method] = (matchMethods[method] || 0) + 1;
      });
      
      console.log('\n🎯 MATCH METHODS:');
      Object.entries(matchMethods).forEach(([method, count]) => {
        console.log(`- ${method}: ${count}`);
      });
      
      // Look for EMAIL matches specifically
      const emailMatches = response.customers?.filter(c => c.matchMethod === 'EMAIL') || [];
      console.log(`\n📧 EMAIL MATCHES: ${emailMatches.length}`);
      
      if (emailMatches.length > 0) {
        console.log('Examples:');
        emailMatches.slice(0, 5).forEach((c, i) => {
          console.log(`${i + 1}. ${c.nome} - ${c.cliente} - CPF: ${c.cpf_cnpj}`);
        });
      } else {
        // Check why no email matches
        console.log('\n🔍 CHECKING SOME CUSTOMERS WITH EMAILS:');
        const customersWithEmail = response.customers?.filter(c => c.cliente && c.cliente.includes('@')) || [];
        console.log(`Found ${customersWithEmail.length} customers with emails in spreadsheet`);
        
        if (customersWithEmail.length > 0) {
          console.log('\nFirst 5 examples:');
          customersWithEmail.slice(0, 5).forEach((c, i) => {
            console.log(`${i + 1}. ${c.nome}`);
            console.log(`   Email: ${c.cliente}`);
            console.log(`   CPF: ${c.cpf_cnpj}`);
            console.log(`   Has Vindi match: ${c.hasVindiMatch}`);
            console.log(`   Match method: ${c.matchMethod || 'NO_MATCH'}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();