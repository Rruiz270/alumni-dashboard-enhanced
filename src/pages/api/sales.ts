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

    // Convert dates from YYYY-MM-DD to the format expected by Vindi API
    const formattedStartDate = startDate ? (startDate as string) : undefined;
    const formattedEndDate = endDate ? (endDate as string) : undefined;

    console.log('Fetching bills with dates:', { startDate: formattedStartDate, endDate: formattedEndDate });

    // Fetch more records (up to 500 for better data coverage)
    const bills = await client.fetchBills(
      formattedStartDate,
      formattedEndDate,
      500
    );

    const charges = await client.fetchCharges();
    const chargeMap = new Map(charges.map((c: any) => [c.bill_id, c]));

    const sales: Sale[] = [];

    for (const bill of bills) {
      try {
        // Get full customer details (bill.customer has limited data)
        const fullCustomer = await client.fetchCustomer(bill.customer.id);
        const customer = fullCustomer || bill.customer;
        const charge = chargeMap.get(bill.id) || bill.charges?.[0];
        
        if (customer) {
          const sale = client.transformToSale(bill, customer, charge);
          sales.push(sale);
        }
      } catch (error) {
        console.error(`Error processing bill ${bill.id}:`, error);
        // Use basic customer data if full fetch fails
        const customer = bill.customer;
        const charge = chargeMap.get(bill.id) || bill.charges?.[0];
        if (customer) {
          const sale = client.transformToSale(bill, customer, charge);
          sales.push(sale);
        }
      }
    }
    
    console.log(`Processed ${bills.length} bills into ${sales.length} sales`);

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