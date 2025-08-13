import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== DEBUG CPF/CNPJ COMPLETO ===');
    
    const client = new VindiClient();
    
    // Busca apenas 1 fatura para análise profunda e evitar rate limit
    const bills = await client.fetchBills('2024-01-01', '2025-08-11', 1);
    
    const debugData: any[] = [];
    
    for (const bill of bills) {
      console.log('\n==========================================');
      console.log('ANALISANDO BILL ID:', bill.id);
      console.log('==========================================');
      
      // Análise completa da estrutura
      const analysis: any = {
        bill_id: bill.id,
        customer_name: bill.customer?.name,
        
        // Busca em TODOS os campos possíveis
        cpf_cnpj_locations: {
          // Customer fields
          'customer.registry_code': bill.customer?.registry_code,
          'customer.document': bill.customer?.document,
          'customer.cpf': bill.customer?.cpf,
          'customer.cnpj': bill.customer?.cnpj,
          'customer.cpf_cnpj': bill.customer?.cpf_cnpj,
          'customer.tax_id': bill.customer?.tax_id,
          'customer.code': bill.customer?.code,
          
          // Customer metadata
          'customer.metadata': bill.customer?.metadata,
          
          // Bill fields
          'bill.registry_code': bill.registry_code,
          'bill.document': bill.document,
          'bill.code': bill.code,
          
          // Payment profile
          'bill.payment_profile': bill.payment_profile,
          
          // Charges
          'bill.charges[0]': bill.charges?.[0],
          'bill.charges[0].payment_profile': bill.charges?.[0]?.payment_profile,
          
          // Subscription
          'bill.subscription': bill.subscription,
          'bill.subscription.customer': bill.subscription?.customer,
          
          // Bill items
          'bill.bill_items': bill.bill_items?.map((item: any) => ({
            description: item.description,
            metadata: item.metadata
          })),
          
          // Payment method
          'bill.payment_method': bill.payment_method,
          
          // All top level keys
          'bill_all_keys': Object.keys(bill),
          'customer_all_keys': bill.customer ? Object.keys(bill.customer) : null
        },
        
        // Full objects for deep inspection
        full_customer: bill.customer,
        full_bill: bill
      };
      
      debugData.push(analysis);
      
      // Log cada localização
      Object.entries(analysis.cpf_cnpj_locations).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          console.log(`${key}:`, JSON.stringify(value, null, 2));
        } else if (value) {
          console.log(`${key}: "${value}"`);
        }
      });
    }
    
    res.status(200).json({
      message: 'Análise completa de CPF/CNPJ',
      total_bills_analyzed: debugData.length,
      debug_data: debugData,
      
      summary: debugData.map(d => ({
        customer: d.customer_name,
        found_cpf_in: Object.entries(d.cpf_cnpj_locations)
          .filter(([k, v]) => v && typeof v === 'string' && v.match(/^\d{11,14}$/))
          .map(([k, v]) => `${k}: ${v}`)
      }))
    });
    
  } catch (error: any) {
    console.error('Debug CPF Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}