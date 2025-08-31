const https = require('https');

// Configuração da API Vindi
const VINDI_API_KEY = 'mFeOJnHWLHPKYjTAzX5Mv88N5NJ0-sfbZuAuqEhVfN8';
const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';

function normalizeCPF(cpf) {
  if (!cpf) return '';
  const normalized = String(cpf).replace(/[^0-9]/g, '');
  if (normalized.length === 11 || normalized.length === 14) {
    return normalized;
  }
  return '';
}

function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

async function fetchVindiCustomers() {
  console.log('🔍 Buscando clientes da Vindi...');
  
  const headers = {
    'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  };

  try {
    const customersData = await new Promise((resolve, reject) => {
      const req = https.request('https://app.vindi.com.br/api/v1/customers?per_page=50', {
        headers
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });

    return customersData.customers || [];
  } catch (error) {
    console.error('❌ Erro ao buscar Vindi:', error.message);
    return [];
  }
}

async function fetchGoogleSheets() {
  console.log('📊 Buscando dados do Google Sheets...');
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
  
  try {
    const csvData = await new Promise((resolve, reject) => {
      const req = https.request(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });

    if (!csvData.includes('Sale Key')) {
      throw new Error('Dados inválidos - header não encontrado');
    }

    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('📋 Headers encontrados:', headers.slice(0, 10));
    
    const data = [];
    for (let i = 1; i < Math.min(lines.length, 11); i++) { // Apenas 10 primeiras linhas para análise
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ''));
      
      const cpf = values[4] || '';  // Coluna E
      const nome = values[5] || ''; // Coluna F  
      const cliente = values[6] || ''; // Coluna G (email)
      
      if (cpf && nome) {
        data.push({
          cpf: cpf,
          nome: nome,
          email: cliente,
          linha: i
        });
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar Google Sheets:', error.message);
    return [];
  }
}

async function analyzeCrossmatch() {
  console.log('=== ANÁLISE DO CROSSMATCH VINDI vs GOOGLE SHEETS ===\n');
  
  const [vindiCustomers, sheetsData] = await Promise.all([
    fetchVindiCustomers(),
    fetchGoogleSheets()
  ]);
  
  console.log(`📊 DADOS OBTIDOS:`);
  console.log(`   - Clientes Vindi: ${vindiCustomers.length}`);
  console.log(`   - Linhas Google Sheets: ${sheetsData.length}\n`);
  
  if (vindiCustomers.length === 0) {
    console.log('❌ Nenhum cliente obtido da Vindi. Verifique a API key.');
    return;
  }
  
  if (sheetsData.length === 0) {
    console.log('❌ Nenhum dado obtido do Google Sheets. Verifique o acesso.');
    return;
  }
  
  // Mapear clientes Vindi
  const vindiMapCPF = new Map();
  const vindiMapEmail = new Map();
  
  console.log('🔍 CLIENTES VINDI (primeiros 10):');
  vindiCustomers.slice(0, 10).forEach((customer, index) => {
    const cpf = normalizeCPF(customer.registry_code || customer.code || '');
    const email = normalizeEmail(customer.email || '');
    
    console.log(`${index + 1}. ${customer.name}`);
    console.log(`   CPF: "${customer.registry_code || customer.code}" -> "${cpf}"`);
    console.log(`   Email: "${customer.email}"`);
    console.log(`   ID: ${customer.id}`);
    console.log('');
    
    if (cpf) vindiMapCPF.set(cpf, customer);
    if (email.includes('@')) vindiMapEmail.set(email, customer);
  });
  
  console.log('📋 DADOS GOOGLE SHEETS (primeiros 10):');
  sheetsData.forEach((item, index) => {
    const cpfNormalizado = normalizeCPF(item.cpf);
    const emailNormalizado = normalizeEmail(item.email);
    
    console.log(`${index + 1}. ${item.nome}`);
    console.log(`   CPF: "${item.cpf}" -> "${cpfNormalizado}"`);
    console.log(`   Email: "${item.email}"`);
    console.log(`   Linha: ${item.linha}`);
    console.log('');
  });
  
  console.log('🎯 ANÁLISE DE CROSSMATCH:');
  
  let matchesCPF = 0;
  let matchesEmail = 0;
  let semMatch = 0;
  
  sheetsData.forEach((item, index) => {
    const cpfNormalizado = normalizeCPF(item.cpf);
    const emailNormalizado = normalizeEmail(item.email);
    
    const vindiPorCPF = vindiMapCPF.get(cpfNormalizado);
    const vindiPorEmail = vindiMapEmail.get(emailNormalizado);
    
    console.log(`\n${index + 1}. ${item.nome}:`);
    
    if (vindiPorCPF) {
      console.log(`   ✅ MATCH por CPF: ${vindiPorCPF.name}`);
      matchesCPF++;
    } else if (vindiPorEmail) {
      console.log(`   ✅ MATCH por EMAIL: ${vindiPorEmail.name}`);
      matchesEmail++;
    } else {
      console.log(`   ❌ SEM MATCH`);
      console.log(`   CPF procurado: "${cpfNormalizado}"`);
      console.log(`   Email procurado: "${emailNormalizado}"`);
      semMatch++;
    }
  });
  
  console.log(`\n📊 RESUMO DO CROSSMATCH:`);
  console.log(`   - Matches por CPF: ${matchesCPF}`);
  console.log(`   - Matches por Email: ${matchesEmail}`);
  console.log(`   - Sem match: ${semMatch}`);
  console.log(`   - Total analisado: ${sheetsData.length}`);
  console.log(`   - Taxa de match: ${((matchesCPF + matchesEmail) / sheetsData.length * 100).toFixed(1)}%`);
  
  // Sugestões para melhoria
  console.log(`\n💡 SUGESTÕES PARA MELHORIA:`);
  
  if (semMatch > 0) {
    console.log(`   1. ${semMatch} registros sem match - verificar:`);
    console.log(`      - CPFs podem ter formatação diferente`);
    console.log(`      - Emails podem não estar preenchidos`);
    console.log(`      - Clientes podem não estar cadastrados na Vindi ainda`);
  }
  
  if (matchesEmail > matchesCPF) {
    console.log(`   2. Mais matches por email que CPF - considerar:`);
    console.log(`      - Revisar formatação de CPFs na planilha`);
    console.log(`      - Verificar se CPFs estão na coluna correta`);
  }
  
  console.log(`   3. Para melhorar o crossmatch:`);
  console.log(`      - Garantir que CPFs estejam sem formatação na Vindi`);
  console.log(`      - Usar campos de código externo na Vindi quando possível`);
  console.log(`      - Implementar matching por nome como fallback`);
}

// Executar análise
analyzeCrossmatch().catch(console.error);