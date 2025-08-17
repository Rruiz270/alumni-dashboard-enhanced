// Testar as melhorias específicas implementadas
const fetch = require('node-fetch');

async function testImprovements() {
  console.log('=== TESTANDO MELHORIAS ESPECÍFICAS ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/dashboard-data');
    const data = await response.json();
    
    console.log('\n🎯 ANÁLISE DAS MELHORIAS:');
    console.log(`Total clientes processados: ${data.customers.length}`);
    console.log(`Total inconsistências: ${data.inconsistencies.length}`);
    
    // Verificar detalhes de recorrência
    const clientesRecorrentes = data.customers.filter(c => c.isRecorrente);
    const clientesUnicos = data.customers.filter(c => !c.isRecorrente);
    
    console.log(`\n🔄 RECORRÊNCIA:`);
    console.log(`- Clientes recorrentes: ${clientesRecorrentes.length}`);
    console.log(`- Clientes únicos: ${clientesUnicos.length}`);
    
    // Mostrar exemplo de cliente com detalhes de recorrência
    if (clientesRecorrentes.length > 0) {
      const exemploRecorrente = clientesRecorrentes[0];
      console.log(`\n📊 EXEMPLO RECORRENTE:`);
      console.log(`Nome: ${exemploRecorrente.nome}`);
      console.log(`Forma Pagamento: ${exemploRecorrente.formaPagamento}`);
      console.log(`Parcelas: ${exemploRecorrente.parcelas}`);
      console.log(`Status Recorrência: ${exemploRecorrente.statusRecorrencia}`);
      console.log(`Detalhes Faturas:`, exemploRecorrente.detalhesFaturas);
    }
    
    // Mostrar exemplo de cliente único
    if (clientesUnicos.length > 0) {
      const exemploUnico = clientesUnicos[0];
      console.log(`\n💳 EXEMPLO ÚNICO:`);
      console.log(`Nome: ${exemploUnico.nome}`);
      console.log(`Forma Pagamento: ${exemploUnico.formaPagamento}`);
      console.log(`Status: ${exemploUnico.status}`);
      console.log(`Detalhes Faturas:`, exemploUnico.detalhesFaturas);
    }
    
    // Verificar consolidação de registros
    const clientesConsolidados = data.customers.filter(c => c.registrosConsolidados > 1);
    console.log(`\n📋 CONSOLIDAÇÃO:`);
    console.log(`- Clientes com múltiplos registros: ${clientesConsolidados.length}`);
    
    if (clientesConsolidados.length > 0) {
      const exemploConsolidado = clientesConsolidados[0];
      console.log(`\n🔗 EXEMPLO CONSOLIDADO:`);
      console.log(`Nome: ${exemploConsolidado.nome}`);
      console.log(`Registros consolidados: ${exemploConsolidado.registrosConsolidados}`);
      console.log(`Valor total: R$ ${exemploConsolidado.valorTotal}`);
      console.log(`Produto: ${exemploConsolidado.produto}`);
    }
    
    // Verificar tipos de inconsistências
    console.log(`\n⚠️ TIPOS DE INCONSISTÊNCIAS:`);
    const tiposInconsistencias = {};
    data.inconsistencies.forEach(inc => {
      tiposInconsistencias[inc.tipo] = (tiposInconsistencias[inc.tipo] || 0) + 1;
    });
    
    Object.entries(tiposInconsistencias).forEach(([tipo, count]) => {
      console.log(`- ${tipo}: ${count}`);
    });
    
    // Mostrar exemplo de inconsistência com detalhes
    if (data.inconsistencies.length > 0) {
      const exemploInconsistencia = data.inconsistencies[0];
      console.log(`\n🔍 EXEMPLO INCONSISTÊNCIA DETALHADA:`);
      console.log(`Tipo: ${exemploInconsistencia.tipo}`);
      console.log(`Cliente: ${exemploInconsistencia.cliente}`);
      console.log(`CPF: ${exemploInconsistencia.cpf}`);
      if (exemploInconsistencia.detalhes) {
        console.log(`Detalhes adicionais:`, exemploInconsistencia.detalhes);
      }
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testImprovements();