const http = require('http');

console.log('🔍 DEBUGANDO PROBLEMA DE MATCH DE CPF...');

// Testar a API e capturar dados específicos
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/dashboard-data',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('\n📊 ANÁLISE DOS DADOS:');
      console.log(`Total clientes: ${response.customers ? response.customers.length : 0}`);
      console.log(`Total inconsistências: ${response.inconsistencies ? response.inconsistencies.length : 0}`);
      
      // Procurar clientes com match por CPF vs nome
      if (response.customers) {
        const matchesCPF = response.customers.filter(c => c.matchMethod === 'CPF');
        const matchesNome = response.customers.filter(c => c.matchMethod === 'NOME');
        const semMatch = response.customers.filter(c => !c.hasVindiMatch);
        
        console.log('\n🎯 MÉTODOS DE MATCH:');
        console.log(`- Match por CPF: ${matchesCPF.length}`);
        console.log(`- Match por NOME: ${matchesNome.length}`);
        console.log(`- Sem match (só planilha): ${semMatch.length}`);
        
        // Mostrar exemplos de CPFs que fizeram match
        console.log('\n✅ EXEMPLOS DE CPF MATCH:');
        matchesCPF.slice(0, 5).forEach((c, i) => {
          console.log(`${i + 1}. ${c.nome} - CPF: ${c.cpf_cnpj}`);
        });
        
        // Mostrar alguns casos "só na planilha" para verificar se são realmente ausentes
        console.log('\n❓ EXEMPLOS "SÓ NA PLANILHA" (verificar se existem na Vindi):');
        semMatch.slice(0, 5).forEach((c, i) => {
          console.log(`${i + 1}. ${c.nome} - CPF: ${c.cpf_cnpj} - Valor: R$ ${c.valorPlanilha}`);
        });
        
        // Procurar o caso específico do Joao Edison
        const joaoEdison = response.customers.find(c => 
          c.nome && c.nome.toLowerCase().includes('joao edison')
        );
        
        if (joaoEdison) {
          console.log('\n🎯 ENCONTROU JOAO EDISON:');
          console.log(`Nome: ${joaoEdison.nome}`);
          console.log(`CPF: ${joaoEdison.cpf_cnpj}`);
          console.log(`Match method: ${joaoEdison.matchMethod}`);
          console.log(`Has Vindi match: ${joaoEdison.hasVindiMatch}`);
        } else {
          console.log('\n❌ NÃO ENCONTROU JOAO EDISON nos resultados');
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao parse JSON:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
});

req.end();