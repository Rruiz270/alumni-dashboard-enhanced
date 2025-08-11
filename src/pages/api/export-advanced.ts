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

  const { 
    saleStartDate,      // Data início venda
    saleEndDate,        // Data fim venda  
    installmentStartDate, // Data início término parcelas
    installmentEndDate,   // Data fim término parcelas
    format,
    sheetId,
    gid 
  } = req.query;

  // Require at least sale dates
  if (!saleStartDate || !saleEndDate) {
    return res.status(400).json({ 
      error: 'Datas de venda (início e fim) são obrigatórias' 
    });
  }

  try {
    const client = new VindiClient();
    const analysisService = new CustomerAnalysisService();

    console.log('Fetching data with filters:', { 
      saleStartDate, 
      saleEndDate, 
      installmentStartDate, 
      installmentEndDate 
    });

    // Fetch bills with sale date filtering
    const bills = await client.fetchBills(
      saleStartDate as string,
      saleEndDate as string,
      200
    );

    const sales = [];

    // Process bills into sales data
    for (const bill of bills) {
      const customer = bill.customer;
      const charge = bill.charges?.[0];
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        
        // Filter by installment end date if provided
        if (installmentStartDate || installmentEndDate) {
          const lastInstallmentDate = sale.ultima_parcela;
          
          if (lastInstallmentDate) {
            const installmentDate = new Date(lastInstallmentDate);
            
            if (installmentStartDate) {
              const startDate = new Date(installmentStartDate as string);
              if (installmentDate < startDate) continue;
            }
            
            if (installmentEndDate) {
              const endDate = new Date(installmentEndDate as string);
              if (installmentDate > endDate) continue;
            }
          }
        }
        
        sales.push(sale);
      }
    }

    // Fetch spreadsheet data if provided
    let sheetsData: any[] = [];
    if (sheetId) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`;
      const sheetsResponse = await fetch(csvUrl);
      
      if (sheetsResponse.ok) {
        const csvData = await sheetsResponse.text();
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
            const row: any = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            sheetsData.push(row);
          }
        }
      }
    }

    // Analyze customer payments
    const customerAnalyses = analysisService.analyzeCustomerPayments(sales, sheetsData);
    const summary = analysisService.generateSummary(customerAnalyses);

    if (format === 'excel') {
      // Generate Excel with detailed installment info
      const detailedSales = sales.map(sale => ({
        ...sale,
        // Add installment details
        installment_info: `${sale.parcelas} parcela(s) - Última: ${sale.ultima_parcela}`
      }));

      const worksheet = XLSX.utils.json_to_sheet(detailedSales);
      const workbook = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas Detalhadas');
      
      // Customer analysis with installment details
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
        'Todas as Transações': analysis.allTransactions.map(t => 
          `${t.data_transacao}: ${t.valor_total} (${t.parcelas}x)`
        ).join(' | '),
        'Inconsistências': analysis.inconsistencies.join('; ') || 'Nenhuma',
        'Encontrado na Planilha': analysis.spreadsheetData ? 'Sim' : 'Não'
      })));
      
      XLSX.utils.book_append_sheet(workbook, customerSheet, 'Análise de Clientes');
      
      // Summary sheet
      const summaryData = [
        { 'Filtro': 'Data Venda Início', 'Valor': saleStartDate },
        { 'Filtro': 'Data Venda Fim', 'Valor': saleEndDate },
        { 'Filtro': 'Data Parcela Início', 'Valor': installmentStartDate || 'Não definido' },
        { 'Filtro': 'Data Parcela Fim', 'Valor': installmentEndDate || 'Não definido' },
        { 'Filtro': '', 'Valor': '' },
        { 'Filtro': 'Total de Clientes', 'Valor': summary.totalCustomers },
        { 'Filtro': 'Valor Total Contratado', 'Valor': summary.totalContractValue },
        { 'Filtro': 'Valor Total Pago', 'Valor': summary.totalPaidAmount },
        { 'Filtro': 'Total Inadimplente', 'Valor': summary.totalDelinquent },
        { 'Filtro': 'Total a Receber', 'Valor': summary.totalFutureRecurring },
        { 'Filtro': 'Clientes em Dia', 'Valor': summary.upToDateCustomers },
        { 'Filtro': 'Clientes Inadimplentes', 'Valor': summary.delinquentCustomers },
        { 'Filtro': 'Com Inconsistências', 'Valor': summary.customersWithInconsistencies },
        { 'Filtro': 'Encontrados na Planilha', 'Valor': customerAnalyses.filter(c => c.spreadsheetData).length },
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
      
      // Generate Excel buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const filename = `vendas-${saleStartDate}-${saleEndDate}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(buffer);
    } else {
      // Return JSON data with installment details
      res.status(200).json({
        sales,
        customers: customerAnalyses.map(analysis => ({
          ...analysis,
          installment_details: analysis.allTransactions.map(t => ({
            date: t.data_transacao,
            value: t.valor_total,
            installments: t.parcelas,
            last_installment: t.ultima_parcela,
            payment_method: t.forma,
            products: t.produto
          }))
        })),
        summary,
        filters: {
          saleStartDate,
          saleEndDate,
          installmentStartDate: installmentStartDate || null,
          installmentEndDate: installmentEndDate || null
        },
        crossmatch: {
          total_customers: customerAnalyses.length,
          found_in_spreadsheet: customerAnalyses.filter(c => c.spreadsheetData).length,
          not_found_in_spreadsheet: customerAnalyses.filter(c => !c.spreadsheetData).length
        }
      });
    }
  } catch (error: any) {
    console.error('Export Advanced Error:', error);
    
    res.status(500).json({ 
      error: error.message || 'Falha ao exportar dados avançados',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}