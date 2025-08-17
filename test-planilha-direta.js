const https = require('https');

console.log('🔍 TESTANDO ACESSO DIRETO À PLANILHA...');

const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';

// Testar com gid=0 (tab principal de vendas)
const urls = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0&headers=true`
];

function normalizeCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/[^0-9]/g, '');
}

async function testarURL(url, index) {
  return new Promise((resolve) => {
    console.log(`\n${index + 1}. Testando: ${url.substring(0, 120)}...`);
    
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Tamanho: ${data.length} caracteres`);
        
        if (res.statusCode !== 200) {
          console.log(`   ❌ Status erro: ${res.statusCode}`);
          resolve({ success: false });
          return;
        }
        
        if (data.includes('<HTML>') || data.includes('<!DOCTYPE')) {
          console.log('   ❌ Resposta é HTML (acesso negado)');
          resolve({ success: false });
          return;
        }
        
        if (data.length < 100) {
          console.log('   ❌ Resposta muito pequena');
          console.log(`   Conteúdo: ${data}`);
          resolve({ success: false });
          return;
        }
        
        // Verificar se tem dados de vendas
        const lines = data.split('\n').filter(line => line.trim());
        console.log(`   📊 ${lines.length} linhas encontradas`);
        
        if (lines.length > 0) {
          console.log(`   📋 Header: ${lines[0].substring(0, 150)}...`);
        }
        
        if (lines.length > 1) {
          console.log(`   📋 Linha 1: ${lines[1].substring(0, 150)}...`);
        }
        
        // Processar headers
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => 
            h.trim().replace(/"/g, '').toLowerCase()
          );
          
          console.log(`   🔍 Headers principais: ${headers.slice(0, 8).join(', ')}`);
          
          // Procurar coluna de CPF
          const cpfIndex = headers.findIndex(h => h.includes('cpf') || h.includes('cnpj'));
          const nomeIndex = headers.findIndex(h => h.includes('nome'));
          
          console.log(`   📋 Índice CPF: ${cpfIndex}, Índice Nome: ${nomeIndex}`);
          
          if (cpfIndex >= 0 && nomeIndex >= 0 && lines.length > 1) {
            // Testar primeiras 5 linhas
            console.log('\n   🎯 TESTANDO PRIMEIRAS 5 LINHAS:');
            
            for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
              const line = lines[i];
              const values = [];
              
              // Parse CSV básico
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
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
              
              const cpfOriginal = values[cpfIndex] || '';
              const nome = values[nomeIndex] || '';
              const cpfNormalizado = normalizeCPF(cpfOriginal);
              
              console.log(`   ${i}. ${nome.substring(0, 30)} | CPF: ${cpfOriginal} -> ${cpfNormalizado}`);
            }
            
            resolve({ 
              success: true, 
              data,
              lines: lines.length,
              sampleData: lines.slice(0, 6)
            });
          } else {
            console.log('   ❌ Colunas de CPF ou Nome não encontradas');
            resolve({ success: false });
          }
        } else {
          console.log('   ❌ Nenhuma linha de dados');
          resolve({ success: false });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Erro: ${error.message}`);
      resolve({ success: false });
    });

    req.setTimeout(30000, () => {
      console.log('   ❌ Timeout');
      req.destroy();
      resolve({ success: false });
    });

    req.end();
  });
}

async function testarTodas() {
  for (let i = 0; i < urls.length; i++) {
    const result = await testarURL(urls[i], i);
    
    if (result.success) {
      console.log(`\n✅ URL ${i + 1} FUNCIONOU! Encontrados dados válidos.`);
      console.log(`📊 Total de linhas: ${result.lines}`);
      break;
    }
  }
  
  console.log('\n🎯 TESTE CONCLUÍDO');
}

testarTodas();