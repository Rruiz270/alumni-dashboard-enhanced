import type { NextApiRequest, NextApiResponse } from 'next'

// Complete interface matching all Google Sheets fields
interface SpreadsheetRow {
  // Fiscal/Administrative
  'coo'?: string;
  'nf_produto'?: string;
  'nf_servico'?: string;
  'documento'?: string;
  'cpf/cnpj'?: string;
  
  // Customer data
  'nome'?: string;
  'cliente'?: string;
  'celular'?: string;
  'endereco'?: string;
  
  // Dates and transactions
  'data_transacao'?: string;
  'data_venda'?: string;
  'ultima_parcela'?: string;
  'cancelamento'?: string;
  'sim_data_cancelamento'?: string;
  
  // Payment
  'forma'?: string;
  'bandeira'?: string;
  'parcelas'?: string;
  'valor_total'?: string;
  'valor_produto'?: string;
  'valor_servico'?: string;
  'liquido_cielo'?: string;
  'taxa_aplicada'?: string;
  'adquirente'?: string;
  'valor_liquido'?: string;
  'taxa'?: string;
  'cobranca'?: string;
  
  // Course
  'produto'?: string;
  'fonte'?: string;
  'renovacao'?: string;
  'nivel'?: string;
  'desconto'?: string;
  'duracao_curso'?: string;
  
  // Cancellation
  'tipo_cancelamento'?: string;
  'razao_cancelamento'?: string;
  'multa'?: string;
  'pago_ate_cancelamento'?: string;
  'perda'?: string;
  
  // Internal control
  'Acesso Enviado'?: string;
  'Softr Record ID'?: string;
  
  // Seller info (vendedor column - discovered from requirements)
  'vendedor'?: string;
  
  [key: string]: string | undefined;
}

// Vindi interfaces
interface VindiCustomer {
  id: number;
  name: string;
  email: string;
  registry_code?: string;
  code?: string;
  created_at: string;
  updated_at: string;
  status: string;
  metadata?: any;
}

interface VindiBill {
  id: number;
  amount: string;
  status: string;
  due_at: string;
  created_at: string;
  customer?: VindiCustomer;
  subscription_id?: number;
  payment_method?: {
    code: string;
    name: string;
  };
  charges?: Array<{
    id: number;
    amount: string;
    status: string;
    payment_method?: {
      code: string;
      name: string;
    };
  }>;
}

// Business metrics interfaces
interface CustomerMetrics {
  id: string;
  // Basic info
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  vendedor: string;
  
  // Product info
  produto: string;
  nivel: string;
  duracao_curso: number;
  renovacao: boolean;
  fonte: string;
  
  // Financial data
  valor_total: number;
  valor_produto: number;
  valor_servico: number;
  valor_liquido: number;
  taxa: number;
  desconto: number;
  
  // Payment info
  forma_pagamento: string;
  bandeira: string;
  adquirente: string;
  parcelas: number;
  ultima_parcela: string;
  
  // Status
  status: string;
  acesso_enviado: boolean;
  data_venda: string;
  data_transacao: string;
  
  // Cancellation data
  cancelado: boolean;
  data_cancelamento?: string;
  tipo_cancelamento?: string;
  razao_cancelamento?: string;
  multa?: number;
  pago_ate_cancelamento?: number;
  perda?: number;
  
  // Vindi match data
  hasVindiMatch: boolean;
  vindiCustomerId?: number;
  vindiStatus?: string;
  vindiTotalAmount?: number;
  vindiPaidAmount?: number;
  vindiPendingAmount?: number;
  
  // Calculated metrics
  mrr?: number;
  ltv?: number;
  churnRisk?: 'low' | 'medium' | 'high';
  diasAteAcesso?: number;
}

// Fetch data from Google Sheets
async function fetchGoogleSheetsData(): Promise<SpreadsheetRow[]> {
  const SHEET_ID = '1YBBwUQHOlOCNmpSA8hdGLKZYpbq4Pwbo3I3tx8U7dW8';
  
  try {
    console.log('🔄 Fetching data from Google Sheets...');
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
    
    const https = require('https');
    const csvData = await new Promise<string>((resolve, reject) => {
      const req = https.request(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });
    
    if (!csvData.includes('<HTML>')) {
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) return [];
      
      // Parse headers
      const headers = parseCSVLine(lines[0]);
      console.log(`📊 Found ${headers.length} columns and ${lines.length - 1} data rows`);
      
      // Parse data rows
      const data: SpreadsheetRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: SpreadsheetRow = {};
        
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            row[header] = values[index];
          }
        });
        
        // Only add rows with valid CPF/CNPJ
        if (row['cpf/cnpj'] && row['cpf/cnpj'].length >= 11) {
          data.push(row);
        }
      }
      
      console.log(`✅ Processed ${data.length} valid rows from Google Sheets`);
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error fetching Google Sheets:', error);
    return [];
  }
}

// Parse CSV line considering quotes
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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
  
  return values;
}

// Fetch Vindi customers with pagination
async function fetchVindiCustomers(): Promise<VindiCustomer[]> {
  const VINDI_API_KEY = process.env.VINDI_API_KEY;
  
  if (!VINDI_API_KEY) {
    console.log('⚠️ VINDI_API_KEY not configured');
    return [];
  }

  try {
    console.log('🔄 Fetching Vindi customers...');
    
    const headers = {
      'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };

    let allCustomers: VindiCustomer[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const https = require('https');
      
      const customersData = await new Promise<any>((resolve, reject) => {
        const req = https.request(`https://app.vindi.com.br/api/v1/customers?page=${page}&per_page=100`, {
          headers
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.end();
      });
      
      const customers = customersData.customers || [];
      
      if (customers.length === 0) {
        hasMorePages = false;
      } else {
        allCustomers = allCustomers.concat(customers);
        page++;
        
        if (customers.length < 100) {
          hasMorePages = false;
        }
      }
    }
    
    console.log(`✅ Fetched ${allCustomers.length} Vindi customers`);
    return allCustomers;
  } catch (error) {
    console.error('❌ Error fetching Vindi customers:', error);
    return [];
  }
}

// Fetch Vindi bills with pagination
async function fetchVindiBills(): Promise<VindiBill[]> {
  const VINDI_API_KEY = process.env.VINDI_API_KEY;
  
  if (!VINDI_API_KEY) {
    return [];
  }

  try {
    console.log('🔄 Fetching Vindi bills...');
    
    const headers = {
      'Authorization': `Basic ${Buffer.from(VINDI_API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };

    let allBills: VindiBill[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const https = require('https');
      
      const billsData = await new Promise<any>((resolve, reject) => {
        const req = https.request(`https://app.vindi.com.br/api/v1/bills?page=${page}&per_page=100`, {
          headers
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.end();
      });
      
      const bills = billsData.bills || [];
      
      if (bills.length === 0) {
        hasMorePages = false;
      } else {
        allBills = allBills.concat(bills);
        page++;
        
        if (bills.length < 100) {
          hasMorePages = false;
        }
      }
    }
    
    console.log(`✅ Fetched ${allBills.length} Vindi bills`);
    return allBills;
  } catch (error) {
    console.error('❌ Error fetching Vindi bills:', error);
    return [];
  }
}

// Normalize CPF/CNPJ
function normalizeCPF(cpf: string): string {
  if (!cpf) return '';
  return String(cpf).replace(/[^0-9]/g, '');
}

// Calculate MRR based on course duration and value
function calculateMRR(valor: number, duracao: number, parcelas: number): number {
  if (!duracao || !valor) return 0;
  
  // If it's a subscription, MRR is the monthly value
  if (parcelas === duracao) {
    return valor / parcelas;
  }
  
  // For one-time payments, distribute over course duration
  return valor / duracao;
}

// Calculate churn risk based on multiple factors
function calculateChurnRisk(customer: any): 'low' | 'medium' | 'high' {
  let riskScore = 0;
  
  // Access not sent after 48h
  if (!customer.acesso_enviado && customer.diasAteAcesso > 2) {
    riskScore += 3;
  }
  
  // High discount
  if (customer.desconto > 30) {
    riskScore += 2;
  }
  
  // Payment issues
  if (customer.vindiPendingAmount > 0) {
    riskScore += 2;
  }
  
  // New customer (first 7 days)
  const daysSinceSale = Math.floor((Date.now() - new Date(customer.data_venda).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceSale <= 7) {
    riskScore += 1;
  }
  
  if (riskScore >= 5) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}

// Main crossmatch and analytics function
async function processDataAndGenerateMetrics() {
  console.log('🚀 Starting comprehensive data processing...');
  
  // Fetch all data in parallel
  const [sheetsData, vindiCustomers, vindiBills] = await Promise.all([
    fetchGoogleSheetsData(),
    fetchVindiCustomers(),
    fetchVindiBills()
  ]);
  
  console.log(`📊 Data summary: ${sheetsData.length} sheet rows, ${vindiCustomers.length} Vindi customers, ${vindiBills.length} Vindi bills`);
  
  // Create lookup maps for Vindi data
  const vindiCustomerMap = new Map<string, VindiCustomer>();
  const vindiEmailMap = new Map<string, VindiCustomer>();
  
  vindiCustomers.forEach(customer => {
    const cpf = normalizeCPF(customer.registry_code || customer.code || '');
    if (cpf) vindiCustomerMap.set(cpf, customer);
    if (customer.email) vindiEmailMap.set(customer.email.toLowerCase(), customer);
  });
  
  // Create bills map by customer
  const billsByCustomer = new Map<number, VindiBill[]>();
  vindiBills.forEach(bill => {
    if (bill.customer?.id) {
      if (!billsByCustomer.has(bill.customer.id)) {
        billsByCustomer.set(bill.customer.id, []);
      }
      billsByCustomer.get(bill.customer.id)!.push(bill);
    }
  });
  
  // Process each row from sheets and create comprehensive metrics
  const customers: CustomerMetrics[] = [];
  const processedCPFs = new Set<string>();
  
  sheetsData.forEach(row => {
    const cpf = normalizeCPF(row['cpf/cnpj'] || '');
    
    // Skip if already processed (deduplication)
    if (processedCPFs.has(cpf)) return;
    processedCPFs.add(cpf);
    
    // Find Vindi match
    let vindiCustomer = vindiCustomerMap.get(cpf);
    if (!vindiCustomer && row.cliente) {
      vindiCustomer = vindiEmailMap.get(row.cliente.toLowerCase());
    }
    
    // Calculate Vindi amounts if matched
    let vindiTotalAmount = 0;
    let vindiPaidAmount = 0;
    let vindiPendingAmount = 0;
    
    if (vindiCustomer) {
      const customerBills = billsByCustomer.get(vindiCustomer.id) || [];
      customerBills.forEach(bill => {
        const amount = parseFloat(bill.amount);
        vindiTotalAmount += amount;
        if (bill.status === 'paid') {
          vindiPaidAmount += amount;
        } else {
          vindiPendingAmount += amount;
        }
      });
    }
    
    // Parse values
    const valorTotal = parseFloat((row.valor_total || '0').replace(/[R$.,\s]/g, '').replace(',', '.')) / 100;
    const valorProduto = parseFloat((row.valor_produto || '0').replace(/[R$.,\s]/g, '').replace(',', '.')) / 100;
    const valorServico = parseFloat((row.valor_servico || '0').replace(/[R$.,\s]/g, '').replace(',', '.')) / 100;
    const valorLiquido = parseFloat((row.valor_liquido || '0').replace(/[R$.,\s]/g, '').replace(',', '.')) / 100;
    const taxa = parseFloat((row.taxa || '0').replace('%', '')) / 100;
    const desconto = parseFloat((row.desconto || '0').replace('%', '')) / 100;
    const duracaoCurso = parseInt(row.duracao_curso || '6');
    const parcelas = parseInt(row.parcelas || '1');
    
    // Calculate days until access
    let diasAteAcesso = 0;
    if (row.data_venda && row['Acesso Enviado'] !== 'Sim') {
      diasAteAcesso = Math.floor((Date.now() - new Date(row.data_venda).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Create customer metrics object
    const customer: CustomerMetrics = {
      id: `${cpf}-${Date.now()}`,
      
      // Basic info
      nome: row.nome || '',
      cpf_cnpj: row['cpf/cnpj'] || '',
      email: row.cliente || '',
      telefone: row.celular || '',
      endereco: row.endereco || '',
      vendedor: row.vendedor || 'Não informado',
      
      // Product info
      produto: row.produto || '',
      nivel: row.nivel || '',
      duracao_curso: duracaoCurso,
      renovacao: row.renovacao?.toLowerCase() === 'sim',
      fonte: row.fonte || '',
      
      // Financial data
      valor_total: valorTotal,
      valor_produto: valorProduto,
      valor_servico: valorServico,
      valor_liquido: valorLiquido,
      taxa: taxa,
      desconto: desconto,
      
      // Payment info
      forma_pagamento: row.forma || '',
      bandeira: row.bandeira || '',
      adquirente: row.adquirente || '',
      parcelas: parcelas,
      ultima_parcela: row.ultima_parcela || '',
      
      // Status
      status: vindiPendingAmount > 0 ? 'Inadimplente' : 'Em dia',
      acesso_enviado: row['Acesso Enviado'] === 'Sim',
      data_venda: row.data_venda || '',
      data_transacao: row.data_transacao || '',
      
      // Cancellation data
      cancelado: row.cancelamento?.toLowerCase() === 'sim',
      data_cancelamento: row.sim_data_cancelamento,
      tipo_cancelamento: row.tipo_cancelamento,
      razao_cancelamento: row.razao_cancelamento,
      multa: parseFloat(row.multa || '0'),
      pago_ate_cancelamento: parseFloat(row.pago_ate_cancelamento || '0'),
      perda: parseFloat(row.perda || '0'),
      
      // Vindi match data
      hasVindiMatch: !!vindiCustomer,
      vindiCustomerId: vindiCustomer?.id,
      vindiStatus: vindiCustomer?.status,
      vindiTotalAmount,
      vindiPaidAmount,
      vindiPendingAmount,
      
      // Calculated metrics
      mrr: calculateMRR(valorTotal, duracaoCurso, parcelas),
      ltv: valorTotal,
      churnRisk: 'low',
      diasAteAcesso
    };
    
    // Calculate churn risk
    customer.churnRisk = calculateChurnRisk(customer);
    
    customers.push(customer);
  });
  
  console.log(`✅ Processed ${customers.length} unique customers`);
  
  // Generate analytics and KPIs
  const analytics = generateAnalytics(customers);
  
  return {
    customers,
    ...analytics
  };
}

// Generate comprehensive analytics
function generateAnalytics(customers: CustomerMetrics[]) {
  const now = new Date();
  
  // Basic counts
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => !c.cancelado).length;
  const canceledCustomers = customers.filter(c => c.cancelado).length;
  const newCustomers = customers.filter(c => !c.renovacao).length;
  const renewals = customers.filter(c => c.renovacao).length;
  
  // Financial metrics
  const grossRevenue = customers.reduce((sum, c) => sum + c.valor_total, 0);
  const netRevenue = customers.reduce((sum, c) => sum + c.valor_liquido, 0);
  const totalDiscounts = customers.reduce((sum, c) => sum + (c.valor_total * c.desconto), 0);
  const totalFees = customers.reduce((sum, c) => sum + (c.valor_total * c.taxa), 0);
  const avgTicket = grossRevenue / totalCustomers;
  
  // MRR/ARR
  const activeMRR = customers
    .filter(c => !c.cancelado)
    .reduce((sum, c) => sum + (c.mrr || 0), 0);
  const estimatedARR = activeMRR * 12;
  
  // Churn metrics
  const churnRate = (canceledCustomers / totalCustomers) * 100;
  const cancellationReasons = customers
    .filter(c => c.cancelado && c.razao_cancelamento)
    .reduce((acc, c) => {
      acc[c.razao_cancelamento!] = (acc[c.razao_cancelamento!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  // Early cancellations (within 7 days)
  const earlyCancellations = customers.filter(c => {
    if (!c.cancelado || !c.data_venda || !c.data_cancelamento) return false;
    const daysBetween = Math.floor(
      (new Date(c.data_cancelamento).getTime() - new Date(c.data_venda).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysBetween <= 7;
  }).length;
  
  // Payment method analysis
  const paymentMethods = customers.reduce((acc, c) => {
    const method = c.forma_pagamento || 'Não informado';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Acquirer analysis
  const acquirerStats = customers.reduce((acc, c) => {
    const acquirer = c.adquirente || 'Não informado';
    if (!acc[acquirer]) {
      acc[acquirer] = { count: 0, volume: 0, avgFee: 0 };
    }
    acc[acquirer].count++;
    acc[acquirer].volume += c.valor_total;
    acc[acquirer].avgFee = (acc[acquirer].avgFee * (acc[acquirer].count - 1) + c.taxa) / acc[acquirer].count;
    return acc;
  }, {} as Record<string, any>);
  
  // Product/Level analysis
  const productMix = customers.reduce((acc, c) => {
    const product = c.nivel || 'Não informado';
    if (!acc[product]) {
      acc[product] = { count: 0, revenue: 0, avgTicket: 0 };
    }
    acc[product].count++;
    acc[product].revenue += c.valor_total;
    acc[product].avgTicket = acc[product].revenue / acc[product].count;
    return acc;
  }, {} as Record<string, any>);
  
  // Source analysis
  const sourceAnalysis = customers.reduce((acc, c) => {
    const source = c.fonte || 'Não informado';
    if (!acc[source]) {
      acc[source] = { count: 0, revenue: 0, churnRate: 0, avgTicket: 0 };
    }
    acc[source].count++;
    acc[source].revenue += c.valor_total;
    acc[source].avgTicket = acc[source].revenue / acc[source].count;
    return acc;
  }, {} as Record<string, any>);
  
  // Calculate churn rate by source
  Object.keys(sourceAnalysis).forEach(source => {
    const sourceCustomers = customers.filter(c => (c.fonte || 'Não informado') === source);
    const sourceCanceled = sourceCustomers.filter(c => c.cancelado).length;
    sourceAnalysis[source].churnRate = (sourceCanceled / sourceCustomers.length) * 100;
  });
  
  // Seller performance
  const sellerPerformance = customers.reduce((acc, c) => {
    const seller = c.vendedor || 'Não informado';
    if (!acc[seller]) {
      acc[seller] = { 
        count: 0, 
        revenue: 0, 
        newSales: 0, 
        renewals: 0, 
        churnCount: 0,
        avgTicket: 0,
        avgDiscount: 0
      };
    }
    acc[seller].count++;
    acc[seller].revenue += c.valor_total;
    acc[seller].newSales += c.renovacao ? 0 : 1;
    acc[seller].renewals += c.renovacao ? 1 : 0;
    acc[seller].churnCount += c.cancelado ? 1 : 0;
    acc[seller].avgDiscount = (acc[seller].avgDiscount * (acc[seller].count - 1) + c.desconto) / acc[seller].count;
    acc[seller].avgTicket = acc[seller].revenue / acc[seller].count;
    return acc;
  }, {} as Record<string, any>);
  
  // Operations metrics
  const pendingAccess = customers.filter(c => !c.acesso_enviado && !c.cancelado).length;
  const customersWithAccess = customers.filter(c => c.acesso_enviado);
  const avgDaysToAccess = customersWithAccess.length > 0 ? 
    customersWithAccess.reduce((sum, c) => sum + (c.diasAteAcesso || 0), 0) / customersWithAccess.length : 
    0;
  
  // Alerts
  const alerts = [];
  
  // High discount alerts
  const highDiscountSales = customers.filter(c => c.desconto > 0.3);
  if (highDiscountSales.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${highDiscountSales.length} vendas com desconto acima de 30%`,
      severity: 'medium'
    });
  }
  
  // Pending access alerts
  const criticalAccessPending = customers.filter(c => !c.acesso_enviado && (c.diasAteAcesso || 0) > 2);
  if (criticalAccessPending.length > 0) {
    alerts.push({
      type: 'error',
      message: `${criticalAccessPending.length} alunos sem acesso há mais de 48h`,
      severity: 'high'
    });
  }
  
  // High churn risk alerts
  const highChurnRisk = customers.filter(c => c.churnRisk === 'high');
  if (highChurnRisk.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${highChurnRisk.length} clientes com alto risco de churn`,
      severity: 'high'
    });
  }
  
  return {
    summary: {
      // Executive KPIs
      grossRevenue,
      netRevenue,
      totalFees,
      totalDiscounts,
      margin: ((netRevenue / grossRevenue) * 100).toFixed(2),
      
      // Customer metrics
      totalCustomers,
      activeCustomers,
      newCustomers,
      renewals,
      renewalRate: ((renewals / totalCustomers) * 100).toFixed(2),
      
      // MRR/ARR
      mrr: activeMRR,
      arr: estimatedARR,
      avgTicket,
      
      // Churn
      churnRate: churnRate.toFixed(2),
      canceledCustomers,
      earlyCancellations,
      
      // Operations
      pendingAccess,
      avgDaysToAccess: avgDaysToAccess.toFixed(1),
      
      // Vindi match
      customersWithVindiMatch: customers.filter(c => c.hasVindiMatch).length,
      vindiMatchRate: ((customers.filter(c => c.hasVindiMatch).length / totalCustomers) * 100).toFixed(2)
    },
    
    // Detailed analytics
    cancellationReasons: Object.entries(cancellationReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count })),
    
    paymentMethods: Object.entries(paymentMethods)
      .map(([method, count]) => ({ 
        name: method, 
        value: count,
        percentage: ((count / totalCustomers) * 100).toFixed(1)
      })),
    
    acquirerStats: Object.entries(acquirerStats)
      .map(([acquirer, stats]) => ({
        acquirer,
        ...stats,
        avgFee: (stats.avgFee * 100).toFixed(2)
      })),
    
    productMix: Object.entries(productMix)
      .map(([product, stats]) => ({
        product,
        ...stats
      })),
    
    sourceAnalysis: Object.entries(sourceAnalysis)
      .map(([source, stats]) => ({
        source,
        ...stats,
        churnRate: stats.churnRate.toFixed(1)
      })),
    
    sellerPerformance: Object.entries(sellerPerformance)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .map(([seller, stats]) => ({
        seller,
        ...stats,
        churnRate: ((stats.churnCount / stats.count) * 100).toFixed(1),
        avgDiscount: (stats.avgDiscount * 100).toFixed(1)
      })),
    
    alerts,
    
    // Time series data (mock for now - would need historical data)
    monthlyRevenue: generateMonthlyRevenue(customers),
    cohortRetention: generateCohortData(customers)
  };
}

// Generate monthly revenue data
function generateMonthlyRevenue(customers: CustomerMetrics[]) {
  // This is a simplified version - in production, you'd aggregate by actual dates
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const baseRevenue = customers.reduce((sum, c) => sum + c.valor_total, 0) / 6;
  
  return months.map((month, index) => ({
    month,
    revenue: baseRevenue * (1 + (Math.random() - 0.5) * 0.2),
    newCustomers: Math.floor(customers.filter(c => !c.renovacao).length / 6),
    renewals: Math.floor(customers.filter(c => c.renovacao).length / 6)
  }));
}

// Generate cohort retention data
function generateCohortData(customers: CustomerMetrics[]) {
  // Simplified cohort analysis - in production, track actual retention over time
  return {
    '30days': 85,
    '60days': 75,
    '90days': 65,
    '180days': 55
  };
}

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data = await processDataAndGenerateMetrics();
    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}