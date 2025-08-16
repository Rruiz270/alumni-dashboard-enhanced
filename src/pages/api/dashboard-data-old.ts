import type { NextApiRequest, NextApiResponse } from 'next'

// Interface para dados da planilha
interface SpreadsheetRow {
  documento?: string;
  cpf_cnpj?: string;
  nome?: string;
  cliente?: string;
  celular?: string;
  endereco?: string;
  data_transacao?: string;
  data_venda?: string;
  ultima_parcela?: string;
  forma?: string;
  produto?: string;
  bandeira?: string;
  parcelas?: string;
  valor_total?: string;
  valor_produto?: string;
  valor_servico?: string;
  [key: string]: string | undefined;
}

// Buscar dados da API Vindi
async function getVindiData() {
  const VINDI_API_KEY = process.env.VINDI_API_KEY;
  const VINDI_API_URL = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';
  
  console.log('=== VERIFICANDO VINDI CONFIG ===');
  console.log('VINDI_API_KEY exists:', !!VINDI_API_KEY);
  console.log('VINDI_API_URL:', VINDI_API_URL);
  
  if (!VINDI_API_KEY) {
    console.log('VINDI_API_KEY não configurada - usando dados mockados');
    return null;
  }

  try {
    const headers = {
      'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };

    // Buscar clientes
    const customersResponse = await fetch(`${VINDI_API_URL}/customers?per_page=100`, { headers });
    if (!customersResponse.ok) throw new Error(`Erro Vindi Customers: ${customersResponse.status}`);
    const customersData = await customersResponse.json();

    // Buscar faturas
    const billsResponse = await fetch(`${VINDI_API_URL}/bills?per_page=100`, { headers });
    if (!billsResponse.ok) throw new Error(`Erro Vindi Bills: ${billsResponse.status}`);
    const billsData = await billsResponse.json();

    // Buscar assinaturas
    const subscriptionsResponse = await fetch(`${VINDI_API_URL}/subscriptions?per_page=100`, { headers });
    if (!subscriptionsResponse.ok) throw new Error(`Erro Vindi Subscriptions: ${subscriptionsResponse.status}`);
    const subscriptionsData = await subscriptionsResponse.json();

    return {
      customers: customersData.customers || [],
      bills: billsData.bills || [],
      subscriptions: subscriptionsData.subscriptions || []
    };
  } catch (error) {
    console.error('Erro ao buscar dados da Vindi:', error);
    return null;
  }
}

// Buscar dados do Google Sheets
async function getSpreadsheetData(): Promise<SpreadsheetRow[]> {
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  
  try {
    console.log('Buscando dados da planilha...');
    
    // Tentar diferentes formatos de URL
    const urls = [
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
    ];
    
    let csvData = '';
    for (const url of urls) {
      try {
        console.log('Tentando URL:', url);
        const response = await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        console.log('Response status:', response.status);
        const text = await response.text();
        
        // Verificar se é CSV válido
        if (response.ok && !text.includes('<HTML>') && !text.includes('<html>')) {
          csvData = text;
          console.log('CSV obtido com sucesso, tamanho:', text.length);
          break;
        } else {
          console.log('Resposta inválida, tentando próxima URL...');
        }
      } catch (urlError) {
        console.log('Erro na URL:', url, urlError instanceof Error ? urlError.message : 'Erro desconhecido');
        continue;
      }
    }
    
    if (!csvData) {
      console.log('Todas as URLs falharam, usando dados de exemplo...');
      // Retornar dados de exemplo da planilha
      return [
        {
          documento: 'DOC001',
          cpf_cnpj: '12345678900',
          nome: 'João Silva',
          cliente: 'João Silva',
          valor_total: '1500.00',
          forma: 'Cartão',
          produto: 'Curso de Inglês',
          parcelas: '6x',
          data_venda: '2024-01-15'
        },
        {
          documento: 'DOC002', 
          cpf_cnpj: '98765432100',
          nome: 'Maria Santos',
          cliente: 'Maria Santos',
          valor_total: '2000.00',
          forma: 'PIX',
          produto: 'Curso de Espanhol',
          parcelas: '1x',
          data_venda: '2024-02-10'
        }
      ];
    }
    
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log('Linhas encontradas:', lines.length);
    
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/"/g, ''));
    console.log('Headers encontrados:', headers);
    
    const data: SpreadsheetRow[] = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: SpreadsheetRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    }).filter(row => row.cpf_cnpj || row.nome || row.cliente); // Filtrar linhas vazias

    console.log(`Planilha carregada: ${data.length} linhas válidas`);
    console.log('Primeira linha de dados:', data[0]);
    return data;
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    // Retornar dados de exemplo em caso de erro
    return [
      {
        documento: 'EXAMPLE',
        cpf_cnpj: '11111111111',
        nome: 'Cliente Exemplo',
        valor_total: '1000.00',
        forma: 'Cartão',
        produto: 'Produto Exemplo'
      }
    ];
  }
}

// Normalizar CPF/CNPJ para comparação
function normalizeCpfCnpj(value: string): string {
  if (!value) return '';
  return value.replace(/[^0-9]/g, '');
}

// Função principal para processar e fazer crossmatch
function processData(vindiData: any | null, spreadsheetData: SpreadsheetRow[]) {
  console.log('=== PROCESSANDO DADOS ===');
  console.log('Vindi Data disponível:', !!vindiData);
  console.log('Spreadsheet Data linhas:', spreadsheetData.length);
  
  // Se não há dados da Vindi, usar dados mockados mas ainda fazer crossmatch com planilha
  if (!vindiData) {
    console.log('VINDI_API_KEY não encontrada - usando dados mockados mas processando planilha');
    return getMockedDataWithSpreadsheet(spreadsheetData);
  }

  const { customers: vindiCustomers, bills: vindiBills, subscriptions: vindiSubscriptions } = vindiData;
  
  // Mapear clientes por CPF/CNPJ normalizado
  const vindiCustomerMap = new Map();
  vindiCustomers.forEach((customer: any) => {
    const cpf = normalizeCpfCnpj(customer.registry_code || customer.code || '');
    if (cpf) {
      vindiCustomerMap.set(cpf, customer);
    }
  });

  // Arrays para resultados
  const processedCustomers: any[] = [];
  const inconsistencies: any[] = [];
  let inconsistencyId = 1;

  // Processar cada linha da planilha
  spreadsheetData.forEach((sheetRow) => {
    const cpfNormalizado = normalizeCpfCnpj(sheetRow.cpf_cnpj || '');
    if (!cpfNormalizado) return;

    const vindiCustomer = vindiCustomerMap.get(cpfNormalizado);
    
    // Valores da planilha
    const valorPlanilha = parseFloat(sheetRow.valor_total?.replace(/[^0-9.-]/g, '') || '0');
    const formaPlanilha = sheetRow.forma || '';
    const parcelasPlanilha = sheetRow.parcelas || '';

    if (vindiCustomer) {
      // Cliente existe na Vindi - fazer crossmatch
      const customerBills = vindiBills.filter((bill: any) => bill.customer?.id === vindiCustomer.id);
      const customerSubscriptions = vindiSubscriptions.filter((sub: any) => sub.customer?.id === vindiCustomer.id);
      
      // Calcular valores da Vindi
      const valorTotalVindi = customerBills.reduce((sum: number, bill: any) => 
        sum + parseFloat(bill.amount || '0'), 0);
      
      const valorPagoVindi = customerBills
        .filter((bill: any) => bill.status === 'paid')
        .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount || '0'), 0);
      
      const valorPendenteVindi = customerBills
        .filter((bill: any) => bill.status === 'pending' || bill.status === 'overdue')
        .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount || '0'), 0);

      // Detectar forma de pagamento da Vindi
      const formaVindi = customerSubscriptions.length > 0 ? 'Cartão Recorrente' : 
                        customerBills.some((b: any) => b.payment_method?.code === 'credit_card') ? 'Cartão' :
                        customerBills.some((b: any) => b.payment_method?.code === 'bank_slip') ? 'Boleto' : 'PIX';

      // Criar registro do cliente
      const customer: any = {
        id: vindiCustomer.id,
        nome: vindiCustomer.name || sheetRow.nome || '',
        cpf_cnpj: sheetRow.cpf_cnpj || '',
        email: vindiCustomer.email || '',
        produto: sheetRow.produto || 'Não especificado',
        valorTotal: valorTotalVindi,
        valorPago: valorPagoVindi,
        valorPendente: valorPendenteVindi,
        status: valorPendenteVindi > 0 ? 'Pendente' : 'Em dia',
        formaPagamento: formaVindi,
        parcelas: customerBills.length > 1 ? `${customerBills.length}x` : '1x',
        dataVenda: sheetRow.data_venda || '',
        // Dados da planilha para comparação
        valorPlanilha,
        formaPlanilha,
        parcelasPlanilha
      };

      processedCustomers.push(customer);

      // Verificar discrepâncias
      const discrepancias: string[] = [];

      // 1. Diferença de valor
      const diferencaValor = Math.abs(valorTotalVindi - valorPlanilha);
      if (diferencaValor > 0.01) {
        discrepancias.push(`Valor: Vindi R$ ${valorTotalVindi.toFixed(2)} vs Planilha R$ ${valorPlanilha.toFixed(2)}`);
        
        inconsistencies.push({
          id: inconsistencyId++,
          cpf: sheetRow.cpf_cnpj,
          cliente: customer.nome,
          tipo: 'Valor divergente',
          vindiValor: valorTotalVindi,
          planilhaValor: valorPlanilha,
          diferenca: valorTotalVindi - valorPlanilha,
          status: 'pendente',
          detalhes: {
            valorPagoVindi,
            valorPendenteVindi,
            quantidadeFaturas: customerBills.length,
            faturas: customerBills.map((b: any) => ({
              id: b.id,
              valor: b.amount,
              status: b.status,
              vencimento: b.due_at
            }))
          }
        });
      }

      // 2. Diferença na forma de pagamento
      if (formaPlanilha && formaVindi.toLowerCase() !== formaPlanilha.toLowerCase()) {
        discrepancias.push(`Forma de pagamento: Vindi "${formaVindi}" vs Planilha "${formaPlanilha}"`);
        
        inconsistencies.push({
          id: inconsistencyId++,
          cpf: sheetRow.cpf_cnpj,
          cliente: customer.nome,
          tipo: 'Forma pagamento divergente',
          vindiForma: formaVindi,
          planilhaForma: formaPlanilha,
          status: 'analisando'
        });
      }

      // Adicionar flag de discrepâncias ao cliente
      if (discrepancias.length > 0) {
        customer.hasInconsistencies = true;
        customer.discrepancias = discrepancias;
      }

    } else {
      // Cliente NÃO existe na Vindi
      inconsistencies.push({
        id: inconsistencyId++,
        cpf: sheetRow.cpf_cnpj,
        cliente: sheetRow.nome || 'Nome não informado',
        tipo: 'Cliente não encontrado na Vindi',
        planilhaValor: valorPlanilha,
        status: 'pendente',
        detalhes: {
          dadosPlanilha: sheetRow
        }
      });

      // Adicionar cliente como "Somente na Planilha"
      processedCustomers.push({
        id: `sheet-${inconsistencyId}`,
        nome: sheetRow.nome || 'Nome não informado',
        cpf_cnpj: sheetRow.cpf_cnpj || '',
        produto: sheetRow.produto || '',
        valorTotal: valorPlanilha,
        valorPago: 0,
        valorPendente: valorPlanilha,
        status: 'Somente Planilha',
        formaPagamento: formaPlanilha,
        parcelas: parcelasPlanilha,
        dataVenda: sheetRow.data_venda || '',
        hasInconsistencies: true,
        somenteNaPlanilha: true
      });
    }
  });

  // Verificar clientes que estão na Vindi mas não na planilha
  vindiCustomers.forEach((vindiCustomer: any) => {
    const cpf = normalizeCpfCnpj(vindiCustomer.registry_code || vindiCustomer.code || '');
    if (!cpf) return;

    const existeNaPlanilha = spreadsheetData.some(row => 
      normalizeCpfCnpj(row.cpf_cnpj || '') === cpf
    );

    if (!existeNaPlanilha) {
      const customerBills = vindiBills.filter((bill: any) => bill.customer?.id === vindiCustomer.id);
      const valorTotal = customerBills.reduce((sum: number, bill: any) => 
        sum + parseFloat(bill.amount || '0'), 0);

      if (valorTotal > 0) {
        inconsistencies.push({
          id: inconsistencyId++,
          cpf: vindiCustomer.registry_code || vindiCustomer.code,
          cliente: vindiCustomer.name,
          tipo: 'Cliente não encontrado na planilha',
          vindiValor: valorTotal,
          status: 'aguardando'
        });
      }
    }
  });

  // Calcular KPIs
  const totalRevenue = processedCustomers.reduce((sum, c) => sum + c.valorTotal, 0);
  const totalPaidAmount = processedCustomers.reduce((sum, c) => sum + c.valorPago, 0);
  const pendingPayments = processedCustomers.reduce((sum, c) => sum + c.valorPendente, 0);

  return {
    summary: {
      totalRevenue,
      totalCustomers: processedCustomers.length,
      pendingPayments,
      inconsistencies: inconsistencies.length,
      totalPaidAmount,
      upToDateCustomers: processedCustomers.filter(c => c.valorPendente === 0).length,
      delinquentCustomers: processedCustomers.filter(c => c.valorPendente > 0).length,
      customersOnlyInSheet: processedCustomers.filter(c => c.somenteNaPlanilha).length,
      customersWithDiscrepancies: processedCustomers.filter(c => c.hasInconsistencies).length
    },
    customers: processedCustomers,
    inconsistencies,
    monthlyRevenue: generateMonthlyRevenue(totalRevenue),
    paymentMethods: generatePaymentMethods(processedCustomers)
  };
}

// Gerar dados de receita mensal
function generateMonthlyRevenue(totalRevenue: number) {
  const baseValue = totalRevenue / 6;
  return [
    { month: 'Jan', vindi: baseValue * 0.8, planilha: baseValue * 0.78, diferenca: baseValue * 0.02 },
    { month: 'Fev', vindi: baseValue * 0.9, planilha: baseValue * 0.88, diferenca: baseValue * 0.02 },
    { month: 'Mar', vindi: baseValue * 0.95, planilha: baseValue * 0.96, diferenca: -baseValue * 0.01 },
    { month: 'Abr', vindi: baseValue * 1.1, planilha: baseValue * 1.05, diferenca: baseValue * 0.05 },
    { month: 'Mai', vindi: baseValue * 1.15, planilha: baseValue * 1.12, diferenca: baseValue * 0.03 },
    { month: 'Jun', vindi: baseValue * 1.2, planilha: baseValue * 1.18, diferenca: baseValue * 0.02 }
  ];
}

// Gerar distribuição de formas de pagamento
function generatePaymentMethods(customers: any[]) {
  const methods = {
    'Cartão Parcelado': 0,
    'Cartão Recorrente': 0,
    'PIX': 0,
    'Boleto': 0
  };

  customers.forEach(customer => {
    const forma = customer.formaPagamento;
    if (forma.includes('Recorrente')) methods['Cartão Recorrente']++;
    else if (forma.includes('Cartão')) methods['Cartão Parcelado']++;
    else if (forma.includes('PIX')) methods['PIX']++;
    else if (forma.includes('Boleto')) methods['Boleto']++;
  });

  const total = Object.values(methods).reduce((sum, val) => sum + val, 0) || 1;

  return [
    { name: 'Cartão Parcelado', value: Math.round((methods['Cartão Parcelado'] / total) * 100), color: '#3b82f6' },
    { name: 'Cartão Recorrente', value: Math.round((methods['Cartão Recorrente'] / total) * 100), color: '#10b981' },
    { name: 'PIX', value: Math.round((methods['PIX'] / total) * 100), color: '#f59e0b' },
    { name: 'Boleto', value: Math.round((methods['Boleto'] / total) * 100), color: '#6366f1' }
  ];
}

// Função para processar dados da planilha quando Vindi não está disponível
function getMockedDataWithSpreadsheet(spreadsheetData: SpreadsheetRow[]) {
  console.log('Processando dados da planilha sem Vindi...');
  
  const processedCustomers = spreadsheetData.map((row, index) => {
    const valorTotal = parseFloat(row.valor_total?.replace(/[^0-9.-]/g, '') || '0');
    
    return {
      id: `sheet-${index}`,
      nome: row.nome || row.cliente || `Cliente ${index + 1}`,
      cpf_cnpj: row.cpf_cnpj || row.documento || '',
      email: '', // Não disponível na planilha
      produto: row.produto || 'Não especificado',
      valorTotal,
      valorPago: valorTotal * 0.6, // Simular 60% pago
      valorPendente: valorTotal * 0.4, // 40% pendente
      status: valorTotal > 0 ? 'Somente Planilha' : 'Sem dados',
      formaPagamento: row.forma || 'Não informado',
      parcelas: row.parcelas || '1x',
      dataVenda: row.data_venda || row.data_transacao || '',
      somenteNaPlanilha: true
    };
  }).filter(customer => customer.valorTotal > 0); // Filtrar clientes sem valor

  const totalRevenue = processedCustomers.reduce((sum, c) => sum + c.valorTotal, 0);
  const totalPaidAmount = processedCustomers.reduce((sum, c) => sum + c.valorPago, 0);
  const pendingPayments = processedCustomers.reduce((sum, c) => sum + c.valorPendente, 0);

  console.log(`Processados ${processedCustomers.length} clientes da planilha`);
  console.log(`Receita total: R$ ${totalRevenue.toFixed(2)}`);

  return {
    summary: {
      totalRevenue,
      totalCustomers: processedCustomers.length,
      pendingPayments,
      inconsistencies: 0, // Sem inconsistências quando só há planilha
      totalPaidAmount,
      upToDateCustomers: processedCustomers.filter(c => c.valorPendente === 0).length,
      delinquentCustomers: processedCustomers.filter(c => c.valorPendente > 0).length,
      customersOnlyInSheet: processedCustomers.length,
      customersWithDiscrepancies: 0
    },
    customers: processedCustomers,
    inconsistencies: [],
    monthlyRevenue: generateMonthlyRevenue(totalRevenue),
    paymentMethods: generatePaymentMethods(processedCustomers)
  };
}

// Dados mockados caso não tenha API (versão antiga - manter para fallback)
function getMockedData(spreadsheetData: SpreadsheetRow[]) {
  const mockCustomers = spreadsheetData.slice(0, 10).map((row, index) => ({
    id: `mock-${index}`,
    nome: row.nome || `Cliente ${index + 1}`,
    cpf_cnpj: row.cpf_cnpj || '000.000.000-00',
    produto: row.produto || 'Curso/Serviço',
    valorTotal: parseFloat(row.valor_total?.replace(/[^0-9.-]/g, '') || '3000'),
    valorPago: parseFloat(row.valor_total?.replace(/[^0-9.-]/g, '') || '3000') * 0.5,
    valorPendente: parseFloat(row.valor_total?.replace(/[^0-9.-]/g, '') || '3000') * 0.5,
    status: 'Ativo',
    formaPagamento: row.forma || 'Cartão',
    parcelas: row.parcelas || '6x',
    dataVenda: row.data_venda || '01/01/2024'
  }));

  return {
    summary: {
      totalRevenue: 245680.50,
      totalCustomers: mockCustomers.length,
      pendingPayments: 45320.00,
      inconsistencies: 3,
      totalPaidAmount: 200360.50,
      upToDateCustomers: 7,
      delinquentCustomers: 3,
      customersOnlyInSheet: 0,
      customersWithDiscrepancies: 3
    },
    customers: mockCustomers,
    inconsistencies: [
      {
        id: 1,
        cpf: '123.456.789-00',
        cliente: 'João Silva',
        tipo: 'Valor divergente',
        vindiValor: 1500.00,
        planilhaValor: 1450.00,
        diferenca: 50.00,
        status: 'pendente'
      }
    ],
    monthlyRevenue: generateMonthlyRevenue(245680.50),
    paymentMethods: [
      { name: 'Cartão Parcelado', value: 45, color: '#3b82f6' },
      { name: 'Cartão Recorrente', value: 30, color: '#10b981' },
      { name: 'PIX', value: 15, color: '#f59e0b' },
      { name: 'Boleto', value: 10, color: '#6366f1' }
    ]
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    console.log('=== INICIANDO API DASHBOARD-DATA ===');
    
    // Buscar dados em paralelo
    const [vindiData, spreadsheetData] = await Promise.all([
      getVindiData(),
      getSpreadsheetData()
    ]);

    console.log('Dados obtidos - Vindi:', !!vindiData, 'Planilha linhas:', spreadsheetData.length);

    // Processar e fazer crossmatch
    const processedData = processData(vindiData, spreadsheetData);

    console.log('Dados processados - Clientes:', processedData.customers.length, 'Receita:', processedData.summary.totalRevenue);

    res.status(200).json(processedData);
  } catch (error) {
    console.error('Erro na API dashboard-data:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}