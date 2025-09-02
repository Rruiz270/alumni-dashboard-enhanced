export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables
    const envCheck = {
      hasGoogleApiKey: !!process.env.GOOGLE_SHEETS_API_KEY,
      hasGoogleSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasVindiApiKey: !!process.env.VINDI_API_KEY,
      hasVindiApiUrl: !!process.env.VINDI_API_URL,
      googleSheetIdLength: process.env.GOOGLE_SHEET_ID?.length || 0,
      vindiApiUrl: process.env.VINDI_API_URL
    };

    // Test Google Sheets API access
    let sheetsTest = { status: 'not_tested', error: null };
    if (envCheck.hasGoogleApiKey && envCheck.hasGoogleSheetId) {
      try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/A1:A1?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
        const response = await fetch(testUrl);
        
        if (response.ok) {
          sheetsTest.status = 'success';
        } else {
          sheetsTest.status = 'error';
          sheetsTest.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        sheetsTest.status = 'error';
        sheetsTest.error = error.message;
      }
    }

    // Test VINDI API access
    let vindiTest = { status: 'not_tested', error: null };
    if (envCheck.hasVindiApiKey && envCheck.hasVindiApiUrl) {
      try {
        const response = await fetch(`${process.env.VINDI_API_URL}/customers?per_page=1`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
          }
        });
        
        if (response.ok) {
          vindiTest.status = 'success';
        } else {
          vindiTest.status = 'error';
          vindiTest.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        vindiTest.status = 'error';
        vindiTest.error = error.message;
      }
    }

    res.json({
      success: true,
      data: {
        environment: envCheck,
        googleSheets: sheetsTest,
        vindi: vindiTest,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}