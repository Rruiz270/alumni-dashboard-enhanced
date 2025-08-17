const https = require('https');

const VINDI_API_KEY = 'mFeOJnHWLHPKYjTAzX5Mv88N5NJ0-sfbZuAuqEhVfN8';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

console.log('🔍 TESTANDO CPFs ESPECÍFICOS NA VINDI...');

// CPFs dos casos "só na planilha" para verificar
const cpfsParaTestar = [
  '29683691803', // Jessica Fiuza
  '31585300829', // Giuliano Araujo  
  '22415304840', // Andrea Santana
  '39573180847', // Lucca Barbosa Berti
  '45579551851'  // Adriana Mantovani
];

function normalizeCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/[^0-9]/g, '');
}

async function buscarClientePorCPF(cpfBusca) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Buscando CPF: ${cpfBusca}`);
    
    const options = {
      hostname: 'app.vindi.com.br',
      path: `/api/v1/customers?query=${cpfBusca}&per_page=50`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.customers && response.customers.length > 0) {
            console.log(`✅ ENCONTRADO(S) ${response.customers.length} cliente(s):`);
            
            response.customers.forEach((customer, i) => {
              const cpfVindi = normalizeCPF(customer.registry_code || customer.code || '');
              console.log(`   ${i + 1}. ${customer.name}`);
              console.log(`      CPF Vindi: "${customer.registry_code || customer.code}"`);
              console.log(`      CPF normalizado: "${cpfVindi}"`);
              console.log(`      Match?: ${cpfVindi === cpfBusca ? 'SIM' : 'NÃO'}`);
              console.log(`      ID: ${customer.id}`);
            });
          } else {
            console.log(`❌ NÃO ENCONTRADO na Vindi`);
          }
          
          resolve(response.customers || []);
        } catch (error) {
          console.log(`❌ Erro parse: ${error.message}`);
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Erro requisição: ${error.message}`);
      resolve([]);
    });

    req.end();
  });
}

async function testarTodos() {
  for (const cpf of cpfsParaTestar) {
    await buscarClientePorCPF(cpf);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre requests
  }
  
  console.log('\n🎯 ANÁLISE CONCLUÍDA!');
  console.log('Se alguns CPFs foram encontrados na busca individual mas não no crossmatch,');
  console.log('pode ser problema na lógica de comparação ou estrutura de dados.');
}

testarTodos();