const https = require('https');

console.log('🔍 DEBUGANDO LEITURA DA PLANILHA...');

const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';

const urls = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
];

async function testarURL(url, index) {
  return new Promise((resolve) => {
    console.log(`\n${index + 1}. Testando URL: ${url}`);
    
    const req = https.request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Node.js)'
      }
    }, (res) => {
      let data = '';
      
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, Object.keys(res.headers));
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Tamanho resposta: ${data.length} caracteres`);
        
        if (data.length > 0) {
          console.log(`   Primeiros 200 chars:`, data.substring(0, 200));
          
          if (data.includes('<HTML>')) {
            console.log('   ❌ Resposta é HTML (erro de acesso)');
          } else if (data.includes('Sale Key')) {
            console.log('   ✅ Contém "Sale Key" - parece ser CSV válido');
            
            const lines = data.split('\n').filter(line => line.trim());
            console.log(`   📊 Total de linhas: ${lines.length}`);
            
            if (lines.length > 1) {
              console.log(`   📋 Header: ${lines[0]}`);
              console.log(`   📋 Primeira linha dados: ${lines[1]}`);
            }
          } else {
            console.log('   ⚠️  Não contém "Sale Key" - formato inesperado');
          }
        } else {
          console.log('   ❌ Resposta vazia');
        }
        
        resolve({
          url,
          status: res.statusCode,
          size: data.length,
          hasData: data.length > 0 && !data.includes('<HTML>') && data.includes('Sale Key'),
          data: data.length > 0 ? data : null
        });
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Erro: ${error.message}`);
      resolve({
        url,
        error: error.message,
        hasData: false
      });
    });

    req.end();
  });
}

async function testarTodas() {
  console.log('Testando todas as URLs da planilha...');
  
  for (let i = 0; i < urls.length; i++) {
    const result = await testarURL(urls[i], i);
    
    if (result.hasData) {
      console.log(`\n✅ URL ${i + 1} FUNCIONOU! Dados válidos encontrados.`);
      
      // Processar alguns dados para teste
      const lines = result.data.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => 
        h.trim().replace(/"/g, '').toLowerCase()
      );
      
      console.log('\n📊 ANÁLISE DOS DADOS:');
      console.log(`Headers: ${headers.slice(0, 5).join(', ')}...`);
      
      // Procurar por colunas de CPF
      const cpfColumns = headers.filter(h => h.includes('cpf') || h.includes('cnpj'));
      console.log(`Colunas de CPF/CNPJ: ${cpfColumns}`);
      
      break;
    }
  }
}

testarTodas();