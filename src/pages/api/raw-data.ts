import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Datas obrigatórias' 
    });
  }

  try {
    console.log('=== BUSCANDO DADOS BRUTOS ===');
    
    const client = new VindiClient();
    const bills = await client.fetchBills(
      startDate as string,
      endDate as string,
      5 // Apenas 5 registros para análise
    );

    console.log(`Encontradas ${bills.length} faturas`);

    const rawData = [];

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const customer = bill.customer;
      const charge = bill.charges?.[0];
      
      console.log(`\n=== FATURA ${i + 1} ===`);
      console.log('Bill ID:', bill.id);
      console.log('Customer dados:', JSON.stringify(customer, null, 2));
      
      // Teste manual do transformToSale
      const sale = client.transformToSale(bill, customer, charge);
      
      console.log('Sale resultado:', {
        nome: sale.nome,
        cpf_cnpj: sale.cpf_cnpj,
        documento: sale.documento
      });

      rawData.push({
        bill_id: bill.id,
        raw_customer: customer,
        raw_bill_keys: Object.keys(bill),
        customer_keys: customer ? Object.keys(customer) : null,
        processed_sale: {
          nome: sale.nome,
          cpf_cnpj: sale.cpf_cnpj,
          documento: sale.documento,
          cliente: sale.cliente
        },
        // Busca manual de CPF em todos os campos
        cpf_search_results: {
          'customer.registry_code': customer?.registry_code,
          'customer.document': customer?.document,
          'customer.cpf': customer?.cpf,
          'customer.cnpj': customer?.cnpj,
          'customer.tax_id': customer?.tax_id,
          'customer.code': customer?.code,
          'customer.name': customer?.name,
          'customer.email': customer?.email,
          'customer.metadata': customer?.metadata,
          'bill.customer': bill.customer,
          'bill.code': bill.code,
          'charge.payment_profile': charge?.payment_profile
        }
      });
    }

    res.status(200).json({
      total_bills: bills.length,
      raw_data: rawData,
      message: 'Dados brutos para análise de CPF/CNPJ'
    });

  } catch (error: any) {
    console.error('Raw Data Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}