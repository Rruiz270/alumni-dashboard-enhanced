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

function formatCPFCNPJ(cpfCnpj) {
  const normalized = normalizeDocument(cpfCnpj);
  if (normalized.length === 11) {
    return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (normalized.length === 14) {
    return normalized.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cpfCnpj;
}

function getCustomerType(cpfCnpj) {
  const normalized = normalizeDocument(cpfCnpj);
  return normalized.length === 11 ? 'B2C' : normalized.length === 14 ? 'B2B' : 'INVALID';
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
  try {
    const response = await axios.get(`${process.env.VINDI_API_URL}/customers`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
      },
      params: { per_page: 100 }
    });

    return response.data.customers || [];
  } catch (error) {
    console.error('VINDI API Error:', error.response?.data || error.message);
    return [];
  }
}

async function getVindiCustomerBills(customerId) {
  try {
    const response = await axios.get(`${process.env.VINDI_API_URL}/bills`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
      },
      params: { customer_id: customerId, per_page: 50 }
    });

    return response.data.bills || [];
  } catch (error) {
    console.error('VINDI Bills API Error:', error.response?.data || error.message);
    return [];
  }
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
        serviceAmount: parseAmount(obj.valor_servico || obj['Valor Serviço'] || 0),
        productAmount: parseAmount(obj.valor_produto || obj['Valor Produto'] || 0),
      };
    }).filter(customer => customer.cpfCnpj);

    // Process VINDI customers
    const vindiMap = new Map();
    for (const customer of vindiCustomers) {
      const cpfCnpj = normalizeDocument(customer.registry_code || '');
      if (cpfCnpj) {
        // Get bills for this customer
        const bills = await getVindiCustomerBills(customer.id);
        const totalPaid = bills
          .filter(bill => bill.status === 'paid')
          .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

        vindiMap.set(cpfCnpj, {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: customer.status,
          totalPaid,
          bills
        });
      }
    }

    // Match data
    const matchedCustomers = processedSheets.map(sheetCustomer => {
      const vindiData = vindiMap.get(sheetCustomer.cpfCnpj);
      const collectedAmount = vindiData?.totalPaid || 0;
      const discrepancy = sheetCustomer.expectedAmount - collectedAmount;

      return {
        cpfCnpj: sheetCustomer.cpfCnpj,
        cpfCnpjFormatted: formatCPFCNPJ(sheetCustomer.cpfCnpj),
        customerType: getCustomerType(sheetCustomer.cpfCnpj),
        sheetsData: sheetCustomer,
        vindiData: vindiData || null,
        expectedAmount: sheetCustomer.expectedAmount,
        collectedAmount,
        discrepancy,
        status: vindiData ? (vindiData.status === 'active' ? 'ACTIVE' : 'CANCELLED') : 'NO_VINDI_DATA',
        paymentStatus: collectedAmount >= sheetCustomer.expectedAmount ? 'FULLY_PAID' : 
                      collectedAmount > 0 ? 'PARTIALLY_PAID' : 'NO_PAYMENT',
        flags: discrepancy !== 0 ? ['DISCREPANCY'] : []
      };
    });

    // Apply filters
    const { status, type, paymentStatus, search, page = 1, limit = 50 } = req.query;
    let filteredCustomers = [...matchedCustomers];

    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }
    if (type) {
      filteredCustomers = filteredCustomers.filter(c => c.customerType === type);
    }
    if (paymentStatus) {
      filteredCustomers = filteredCustomers.filter(c => c.paymentStatus === paymentStatus);
    }
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c => 
        c.cpfCnpj.includes(searchTerm) ||
        c.sheetsData?.customerName?.toLowerCase().includes(searchTerm) ||
        c.vindiData?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredCustomers.length,
        pages: Math.ceil(filteredCustomers.length / limit)
      }
    });

  } catch (error) {
    console.error('Error in customers API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}