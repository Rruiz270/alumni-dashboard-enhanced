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

    console.log('Fetching bills for simple customer analysis:', { startDate, endDate });

    // Fetch only one page to avoid rate limiting
    const bills = await client.fetchBills(
      startDate as string,
      endDate as string,
      50 // Reduced limit
    );

    console.log(`Fetched ${bills.length} bills`);

    const sales = [];

    // Use only data already available in bills
    for (const bill of bills) {
      const customer = bill.customer;
      const charge = bill.charges?.[0]; // Use charge from bill
      
      if (customer) {
        const sale = client.transformToSale(bill, customer, charge);
        sales.push(sale);
      }
    }

    console.log(`Processed ${sales.length} sales`);

    // Analyze customer payments (without spreadsheet data for now)
    const customerAnalyses = analysisService.analyzeCustomerPayments(sales, []);
    const summary = analysisService.generateSummary(customerAnalyses);

    res.status(200).json({ 
      customers: customerAnalyses,
      summary,
      total: customerAnalyses.length,
      message: 'Dados limitados para evitar limite de requisições'
    });
  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições atingido. Tente novamente em alguns minutos.',
        retryAfter: '5 minutes'
      });
    }
    
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