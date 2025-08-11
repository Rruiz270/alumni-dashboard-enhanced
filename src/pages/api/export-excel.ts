import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';
import { CustomerAnalysisService } from '../../lib/customer-analysis';
import * as XLSX from 'xlsx';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate, format } = req.query;

  // Require date filters to avoid excessive API calls
  if (!startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Datas de início e fim são obrigatórias para evitar muitas requisições à API' 
    });
  }

  try {
    const client = new VindiClient();
    const analysisService = new CustomerAnalysisService();

    console.log('Fetching data for export:', { startDate, endDate, format });

    // Fetch bills with date filtering
    const bills = await client.fetchBills(
      startDate as string,
      endDate as string,
      200 // Reasonable limit for date-filtered data
    );

    const sales = [];

    // Process bills into sales data
    for (const bill of bills) {
      const customer = bill.customer;
      const charge = bill.charges?.[0];
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        sales.push(sale);
      }
    }

    if (format === 'excel') {
      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(sales);
      const workbook = XLSX.utils.book_new();
      
      // Add sales data sheet
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas Detalhadas');
      
      // Add customer analysis sheet
      const customerAnalyses = analysisService.analyzeCustomerPayments(sales, []);
      const customerSheet = XLSX.utils.json_to_sheet(customerAnalyses.map(analysis => ({
        'CPF/CNPJ': analysis.cpf_cnpj,
        'Nome': analysis.nome,
        'Email': analysis.email,
        'Celular': analysis.celular,
        'Endereço': analysis.endereco,
        'Tipo Pagamento': analysis.paymentType === 'full' ? 'Integral' : 'Parcial + Recorrente',
        'Valor Contrato': analysis.totalContractValue,
        'Valor Pago': analysis.totalPaidAmount,
        'Inadimplência': analysis.delinquentAmount,
        'A Receber': analysis.futureRecurringAmount,
        'Status': analysis.isUpToDate ? 'Em Dia' : (analysis.isDelinquent ? 'Inadimplente' : 'Pendente'),
        'Parcelas': analysis.installments,
        'Primeira Transação': analysis.firstTransactionDate,
        'Último Pagamento': analysis.lastPaymentDate,
        'Próximo Vencimento': analysis.nextPaymentDue,
        'Total Transações': analysis.allTransactions.length,
        'Inconsistências': analysis.inconsistencies.join('; ') || 'Nenhuma'
      })));
      
      XLSX.utils.book_append_sheet(workbook, customerSheet, 'Análise de Clientes');
      
      // Add summary sheet
      const summary = analysisService.generateSummary(customerAnalyses);
      const summarySheet = XLSX.utils.json_to_sheet([
        { 'Métrica': 'Total de Clientes', 'Valor': summary.totalCustomers },
        { 'Métrica': 'Valor Total Contratado', 'Valor': summary.totalContractValue },
        { 'Métrica': 'Valor Total Pago', 'Valor': summary.totalPaidAmount },
        { 'Métrica': 'Total Inadimplente', 'Valor': summary.totalDelinquent },
        { 'Métrica': 'Total a Receber', 'Valor': summary.totalFutureRecurring },
        { 'Métrica': 'Clientes em Dia', 'Valor': summary.upToDateCustomers },
        { 'Métrica': 'Clientes Inadimplentes', 'Valor': summary.delinquentCustomers },
        { 'Métrica': 'Clientes com Inconsistências', 'Valor': summary.customersWithInconsistencies }
      ]);
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
      
      // Generate Excel buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const filename = `better-education-vendas-${startDate}-${endDate}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } else {
      // Return JSON data
      const customerAnalyses = analysisService.analyzeCustomerPayments(sales, []);
      const summary = analysisService.generateSummary(customerAnalyses);
      
      res.status(200).json({
        sales,
        customers: customerAnalyses,
        summary,
        period: { startDate, endDate },
        total: sales.length,
        totalCustomers: customerAnalyses.length
      });
    }
  } catch (error: any) {
    console.error('Export Error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições atingido. Tente com um período menor ou aguarde alguns minutos.',
        retryAfter: '5 minutes'
      });
    }
    
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        'Falha ao exportar dados';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}