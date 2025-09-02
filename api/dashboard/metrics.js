export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Google Sheets data directly
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/A:Z?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const response = await fetch(sheetsUrl);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];

    // Find data rows (skip empty rows)
    const dataRows = rows.filter(row => row && row.some(cell => cell && cell.trim()));
    
    // Simple metrics based on available data
    const metrics = {
      totalCustomers: Math.max(0, dataRows.length - 1), // Subtract header row
      totalB2C: 0,
      totalB2B: 0,
      totalExpected: 0,
      fullyPaidCount: 0,
      partiallyPaidCount: 0,
      noPaymentCount: 0,
      discrepancyCount: 0,
      delinquentCount: 0,
      lastSync: new Date().toISOString(),
      dataAge: 0,
      rawDataRows: dataRows.length,
      rawHeaders: rows[0] || []
    };

    // Try to extract some basic numbers from the data
    dataRows.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'string') {
          // Look for numbers that might be customer counts or amounts
          const num = parseFloat(cell.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(num) && num > 0) {
            if (num < 10000) { // Likely a customer count
              metrics.totalCustomers = Math.max(metrics.totalCustomers, num);
            }
          }
        }
      });
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error occurred'
    });
  }
}