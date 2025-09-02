export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test direct Google Sheets API call
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/A1:A10?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${data.error?.message || response.statusText}`);
    }

    res.json({
      success: true,
      message: 'API working correctly',
      sheetsData: data.values || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}