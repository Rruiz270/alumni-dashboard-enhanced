const https = require('https');

const VINDI_API_KEY = 'mFeOJnHWLHPKYjTAzX5Mv88N5NJ0-sfbZuAuqEhVfN8';
const auth = Buffer.from(VINDI_API_KEY + ':').toString('base64');

function normalizeCPF(cpf) {
  if (!cpf) return '';
  const normalized = String(cpf).replace(/[^0-9]/g, '');
  return normalized;
}

console.log('🕵️ INVESTIGANDO PROBLEMA DE MATCHING...');

async function buscarAmostraVindi() {
  return new Promise((resolve) => {
    console.log('\n📊 BUSCANDO AMOSTRA DA VINDI...');
    
    const options = {
      hostname: 'app.vindi.com.br',
      path: '/api/v1/customers?per_page=20',
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
          
          if (response.customers) {
            console.log(`✅ Encontrados ${response.customers.length} clientes na Vindi`);
            
            const cpfsVindi = [];
            
            response.customers.forEach((customer, i) => {
              if (i < 10) { // Primeiros 10
                const cpfOriginal = customer.registry_code || customer.code;
                const cpfNormalizado = normalizeCPF(cpfOriginal);
                
                console.log(`${i + 1}. ${customer.name}`);
                console.log(`   CPF original: "${cpfOriginal}"`);
                console.log(`   CPF normalizado: "${cpfNormalizado}"`);
                console.log(`   ID: ${customer.id}`);
                console.log('---');
                
                if (cpfNormalizado) {
                  cpfsVindi.push({
                    nome: customer.name,
                    cpfOriginal,
                    cpfNormalizado,
                    id: customer.id
                  });
                }
              }
            });
            
            resolve(cpfsVindi);
          } else {
            console.log('❌ Nenhum cliente encontrado');
            resolve([]);
          }
        } catch (error) {
          console.log('❌ Erro parse:', error.message);
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Erro requisição:', error.message);
      resolve([]);
    });

    req.end();
  });
}

async function buscarAmostraPlanilha() {
  return new Promise((resolve) => {
    console.log('\n📊 BUSCANDO AMOSTRA DA PLANILHA...');
    
    const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
    
    const https = require('https');
    const req = https.request(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (data.includes('Sale Key')) {
            const lines = data.split('\n').filter(line => line.trim());
            console.log(`✅ Encontradas ${lines.length - 1} linhas na planilha`);
            
            const headers = lines[0].split(',').map(h => 
              h.trim().replace(/"/g, '').toLowerCase().replace(/\s+/g, '_').replace(/\//g, '/')
            );
            
            console.log('Headers encontrados:', headers.slice(0, 10));
            
            const cpfsPlanilha = [];
            
            // Processar primeiras 10 linhas
            for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
              const line = lines[i];
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              
              const row = {};
              headers.forEach((header, index) => {
                if (values[index]) {
                  row[header] = values[index];
                }
              });
              
              const cpfOriginal = row['cpf/cnpj'];
              const cpfNormalizado = normalizeCPF(cpfOriginal);
              const nome = row['nome'];
              
              if (cpfNormalizado && nome) {
                console.log(`${i}. ${nome}`);
                console.log(`   CPF original: "${cpfOriginal}"`);
                console.log(`   CPF normalizado: "${cpfNormalizado}"`);
                console.log('---');
                
                cpfsPlanilha.push({
                  nome,
                  cpfOriginal,
                  cpfNormalizado
                });
              }
            }
            
            resolve(cpfsPlanilha);
          } else {
            console.log('❌ Dados da planilha não encontrados');
            resolve([]);
          }
        } catch (error) {
          console.log('❌ Erro parse planilha:', error.message);
          resolve([]);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Erro requisição planilha:', error.message);
      resolve([]);
    });

    req.end();
  });
}

async function compararAmostras() {
  const [cpfsVindi, cpfsPlanilha] = await Promise.all([
    buscarAmostraVindi(),
    buscarAmostraPlanilha()
  ]);
  
  console.log('\n🔍 COMPARANDO AMOSTRAS...');
  console.log(`CPFs Vindi: ${cpfsVindi.length}`);
  console.log(`CPFs Planilha: ${cpfsPlanilha.length}`);
  
  // Criar maps para comparação
  const mapVindi = new Map();
  cpfsVindi.forEach(item => {
    if (item.cpfNormalizado) {
      mapVindi.set(item.cpfNormalizado, item);
    }
  });
  
  const mapPlanilha = new Map();
  cpfsPlanilha.forEach(item => {
    if (item.cpfNormalizado) {
      mapPlanilha.set(item.cpfNormalizado, item);
    }
  });
  
  console.log(`\nMap Vindi: ${mapVindi.size} CPFs únicos`);
  console.log(`Map Planilha: ${mapPlanilha.size} CPFs únicos`);
  
  // Procurar matches
  let matches = 0;
  console.log('\n🎯 PROCURANDO MATCHES NA AMOSTRA...');
  
  mapPlanilha.forEach((planilhaItem, cpf) => {
    if (mapVindi.has(cpf)) {
      const vindiItem = mapVindi.get(cpf);
      matches++;
      console.log(`✅ MATCH ${matches}: CPF ${cpf}`);
      console.log(`   Vindi: ${vindiItem.nome}`);
      console.log(`   Planilha: ${planilhaItem.nome}`);
    }
  });
  
  console.log(`\n📊 RESULTADO DA AMOSTRA:`);
  console.log(`Matches encontrados: ${matches} de ${mapPlanilha.size} CPFs da planilha`);
  console.log(`Taxa de match: ${((matches / mapPlanilha.size) * 100).toFixed(1)}%`);
  
  if (matches === 0) {
    console.log('\n❌ ZERO MATCHES - PROBLEMA IDENTIFICADO!');
    console.log('Vamos comparar alguns CPFs específicos...');
    
    const primeirosPlanilha = Array.from(mapPlanilha.keys()).slice(0, 3);
    const primeirosVindi = Array.from(mapVindi.keys()).slice(0, 3);
    
    console.log('\nPrimeiros CPFs da Planilha:', primeirosPlanilha);
    console.log('Primeiros CPFs da Vindi:', primeirosVindi);
  }
}

compararAmostras();