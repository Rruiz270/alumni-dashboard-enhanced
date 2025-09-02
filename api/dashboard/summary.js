export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return dummy data for now to test if API is working
  res.json({
    success: true,
    data: {
      customerTypes: { B2C: 0, B2B: 0 },
      statuses: { ACTIVE: 0, CANCELLED: 0, INACTIVE: 0, NO_VINDI_DATA: 0 },
      paymentStatuses: { FULLY_PAID: 0, PARTIALLY_PAID: 0, NO_PAYMENT: 0 },
      flags: { DISCREPANCY: 0, '100_SERVICE': 0 },
      financial: {
        totalExpected: 0,
        totalCollected: 0,
        totalDiscrepancy: 0,
        largestDiscrepancy: 0,
        averageDiscrepancy: 0
      }
    }
  });
}