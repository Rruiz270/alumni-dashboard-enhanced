const { google } = require('googleapis');
const axios = require('axios');

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

async function getVindiCustomers() {
  const response = await axios.get(`${process.env.VINDI_API_URL}/customers`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
    },
    params: { per_page: 100 }
  });

  return response.data.customers || [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get data from both sources
    const [sheetsData, vindiCustomers] = await Promise.all([
      getGoogleSheetsData(),
      getVindiCustomers()
    ]);

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

    // Basic metrics
    const metrics = {
      totalCustomers: processedSheets.length,
      totalB2C: processedSheets.filter(c => normalizeDocument(c.cpfCnpj).length === 11).length,
      totalB2B: processedSheets.filter(c => normalizeDocument(c.cpfCnpj).length === 14).length,
      totalExpected: processedSheets.reduce((sum, c) => sum + c.expectedAmount, 0),
      vindiCustomersCount: vindiCustomers.length,
      lastSync: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}