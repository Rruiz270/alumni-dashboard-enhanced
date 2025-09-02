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
    // Get all sheets to find the customer data
    const sheetNames = ['Sheet1', 'Sheet2', 'Dados', 'Customers', 'Vendas', 'Data'];
    let customerData = [];
    
    for (const sheetName of sheetNames) {
      try {
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${sheetName}!A:Z?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
        const response = await fetch(sheetsUrl);
        
        if (response.ok) {
          const data = await response.json();
          const rows = data.values || [];
          
          if (rows.length > 1) {
            const headers = rows[0];
            const dataRows = rows.slice(1);
            
            // Check if this looks like customer data (has CPF/CNPJ columns)
            const hasCpfCnpj = headers.some(header => 
              header && header.toLowerCase().includes('cpf') || 
              header.toLowerCase().includes('cnpj') ||
              header.toLowerCase().includes('documento')
            );
            
            if (hasCpfCnpj) {
              // Process this sheet as customer data
              customerData = dataRows.map(row => {
                const customer = {};
                headers.forEach((header, index) => {
                  customer[header] = row[index] || '';
                });
                
                // Try to find CPF/CNPJ field
                const cpfCnpjField = Object.keys(customer).find(key => 
                  key.toLowerCase().includes('cpf') || 
                  key.toLowerCase().includes('cnpj') ||
                  key.toLowerCase().includes('documento')
                );
                
                const nameField = Object.keys(customer).find(key =>
                  key.toLowerCase().includes('nome') ||
                  key.toLowerCase().includes('name')
                );
                
                const amountField = Object.keys(customer).find(key =>
                  key.toLowerCase().includes('valor') ||
                  key.toLowerCase().includes('amount') ||
                  key.toLowerCase().includes('total')
                );
                
                return {
                  cpfCnpj: customer[cpfCnpjField] || '',
                  cpfCnpjFormatted: customer[cpfCnpjField] || '',
                  customerName: customer[nameField] || '',
                  expectedAmount: parseFloat((customer[amountField] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                  customerType: 'B2C', // Will determine this later
                  status: 'NO_VINDI_DATA',
                  paymentStatus: 'UNKNOWN',
                  collectedAmount: 0,
                  discrepancy: 0,
                  servicePaymentPercentage: 0,
                  flags: []
                };
              }).filter(c => c.cpfCnpj);
              
              break; // Found customer data, stop looking
            }
          }
        }
      } catch (error) {
        console.log(`Sheet ${sheetName} not found or error:`, error.message);
      }
    }

    // Apply filters from query params
    const { status, type, paymentStatus, search, page = 1, limit = 50 } = req.query;
    let filteredCustomers = [...customerData];

    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }
    if (type) {
      filteredCustomers = filteredCustomers.filter(c => c.customerType === type);
    }
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c => 
        c.cpfCnpj.toLowerCase().includes(searchTerm) ||
        c.customerName.toLowerCase().includes(searchTerm)
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