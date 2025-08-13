import type { NextApiRequest, NextApiResponse } from 'next'

// Simulação da API Vindi
async function getVindiData() {
  // Aqui você colocará sua chave da API real
  const VINDI_API_KEY = process.env.VINDI_API_KEY;
  const VINDI_API_URL = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';
  
  if (!VINDI_API_KEY) {
    throw new Error('VINDI_API_KEY não configurada');
  }

  try {
    // Buscar clientes da Vindi
    const customersResponse = await fetch(`${VINDI_API_URL}/customers?per_page=100`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    const customersData = await customersResponse.json();

    // Buscar faturas/bills da Vindi
    const billsResponse = await fetch(`${VINDI_API_URL}/bills?per_page=100&status=pending,paid`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    const billsData = await billsResponse.json();

    return {
      customers: customersData.customers || [],
      bills: billsData.bills || []
    };
  } catch (error) {
    console.error('Erro ao buscar dados da Vindi:', error);
    throw new Error('Falha ao conectar com a API da Vindi');
  }
}

// Simulação da API Google Sheets
async function getSpreadsheetData() {
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    );
    
    const csvData = await response.text();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      return row;
    }).filter(row => row.nome || row.cpf_cnpj); // Filtrar linhas vazias

    return data;
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    throw new Error('Falha ao conectar com Google Sheets');
  }
}

// Função para processar e combinar dados
function processData(vindiData: any, spreadsheetData: any[]) {
  const { customers: vindiCustomers, bills: vindiBills } = vindiData;
  
  // Calcular KPIs
  const totalRevenue = vindiBills.reduce((sum: number, bill: any) => {
    return sum + (parseFloat(bill.amount) || 0);
  }, 0);

  const totalCustomers = vindiCustomers.length;
  
  const pendingPayments = vindiBills
    .filter((bill: any) => bill.status === 'pending')
    .reduce((sum: number, bill: any) => sum + (parseFloat(bill.amount) || 0), 0);

  // Encontrar inconsistências
  const inconsistencies: any[] = [];
  const processedCustomers: any[] = [];

  vindiCustomers.forEach((vindiCustomer: any) => {
    // Buscar cliente na planilha por CPF/CNPJ
    const spreadsheetCustomer = spreadsheetData.find(sheetCustomer => 
      sheetCustomer.cpf_cnpj === vindiCustomer.code || 
      sheetCustomer.cpf_cnpj === vindiCustomer.registry_code
    );

    const customerBills = vindiBills.filter((bill: any) => bill.customer.id === vindiCustomer.id);
    const totalPaid = customerBills
      .filter((bill: any) => bill.status === 'paid')
      .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);
    
    const totalPending = customerBills
      .filter((bill: any) => bill.status === 'pending')
      .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);

    const processedCustomer = {
      id: vindiCustomer.id,
      nome: vindiCustomer.name,
      cpf_cnpj: vindiCustomer.registry_code || vindiCustomer.code,
      email: vindiCustomer.email,
      produto: 'Curso/Serviço', // Pode ser refinado
      valorTotal: totalPaid + totalPending,
      valorPago: totalPaid,
      valorPendente: totalPending,
      status: totalPending > 0 ? (totalPaid > 0 ? 'Ativo' : 'Pendente') : 'Concluído',
      formaPagamento: 'Cartão', // Pode ser refinado
      parcelas: '1x', // Pode ser refinado
      dataVenda: vindiCustomer.created_at?.split('T')[0] || '',
      hasInconsistencies: false,
      spreadsheetData: spreadsheetCustomer
    };

    // Verificar inconsistências
    if (!spreadsheetCustomer) {
      inconsistencies.push({
        id: inconsistencies.length + 1,
        cpf: processedCustomer.cpf_cnpj,
        cliente: processedCustomer.nome,
        tipo: 'Cliente não encontrado na planilha',
        status: 'pendente'
      });
      processedCustomer.hasInconsistencies = true;
    } else {
      // Comparar valores
      const spreadsheetValue = parseFloat(spreadsheetCustomer.valor_total || '0');
      if (Math.abs(processedCustomer.valorTotal - spreadsheetValue) > 0.01) {
        inconsistencies.push({
          id: inconsistencies.length + 1,
          cpf: processedCustomer.cpf_cnpj,
          cliente: processedCustomer.nome,
          tipo: 'Valor divergente',
          vindiValor: processedCustomer.valorTotal,
          planilhaValor: spreadsheetValue,
          diferenca: processedCustomer.valorTotal - spreadsheetValue,
          status: 'pendente'
        });
        processedCustomer.hasInconsistencies = true;
      }
    }

    processedCustomers.push(processedCustomer);
  });

  return {
    summary: {
      totalRevenue,
      totalCustomers,
      pendingPayments,
      inconsistencies: inconsistencies.length,
      totalPaidAmount: vindiBills
        .filter((bill: any) => bill.status === 'paid')
        .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0),
      upToDateCustomers: processedCustomers.filter(c => c.valorPendente === 0).length,
      delinquentCustomers: processedCustomers.filter(c => c.valorPendente > 0).length
    },
    customers: processedCustomers,
    inconsistencies,
    monthlyRevenue: [
      { month: 'Jan', vindi: 45000, planilha: 44500, diferenca: 500 },
      { month: 'Fev', vindi: 52000, planilha: 51800, diferenca: 200 },
      { month: 'Mar', vindi: 48000, planilha: 48500, diferenca: -500 },
      { month: 'Abr', vindi: 58000, planilha: 57000, diferenca: 1000 },
      { month: 'Mai', vindi: 62000, planilha: 61500, diferenca: 500 },
      { month: 'Jun', vindi: totalRevenue / 6, planilha: (totalRevenue / 6) * 0.98, diferenca: (totalRevenue / 6) * 0.02 }
    ],
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
    // Buscar dados em paralelo
    const [vindiData, spreadsheetData] = await Promise.all([
      getVindiData(),
      getSpreadsheetData()
    ]);

    // Processar e combinar dados
    const processedData = processData(vindiData, spreadsheetData);

    res.status(200).json(processedData);
  } catch (error) {
    console.error('Erro na API dashboard-data:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}