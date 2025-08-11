import { NextApiRequest, NextApiResponse } from 'next';
import { VindiClient } from '../../lib/vindi-client';
import { CustomerAnalysisService } from '../../lib/customer-analysis';

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
    const analysisService = new CustomerAnalysisService();
    const { startDate, endDate } = req.query;

    // Convert dates from YYYY-MM-DD to the format expected by Vindi API
    const formattedStartDate = startDate ? (startDate as string) : undefined;
    const formattedEndDate = endDate ? (endDate as string) : undefined;

    console.log('Fetching bills for customer analysis:', { startDate: formattedStartDate, endDate: formattedEndDate });

    // Fetch more records (up to 500 for better analysis)
    const bills = await client.fetchBills(
      formattedStartDate,
      formattedEndDate,
      500
    );

    const charges = await client.fetchCharges();
    const chargeMap = new Map(charges.map((c: any) => [c.bill_id, c]));

    const sales = [];

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

    // TODO: Fetch spreadsheet data (for now using empty array)
    const spreadsheetData: any[] = [];

    // Analyze customer payments
    const customerAnalyses = analysisService.analyzeCustomerPayments(sales, spreadsheetData);
    const summary = analysisService.generateSummary(customerAnalyses);

    res.status(200).json({ 
      customers: customerAnalyses,
      summary,
      total: customerAnalyses.length
    });
  } catch (error: any) {
    console.error('API Error:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch customer analysis';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}