import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';
import { Sale } from '../../types/sale';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
}