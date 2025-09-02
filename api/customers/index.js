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
              const sheetsCustomers = dataRows.map((row, index) => {
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
                  rawData: customer // Include raw data for debugging
                };
              }).filter(c => c.cpfCnpj && c.cpfCnpj.length >= 11); // Only valid CPF/CNPJ

              // Check if we should include VINDI data
              const includeVindi = req.query.includeVindi === 'true';
              
              if (includeVindi && process.env.VINDI_API_KEY) {
                // Fetch VINDI data for visible customers only
                customerData = [];
                const customersToProcess = sheetsCustomers.slice(0, 20); // Limit for performance
                
                for (const customer of customersToProcess) {
                  try {
                    // Search for customer in VINDI
                    const searchUrl = `https://app.vindi.com.br/api/v1/customers?query=registry_code:${customer.cpfCnpj}&per_page=1`;
                    const searchResponse = await fetch(searchUrl, {
                      headers: {
                        'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    let status = 'NO_VINDI_DATA';
                    let paymentStatus = 'UNKNOWN';
                    let collectedAmount = 0;
                    let vindiData = null;
                    
                    if (searchResponse.ok) {
                      const searchData = await searchResponse.json();
                      
                      if (searchData.customers && searchData.customers.length > 0) {
                        vindiData = searchData.customers[0];
                        status = vindiData.status === 'active' ? 'ACTIVE' : 
                                vindiData.status === 'inactive' ? 'INACTIVE' : 
                                vindiData.status === 'archived' ? 'CANCELLED' : 'UNKNOWN';
                        
                        // Get customer bills to calculate payment
                        try {
                          const billsUrl = `https://app.vindi.com.br/api/v1/bills?customer_id=${vindiData.id}&per_page=100`;
                          const billsResponse = await fetch(billsUrl, {
                            headers: {
                              'Authorization': `Basic ${Buffer.from(process.env.VINDI_API_KEY + ':').toString('base64')}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          if (billsResponse.ok) {
                            const billsData = await billsResponse.json();
                            const paidBills = billsData.bills?.filter(bill => bill.status === 'paid') || [];
                            collectedAmount = paidBills.reduce((sum, bill) => {
                              const amount = parseFloat(bill.amount) || 0;
                              return sum + amount;
                            }, 0) / 100; // Convert cents to reais
                            
                            paymentStatus = collectedAmount >= customer.expectedAmount * 0.98 ? 'FULLY_PAID' :
                                          collectedAmount > 0 ? 'PARTIALLY_PAID' : 'NO_PAYMENT';
                          }
                        } catch (billError) {
                          console.log(`Error fetching bills for ${customer.cpfCnpj}:`, billError.message);
                        }
                      } else {
                        status = 'NOT_IN_VINDI';
                      }
                    }
                    
                    const discrepancy = parseFloat((customer.expectedAmount - collectedAmount).toFixed(2));
                    const servicePaymentPercentage = customer.expectedAmount > 0 ? 
                      parseFloat(((collectedAmount / customer.expectedAmount) * 100).toFixed(2)) : 0;
                    
                    const flags = [];
                    if (Math.abs(discrepancy) > 10) flags.push('DISCREPANCY');
                    if (servicePaymentPercentage >= 99 && servicePaymentPercentage <= 101) flags.push('100_SERVICE');
                    if (collectedAmount > customer.expectedAmount * 1.02) flags.push('OVERPAYMENT');
                    
                    customerData.push({
                      ...customer,
                      status,
                      paymentStatus,
                      collectedAmount,
                      discrepancy,
                      servicePaymentPercentage,
                      flags,
                      vindiData
                    });
                    
                  } catch (error) {
                    console.log(`Error fetching VINDI data for ${customer.cpfCnpj}:`, error.message);
                    customerData.push({
                      ...customer,
                      status: 'ERROR',
                      paymentStatus: 'UNKNOWN',
                      collectedAmount: 0,
                      discrepancy: customer.expectedAmount,
                      servicePaymentPercentage: 0,
                      flags: ['ERROR'],
                      vindiData: null
                    });
                  }
                }
              } else {
                // Return without VINDI data for fast loading
                customerData = sheetsCustomers.map(customer => ({
                  ...customer,
                  status: 'NO_VINDI_DATA',
                  paymentStatus: 'UNKNOWN',
                  collectedAmount: 0,
                  discrepancy: customer.expectedAmount,
                  servicePaymentPercentage: 0,
                  flags: customer.expectedAmount > 0 ? ['DISCREPANCY'] : [],
                  vindiData: null
                }));
              }
              
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