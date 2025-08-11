import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';
import { Sale } from '../../types/sale';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new VindiClient();
    const { startDate, endDate } = req.query;

    const bills = await client.fetchBills(
      startDate as string,
      endDate as string
    );

    const charges = await client.fetchCharges();
    const chargeMap = new Map(charges.map((c: any) => [c.bill_id, c]));

    const sales: Sale[] = [];

    for (const bill of bills) {
      const customer = await client.fetchCustomer(bill.customer_id);
      const charge = chargeMap.get(bill.id);
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        sales.push(sale);
      }
    }

    res.status(200).json({ sales, total: sales.length });
  } catch (error: any) {
    console.error('API Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch sales data';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}