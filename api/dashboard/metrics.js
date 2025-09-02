const { google } = require('googleapis');

// Helper functions
function normalizeDocument(doc) {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

async function getGoogleSheetsData() {
  const sheets = google.sheets({ 
    version: 'v4', 
    auth: process.env.GOOGLE_SHEETS_API_KEY 
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'A:Z',
  });

  return response.data.values || [];
}

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
    // Only get Google Sheets data for now
    const sheetsData = await getGoogleSheetsData();

    // Process sheets data
    const headers = sheetsData[0] || [];
    const rows = sheetsData.slice(1);
    
    const processedSheets = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return {
        cpfCnpj: normalizeDocument(obj.cpf_cnpj || obj.CPF_CNPJ || obj['CPF/CNPJ'] || ''),
        customerName: obj.nome || obj.Nome || obj.name || obj.Name || '',
        expectedAmount: parseAmount(obj.valor || obj.Valor || obj.amount || obj.Amount || 0),
      };
    }).filter(customer => customer.cpfCnpj);

    // Basic metrics from Google Sheets only
    const metrics = {
      totalCustomers: processedSheets.length,
      totalB2C: processedSheets.filter(c => normalizeDocument(c.cpfCnpj).length === 11).length,
      totalB2B: processedSheets.filter(c => normalizeDocument(c.cpfCnpj).length === 14).length,
      totalExpected: processedSheets.reduce((sum, c) => sum + c.expectedAmount, 0),
      fullyPaidCount: 0,
      partiallyPaidCount: 0,
      noPaymentCount: processedSheets.length,
      discrepancyCount: 0,
      delinquentCount: 0,
      lastSync: new Date().toISOString(),
      dataAge: 0
    };

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