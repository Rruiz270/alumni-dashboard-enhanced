const https = require('https');

console.log('🔍 VERIFICANDO COLUNA E (CPF) DA PLANILHA...');

const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
const url = `https://docs.google.com/spreadsheets/d/1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8/gviz/tq?tqx=out:csv&gid=0`;

function normalizeCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/[^0-9]/g, '');
}

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
      console.log(`📊 Total de linhas: ${lines.length}`);
      
      if (lines.length > 0) {
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('\n📋 HEADERS COM ÍNDICES:');
        headers.forEach((header, index) => {
          const coluna = String.fromCharCode(65 + index); // A=65, B=66, etc
          console.log(`${coluna} (${index}): ${header}`);
        });
        
        console.log('\n🎯 COLUNA E (índice 4):');
        console.log(`Header da coluna E: "${headers[4]}"`);
        
        // Verificar primeiras 10 linhas na coluna E
        console.log('\n📊 PRIMEIROS 10 VALORES DA COLUNA E:');
        for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
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
          
          const colunaE = values[4] || '';
          const cpfNormalizado = normalizeCPF(colunaE);
          const nome = values[5] || values[6] || ''; // Nome pode estar na coluna F ou G
          
          console.log(`${i}. Coluna E: "${colunaE}" -> Normalizado: "${cpfNormalizado}" | Nome: "${nome.substring(0, 30)}"`);
        }
        
        // Contar quantos CPFs válidos temos na coluna E
        let cpfsValidos = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = [];
          
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
          
          const colunaE = values[4] || '';
          const cpfNormalizado = normalizeCPF(colunaE);
          
          if (cpfNormalizado && (cpfNormalizado.length === 11 || cpfNormalizado.length === 14)) {
            cpfsValidos++;
          }
        }
        
        console.log(`\n📊 RESULTADO:`);
        console.log(`Total CPFs válidos na coluna E: ${cpfsValidos} de ${lines.length - 1} linhas`);
        console.log(`Porcentagem: ${((cpfsValidos / (lines.length - 1)) * 100).toFixed(1)}%`);
        
      }
    } else {
      console.log('❌ Erro ao acessar planilha');
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Erro:', error.message);
});

req.end();