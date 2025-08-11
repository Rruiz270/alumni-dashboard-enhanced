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

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Datas obrigatórias' 
    });
  }

  try {
    console.log('=== DEBUG CROSSMATCH ===');
    
    // Fetch Vindi data
    const client = new VindiClient();
    const bills = await client.fetchBills(
      startDate as string,
      endDate as string,
      20 // Pequena amostra para debug
    );

    const vindiSales = [];
    console.log(`Processando ${bills.length} faturas...`);

    for (const bill of bills) {
      const customer = bill.customer;
      const charge = bill.charges?.[0];
      
      // Log estrutura completa da primeira bill
      if (vindiSales.length === 0) {
        console.log('Estrutura completa da primeira bill:', {
          bill_id: bill.id,
          bill_keys: Object.keys(bill),
          customer_keys: customer ? Object.keys(customer) : null,
          charge_keys: charge ? Object.keys(charge) : null,
          bill_customer: bill.customer,
          full_bill_sample: bill
        });
      }
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        vindiSales.push(sale);
        
        // Log dos primeiros 3 para debug
        if (vindiSales.length <= 3) {
          console.log(`Venda ${vindiSales.length}:`, {
            nome: sale.nome,
            customer_full: customer,
            cpf_cnpj_original: customer.registry_code,
            cpf_cnpj_processado: sale.cpf_cnpj,
            cpf_normalizado: (sale.cpf_cnpj || '').replace(/[.\-\/\s]/g, ''),
            // Outros campos possíveis onde pode estar o CPF
            customer_code: customer.code,
            customer_email: customer.email,
            customer_metadata: customer.metadata
          });
        }
      }
    }

    let sheetsData = [];
    if (sheetId) {
      // Fetch Google Sheets data
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid || '0'}`;
      const sheetsResponse = await fetch(csvUrl);
      
      if (sheetsResponse.ok) {
        const csvData = await sheetsResponse.text();
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        console.log('Headers da planilha:', headers);
        
        for (let i = 1; i <= Math.min(4, lines.length - 1); i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
            const row: any = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            sheetsData.push(row);
            
            // Log primeiros registros da planilha
            if (i <= 3) {
              console.log(`Planilha linha ${i}:`, {
                nome: row.nome || row.Nome,
                cpf_cnpj_original: row['cpf/cnpj'] || row['CPF/CNPJ'] || row.cpf_cnpj,
                cpf_normalizado: (row['cpf/cnpj'] || row['CPF/CNPJ'] || row.cpf_cnpj || '').replace(/[.\-\/\s]/g, '')
              });
            }
          }
        }
      }
    }

    // Analyze crossmatch
    const analysisService = new CustomerAnalysisService();
    const customerAnalyses = analysisService.analyzeCustomerPayments(vindiSales.slice(0, 5), sheetsData);

    // Debug crossmatch results
    const debugResults = customerAnalyses.map(analysis => ({
      cpf_cnpj: analysis.cpf_cnpj,
      nome: analysis.nome,
      found_in_sheets: !!analysis.spreadsheetData,
      inconsistencies: analysis.inconsistencies,
      sheet_match: analysis.spreadsheetData ? {
        nome: analysis.spreadsheetData.nome,
        cpf_cnpj: analysis.spreadsheetData.cpf_cnpj
      } : null
    }));

    console.log('Resultados do crossmatch:', debugResults);

    res.status(200).json({
      debug: {
        vindi_sample: vindiSales.slice(0, 3).map(s => ({
          nome: s.nome,
          cpf_cnpj: s.cpf_cnpj,
          cpf_normalizado: (s.cpf_cnpj || '').replace(/[.\-\/\s]/g, '')
        })),
        sheets_sample: sheetsData.slice(0, 3).map(s => ({
          nome: s.nome || s.Nome,
          cpf_cnpj: s['cpf/cnpj'] || s['CPF/CNPJ'] || s.cpf_cnpj,
          cpf_normalizado: (s['cpf/cnpj'] || s['CPF/CNPJ'] || s.cpf_cnpj || '').replace(/[.\-\/\s]/g, '')
        })),
        crossmatch_results: debugResults,
        sheets_headers: sheetsData.length > 0 ? Object.keys(sheetsData[0]) : []
      },
      total_vindi: vindiSales.length,
      total_sheets: sheetsData.length,
      matches_found: debugResults.filter(r => r.found_in_sheets).length
    });

  } catch (error: any) {
    console.error('Debug Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}