export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { cpfCnpj } = req.query;

  // Return dummy customer details for now
  res.json({
    success: true,
    data: {
      cpfCnpj: cpfCnpj,
      cpfCnpjFormatted: cpfCnpj,
      customerType: 'B2C',
      sheetsData: {
        customerName: 'Test Customer',
        expectedAmount: 1000
      },
      vindiData: null,
      expectedAmount: 1000,
      collectedAmount: 0,
      discrepancy: 1000,
      status: 'NO_VINDI_DATA',
      paymentStatus: 'NO_PAYMENT',
      flags: ['DISCREPANCY']
    }
  });
}