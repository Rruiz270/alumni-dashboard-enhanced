import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';
import { CustomerAnalysisService } from '../../lib/customer-analysis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate, sheetId, gid } = req.query;

  // Require date filters
  if (!startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Datas de início e fim são obrigatórias' 
    });
  }

  if (!sheetId) {
    return res.status(400).json({ 
      error: 'ID da planilha do Google Sheets é obrigatório' 
    });
  }

  try {
    console.log('Starting data comparison:', { startDate, endDate, sheetId, gid });

    // Fetch Vindi data
    const client = new VindiClient();
    const bills = await client.fetchBills(
      startDate as string,
      endDate as string,
      200
    );

    const vindiSales = [];
    for (const bill of bills) {
      const customer = bill.customer;
      const charge = bill.charges?.[0];
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        vindiSales.push(sale);
      }
    }

    // Fetch Google Sheets data
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`;
    const sheetsResponse = await fetch(csvUrl);
    
    if (!sheetsResponse.ok) {
      throw new Error('Falha ao acessar Google Sheets. Verifique se a planilha está pública.');
    }
    
    const csvData = await sheetsResponse.text();
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const sheetsData = [];
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

    // Analyze differences
    const analysisService = new CustomerAnalysisService();
    const vindiAnalysis = analysisService.analyzeCustomerPayments(vindiSales, sheetsData);
    const summary = analysisService.generateSummary(vindiAnalysis);

    // Find customers in Vindi but not in Sheets
    const vindiCustomers = new Set(vindiSales.map(s => s.cpf_cnpj || s.nome));
    const sheetsCustomers = new Set(sheetsData.map(s => s['cpf/cnpj'] || s.nome || s['CPF/CNPJ'] || s.Nome));
    
    const onlyInVindi = Array.from(vindiCustomers).filter(c => !sheetsCustomers.has(c));
    const onlyInSheets = Array.from(sheetsCustomers).filter(c => c && !vindiCustomers.has(c));

    // Calculate totals
    const vindiTotal = vindiSales.reduce((sum, sale) => sum + sale.valor_total, 0);
    const sheetsTotal = sheetsData.reduce((sum, row) => {
      const value = parseFloat(row.valor_total || row['Valor Total'] || '0');
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    res.status(200).json({
      comparison: {
        period: { startDate, endDate },
        vindi: {
          totalSales: vindiSales.length,
          totalValue: vindiTotal,
          uniqueCustomers: vindiCustomers.size
        },
        sheets: {
          totalRecords: sheetsData.length,
          totalValue: sheetsTotal,
          uniqueCustomers: sheetsCustomers.size
        },
        differences: {
          valueDifference: vindiTotal - sheetsTotal,
          recordsDifference: vindiSales.length - sheetsData.length,
          onlyInVindi: onlyInVindi.length,
          onlyInSheets: onlyInSheets.length
        }
      },
      details: {
        vindiSales,
        sheetsData,
        customerAnalysis: vindiAnalysis,
        summary,
        onlyInVindi,
        onlyInSheets
      },
      inconsistencies: vindiAnalysis.filter(c => c.hasInconsistencies)
    });

  } catch (error: any) {
    console.error('Comparison Error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições atingido. Tente com um período menor.',
        retryAfter: '5 minutes'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Falha na comparação de dados',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}