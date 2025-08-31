const http = require('http');

console.log('📊 ANALYZING INCONSISTENCY TYPES...');

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
      
      console.log(`\n📈 SUMMARY:`);
      console.log(`Total customers: ${response.customers?.length || 0}`);
      console.log(`Total inconsistencies: ${response.inconsistencies?.length || 0}`);
      
      if (response.inconsistencies && response.inconsistencies.length > 0) {
        // Count by type
        const byType = {};
        response.inconsistencies.forEach(inc => {
          byType[inc.tipo] = (byType[inc.tipo] || 0) + 1;
        });
        
        console.log('\n🔍 INCONSISTENCIES BY TYPE:');
        Object.entries(byType).forEach(([type, count]) => {
          const percentage = ((count / response.inconsistencies.length) * 100).toFixed(1);
          console.log(`- ${type}: ${count} (${percentage}%)`);
        });
        
        // Show examples of each type
        console.log('\n📋 EXAMPLES OF EACH TYPE:');
        
        Object.keys(byType).forEach(type => {
          console.log(`\n${type}:`);
          const examples = response.inconsistencies
            .filter(inc => inc.tipo === type)
            .slice(0, 3);
          
          examples.forEach((inc, i) => {
            console.log(`  ${i + 1}. ${inc.cliente || 'No name'} - CPF: ${inc.cpf}`);
            if (inc.vindiValor !== undefined) {
              console.log(`     Vindi: R$ ${inc.vindiValor}, Planilha: R$ ${inc.planilhaValor}`);
            }
            if (inc.detalhes?.motivo) {
              console.log(`     Motivo: ${inc.detalhes.motivo}`);
            }
          });
        });
        
        // Analyze "Cliente com valor alto não encontrado na Vindi"
        const naoEncontrados = response.inconsistencies.filter(inc => 
          inc.tipo.includes('não encontrado na Vindi')
        );
        
        if (naoEncontrados.length > 0) {
          console.log(`\n⚠️  CLIENTS NOT IN VINDI: ${naoEncontrados.length}`);
          console.log('This seems too high. Let me check some specific cases...');
          
          // Show value distribution
          const byValueRange = {
            'R$ 1000-2000': 0,
            'R$ 2000-5000': 0,
            'R$ 5000+': 0
          };
          
          naoEncontrados.forEach(inc => {
            const valor = inc.planilhaValor || 0;
            if (valor >= 1000 && valor < 2000) byValueRange['R$ 1000-2000']++;
            else if (valor >= 2000 && valor < 5000) byValueRange['R$ 2000-5000']++;
            else if (valor >= 5000) byValueRange['R$ 5000+']++;
          });
          
          console.log('\nValue ranges of clients not in Vindi:');
          Object.entries(byValueRange).forEach(([range, count]) => {
            console.log(`  ${range}: ${count} clients`);
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