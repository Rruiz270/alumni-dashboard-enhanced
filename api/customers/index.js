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
    // Try different sheet names that might contain customer data
    const possibleSheets = [
      'Planilha1', 'Sheet1', 'Dados', 'Customers', 'Vendas', 'Data', 
      'Clientes', 'Alunos', 'Students', 'Dashboard'
    ];
    
    let customerData = [];
    let foundSheet = null;

    for (const sheetName of possibleSheets) {
      try {
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
        const response = await fetch(sheetsUrl);
        
        if (response.ok) {
          const data = await response.json();
          const rows = data.values || [];
          
          if (rows.length > 10) { // Must have substantial data
            const headers = rows[0] || [];
            const dataRows = rows.slice(1).filter(row => row && row.some(cell => cell && cell.toString().trim()));
            
            // Look for sheets with customer data patterns
            const hasCustomerData = headers.some(header => {
              if (!header) return false;
              const h = header.toString().toLowerCase();
              return h.includes('cpf') || h.includes('cnpj') || h.includes('documento') || 
                     h.includes('nome') || h.includes('email') || h.includes('cliente');
            });
            
            if (hasCustomerData && dataRows.length > 50) { // Must have reasonable amount of customer data
              foundSheet = sheetName;
              
              // Map the data more carefully
              customerData = dataRows.map((row, index) => {
                const customer = {};
                headers.forEach((header, colIndex) => {
                  if (header && row[colIndex] !== undefined) {
                    customer[header.toString()] = row[colIndex]?.toString() || '';
                  }
                });
                
                // Try multiple possible field names for CPF/CNPJ - based on actual sheet structure
                const cpfCnpjValue = customer['cpf/cnpj'] || customer['Documento'] || customer['CPF/CNPJ'] || 
                                   customer['CPF'] || customer['CNPJ'] || customer['documento'] || 
                                   customer['Doc'] || customer['Registry Code'] || customer['registry_code'] || '';
                
                // Try multiple possible field names for name - based on actual sheet structure  
                const nameValue = customer['Nome'] || customer['Cliente'] || customer['Name'] || 
                                 customer['Customer'] || customer['nome'] || customer['name'] || '';
                
                // Try multiple possible field names for amount - based on actual sheet structure
                const amountValue = customer['valor_total'] || customer['Valor Total'] || customer['Valor'] || 
                                   customer['Amount'] || customer['Total'] || customer['valor'] || customer['amount'] || '0';

                // Parse amount - handle Brazilian currency format
                let expectedAmount = 0;
                if (amountValue) {
                  const cleanAmount = amountValue.toString()
                    .replace(/[R$\s]/g, '')  // Remove R$ and spaces
                    .replace(/\./g, '')       // Remove thousands separators
                    .replace(',', '.');       // Convert decimal comma to dot
                  expectedAmount = parseFloat(cleanAmount) || 0;
                }
                
                // Normalize CPF/CNPJ
                const normalizedCpfCnpj = cpfCnpjValue.replace(/\D/g, '');
                
                return {
                  cpfCnpj: normalizedCpfCnpj,
                  cpfCnpjFormatted: formatCpfCnpj(normalizedCpfCnpj),
                  customerName: nameValue,
                  expectedAmount: expectedAmount,
                  customerType: normalizedCpfCnpj.length === 11 ? 'B2C' : normalizedCpfCnpj.length === 14 ? 'B2B' : 'UNKNOWN',
                  status: 'NO_VINDI_DATA',
                  paymentStatus: 'UNKNOWN',
                  collectedAmount: 0,
                  discrepancy: expectedAmount,
                  servicePaymentPercentage: 0,
                  flags: expectedAmount > 0 ? ['DISCREPANCY'] : [],
                  rawData: customer // Include raw data for debugging
                };
              }).filter(c => c.cpfCnpj && c.cpfCnpj.length >= 11); // Only valid CPF/CNPJ
              
              break; // Found customer data, stop looking
            }
          }
        }
      } catch (error) {
        console.log(`Error checking sheet ${sheetName}:`, error.message);
      }
    }

    // Apply filters
    const { status, type, paymentStatus, search, page = 1, limit = 50 } = req.query;
    let filteredCustomers = [...customerData];

    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c => 
        c.cpfCnpj.includes(searchTerm) ||
        c.cpfCnpjFormatted.toLowerCase().includes(searchTerm) ||
        c.customerName.toLowerCase().includes(searchTerm)
      );
    }

    if (status) {
      filteredCustomers = filteredCustomers.filter(c => c.status === status);
    }
    if (type) {
      filteredCustomers = filteredCustomers.filter(c => c.customerType === type);
    }
    if (paymentStatus) {
      filteredCustomers = filteredCustomers.filter(c => c.paymentStatus === paymentStatus);
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
      },
      debug: {
        foundSheet,
        totalRawCustomers: customerData.length,
        sampleHeaders: customerData[0] ? Object.keys(customerData[0].rawData) : []
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

function formatCpfCnpj(cpfCnpj) {
  if (!cpfCnpj) return '';
  const normalized = cpfCnpj.replace(/\D/g, '');
  
  if (normalized.length === 11) {
    return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (normalized.length === 14) {
    return normalized.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cpfCnpj;
}